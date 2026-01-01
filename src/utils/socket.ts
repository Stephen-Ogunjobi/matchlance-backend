import type { Server as HttpServer } from "http";
import type { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Conversation, Message } from "../models/chat.js";
import mongoose from "mongoose";

dotenv.config();

//add userId to each socket connection
interface AunthenticatedSocket extends Socket {
  userId?: string;
}

//store online users with key&value: userId&SocketId
const onlineUsers = new Map<string, string>();

//creates a socket.io server and attached it to http server
export const initializeSocket = (server: HttpServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  //authentication middleware
  io.use((socket: AunthenticatedSocket, next: (err?: Error) => void) => {
    try {
      //get token from handshake auth or query
      const token = socket.handshake.auth.token || socket.handshake.query.token;

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
      ) as any;

      //attach userId to socket
      socket.userId = decoded.id || decoded.userId;

      console.log(`socket authenticated: user ${socket.userId}`);
      next();
    } catch (err) {
      console.log("socket auth failed:", err);
      next(new Error("Authentication error"));
    }
  });

  //connection event//
  io.on("connection", (socket: AunthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`user connected: ${userId} (socket: ${socket.id})`);

    //add user to online users map
    onlineUsers.set(userId, socket.id);

    //join user to their personal room
    socket.join(`user:${userId}`);

    //online notification
    io.emit("user_online", { userId });

    //join conversation room//
    socket.on("join_conversation", async (conversationId: string) => {
      try {
        const conversation = await Conversation.findOne({
          _id: new mongoose.Types.ObjectId(conversationId),
          participants: new mongoose.Types.ObjectId(userId),
        });

        if (!conversation) {
          socket.emit("error", {
            message: "Access denied to this conversation",
          });
          return;
        }

        //join conversation room
        socket.join(`conversation:${conversationId}`);
        console.log(`user ${userId} joined the conversation`);

        socket.to(`conversation:${conversationId}`).emit("user_joined", {
          userId,
          conversationId,
        });
      } catch (error) {
        console.error("Error joining conversation:", error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    //leave conversation room//
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`user ${userId} left the conversation`);

      socket.to(`conversation:${conversationId}`).emit("user_left", {
        userId,
        conversationId,
      });
    });

    //send real-time msg
    socket.on(
      "send_message",
      async (data: {
        conversationId: string;
        content: string;
        messageType?: string;
        fileUrl?: string;
        fileName?: string;
      }) => {
        try {
          const { conversationId, content, messageType, fileUrl, fileName } =
            data;

          const conversation = await Conversation.findOne({
            _id: new mongoose.Types.ObjectId(conversationId),
            participants: new mongoose.Types.ObjectId(userId),
          });

          if (!conversation) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }

          const message = await Message.create({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            senderId: new mongoose.Types.ObjectId(userId),
            content,
            messageType: messageType || "text",
            ...(fileUrl && { fileUrl }),
            ...(fileName && { fileName }),
          });

          await message.populate("senderId", "firstName lastName email");

          conversation.lastMessage = {
            content,
            senderId: new mongoose.Types.ObjectId(userId),
            timestamp: new Date(),
          };

          const otherUserId = conversation.participants
            .find((p) => p.toString() !== userId.toString())
            ?.toString();

          if (otherUserId) {
            const currentUnread =
              conversation.unreadCount.get(otherUserId) || 0;
            conversation.unreadCount.set(otherUserId, currentUnread + 1);
          }

          await conversation.save();

          //real-time emit message
          io.to(`conversation:${conversationId}`).emit("new_message", {
            message,
            conversationId,
          });

          if (otherUserId) {
            io.to(`user:${otherUserId}`).emit("conversation_update", {
              conversationId,
              lastMessage: conversation.lastMessage,
              unreadCount: conversation.unreadCount.get(otherUserId),
            });
          }

          console.log(`Message sent in conversation`);
        } catch (error) {
          console.log(error);
          socket.emit("error", { message: "failed to send message" });
        }
      }
    );

    //typing indicator//
    socket.on(
      "typing",
      (data: { conversationId: string; isTyping: boolean }) => {
        const { conversationId, isTyping } = data;

        socket.to(`conversation:${conversationId}`).emit("user_typing", {
          userId,
          conversationId,
          isTyping,
        });
      }
    );

    //mark as read
    socket.on("mark_as_read", async (conversationId: string) => {
      try {
        const conversation = await Conversation.findOne({
          _id: new mongoose.Types.ObjectId(conversationId),
          participants: new mongoose.Types.ObjectId(userId),
        });

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        await Message.updateMany(
          {
            conversationId: new mongoose.Types.ObjectId(conversationId),
            senderId: { $ne: new mongoose.Types.ObjectId(userId) },
            isRead: false,
          },
          {
            $set: { isRead: true, readAt: new Date() },
          }
        );

        // Reset unread count
        conversation.unreadCount.set(userId.toString(), 0);
        await conversation.save();

        // Notify other user that their messages were read
        const otherUserId = conversation.participants
          .find((p) => p.toString() !== userId.toString())
          ?.toString();

        if (otherUserId) {
          io.to(`user:${otherUserId}`).emit("messages_read", {
            conversationId,
            readBy: userId,
          });
        }

        console.log(
          `Messages marked as read in conversation ${conversationId}`
        );
      } catch (error) {
        console.log(error);
        socket.emit("error", { message: "Couldnt mark message as read" });
      }
    });

    //disconnect//
    socket.on("disconnect", () => {
      console.log("user disconnected");

      onlineUsers.delete(userId);

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

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};
