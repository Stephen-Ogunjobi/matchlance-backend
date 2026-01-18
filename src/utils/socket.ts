import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pubClient, subClient } from "../config/redis.js";
import { createAdapter } from "@socket.io/redis-adapter";
import type { CustomJwtPayload, AuthenticatedSocket } from "./socket/types.js";
import { parseCookies } from "./socket/helpers.js";
import {
  addOnlineUser,
  removeOnlineUser,
  getAllOnlineUsers,
} from "./socket/onlineUsers.js";
import {
  handleJoinConversation,
  handleLeaveConversation,
  handleSendMessage,
  handleTyping,
  handleMarkAsRead,
} from "./socket/handlers/index.js";

dotenv.config();

//creates a socket.io server and attached it to http server
export const initializeSocket = (server: HttpServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  //attach redis adapter for cross server communication
  io.adapter(createAdapter(pubClient, subClient));

  //authentication middleware
  io.use((socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
      let token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie;
        if (cookieHeader) {
          const cookies = parseCookies(cookieHeader);
          token =
            cookies.token ||
            cookies.jwt ||
            cookies.auth_token ||
            cookies.accessToken;
        }
      }

      if (!token) {
        return next(new Error("authentication error: No token provided"));
      }

      if (!process.env.JWT_SECRET) {
        return next(new Error("JWT_SECRET is not configured"));
      }

      //jwt token verification
      const decoded = jwt.verify(
        token as string,
        process.env.JWT_SECRET
      ) as CustomJwtPayload;

      //attach userId to socket - normalize JWT payload structure
      const userId = decoded.id || decoded.userId;

      if (!userId) {
        return next(new Error("Invalid token: missing user ID"));
      }

      socket.userId = userId;

      console.log(`socket authenticated: user ${socket.userId}`);
      next();
    } catch (err) {
      console.log("socket auth failed:", err);
      next(new Error("Authentication error"));
    }
  });

  //connection event//
  io.on("connection", async (socket: AuthenticatedSocket) => {
    if (!socket.userId) {
      console.error("Connection without userId - this should not happen");
      socket.disconnect();
      return;
    }

    const userId = socket.userId;
    console.log(`user connected: ${userId} (socket: ${socket.id})`);

    await addOnlineUser(userId, socket.id);

    socket.join(`user:${userId}`);

    io.emit("user_online", { userId });

    socket.on("join_conversation", (data) =>
      handleJoinConversation(socket, io, data)
    );

    socket.on("leave_conversation", (data) =>
      handleLeaveConversation(socket, data)
    );

    socket.on("send_message", (data) => handleSendMessage(socket, io, data));

    socket.on("typing", (data) => handleTyping(socket, data));

    socket.on("mark_as_read", (data) => handleMarkAsRead(socket, io, data));

    //disconnect//
    socket.on("disconnect", async () => {
      console.log("user disconnected");

      await removeOnlineUser(userId);

      io.emit("user_offline", { userId });
    });

    //error handling
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  console.log("socket initialized");
  return io;
};

export const getOnlineUsers = async () => {
  return await getAllOnlineUsers();
};
