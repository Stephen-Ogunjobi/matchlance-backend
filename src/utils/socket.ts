import type { Server as HttpServer } from "http";
import type { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import jwt, { type JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";
import { Conversation, Message } from "../models/chat.js";
import mongoose from "mongoose";
import { z } from "zod";
import {
  socketSendMessageLimiter,
  socketTypingLimiter,
  socketMarkAsReadLimiter,
  socketJoinConversationLimiter,
} from "../middlewares/rateLimiter.js";
import { pubClient, redisClient, subClient } from "../config/redis.js";
import { createAdapter } from "@socket.io/redis-adapter";

// Zod schema for send_message validation
const sendMessageSchema = z.object({
  conversationId: z
    .string({ message: "conversationId is required" })
    .min(1, "conversationId cannot be empty")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid conversationId format",
    }),
  content: z
    .string({ message: "content is required" })
    .min(1, "Message content cannot be empty")
    .max(5000, "Message content cannot exceed 5000 characters"),
  messageType: z
    .enum(["text", "image", "file", "audio", "video"], {
      message: "Invalid message type",
    })
    .optional()
    .default("text"),
  fileUrl: z.string().url("Invalid file URL").optional(),
  fileName: z.string().max(255, "File name too long").optional(),
});

dotenv.config();

// Helper function to parse cookies from cookie string
const parseCookies = (cookieString: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;

  cookieString.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name && rest.length > 0) {
      cookies[name] = decodeURIComponent(rest.join("="));
    }
  });

  return cookies;
};

//add userId to each socket connection
interface AunthenticatedSocket extends Socket {
  userId?: string;
}

//redis key for online users
const ONLINE_USERS_KEY = "online_users";

//redis online users tracking
const addOnlineUser = async (userId: string, socketId: string) => {
  const serverId = process.env.SERVER_ID || "server-1";
  await redisClient.hset(ONLINE_USERS_KEY, userId, socketId);
};

const removeOnlineUser = async (userId: string) => {
  await redisClient.hdel(ONLINE_USERS_KEY, userId);
};

const getOnlineUserSocketId = async (
  userId: string
): Promise<string | null> => {
  return await redisClient.hget(ONLINE_USERS_KEY, userId);
};

const getAllOnlineUsers = async (): Promise<string[]> => {
  const users = await redisClient.hkeys(ONLINE_USERS_KEY);
  return users;
};

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
  io.use((socket: AunthenticatedSocket, next: (err?: Error) => void) => {
    try {
      // Get token from multiple sources (in order of priority):
      // 1. handshake.auth.token (client explicitly sends it)
      // 2. handshake.query.token (token in query string)
      // 3. cookies (cookie-based authentication)
      let token = socket.handshake.auth.token || socket.handshake.query.token;

      // If no token found in auth or query, check cookies
      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie;
        if (cookieHeader) {
          const cookies = parseCookies(cookieHeader);
          // Check common cookie names for JWT token
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
      ) as JwtPayload;

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
  io.on("connection", async (socket: AunthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`user connected: ${userId} (socket: ${socket.id})`);

    //add user to online users map
    await addOnlineUser(userId, socket.id);

    //join user to their personal room
    socket.join(`user:${userId}`);

    //online notification
    io.emit("user_online", { userId });

    //join conversation room//
    socket.on("join_conversation", async (conversationId: string) => {
      try {
        // Rate limit check
        await socketJoinConversationLimiter.consume(userId);

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

        //mark message as delivered
        const undeliveredMessages = await Message.updateMany(
          {
            conversationId: new mongoose.Types.ObjectId(conversationId),
            senderId: { $ne: new mongoose.Types.ObjectId(userId) },
            status: "sent",
          },
          {
            $set: { status: "delivered", deliveredAt: new Date() },
          }
        );

        // Notify other user about delivery
        if (undeliveredMessages.modifiedCount > 0) {
          const otherUserId = conversation.participants
            .find((p) => p.toString() !== userId.toString())
            ?.toString();

          if (otherUserId) {
            io.to(`user:${otherUserId}`).emit("messages_delivered", {
              conversationId,
              count: undeliveredMessages.modifiedCount,
            });
          }
        }
      } catch (error: any) {
        if (error?.remainingPoints !== undefined) {
          socket.emit("error", {
            message: "Rate limit exceeded. Please slow down.",
            retryAfter: Math.ceil(error.msBeforeNext / 1000),
          });
          return;
        }
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
    socket.on("send_message", async (data: unknown) => {
      try {
        // Rate limit check
        await socketSendMessageLimiter.consume(userId);

        // Validate input with Zod
        const validationResult = sendMessageSchema.safeParse(data);

        if (!validationResult.success) {
          const errors = validationResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }));
          socket.emit("error", {
            message: "Validation failed",
            errors,
          });
          return;
        }

        const { conversationId, content, messageType, fileUrl, fileName } =
          validationResult.data;

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
          status: "sent",
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
          const currentUnread = conversation.unreadCount.get(otherUserId) || 0;
          conversation.unreadCount.set(otherUserId, currentUnread + 1);
        }

        await conversation.save();

        //real-time emit message
        io.to(`conversation:${conversationId}`).emit("new_message", {
          message,
          conversationId,
        });

        //check if recipient is online and in convo room
        if (otherUserId) {
          const recipientSocketId = await getOnlineUserSocketId(otherUserId);
          const isInConversationRoom =
            recipientSocketId &&
            io.sockets.adapter.rooms.get(`conversation:${conversationId}`);

          if (isInConversationRoom) {
            message.status = "delivered";
            message.deliveredAt = new Date();
            await message.save();

            socket.emit("message_delivered", {
              messageId: message._id,
              conversationId,
              deliveredAt: message.deliveredAt,
            });
          }

          io.to(`user:${otherUserId}`).emit("conversation_update", {
            conversationId,
            lastMessage: conversation.lastMessage,
            unreadCount: conversation.unreadCount.get(otherUserId),
          });
        }

        console.log(`Message sent in conversation`);
      } catch (error: any) {
        if (error?.remainingPoints !== undefined) {
          socket.emit("error", {
            message: "Rate limit exceeded. You're sending messages too fast.",
            retryAfter: Math.ceil(error.msBeforeNext / 1000),
          });
          return;
        }
        console.log(error);
        socket.emit("error", { message: "failed to send message" });
      }
    });

    //typing indicator//
    socket.on(
      "typing",
      async (data: { conversationId: string; isTyping: boolean }) => {
        try {
          // Rate limit check
          await socketTypingLimiter.consume(userId);

          const { conversationId, isTyping } = data;

          socket.to(`conversation:${conversationId}`).emit("user_typing", {
            userId,
            conversationId,
            isTyping,
          });
        } catch (error: any) {
          if (error?.remainingPoints !== undefined) {
            // Silently ignore typing rate limits to avoid spamming errors
            return;
          }
          console.error("Typing event error:", error);
        }
      }
    );

    //mark as read
    socket.on(
      "mark_as_read",
      async (data: { conversationId: string; messageId?: string }) => {
        try {
          // Rate limit check
          await socketMarkAsReadLimiter.consume(userId);

          const { conversationId, messageId } = data;

          const conversation = await Conversation.findOne({
            _id: new mongoose.Types.ObjectId(conversationId),
            participants: new mongoose.Types.ObjectId(userId),
          });

          if (!conversation) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }

          // Build query to mark messages as read
          const query: any = {
            conversationId: new mongoose.Types.ObjectId(conversationId),
            senderId: { $ne: new mongoose.Types.ObjectId(userId) },
            isRead: false,
          };

          // If messageId provided, only mark messages up to that message
          if (messageId) {
            const targetMessage = await Message.findById(messageId);
            if (targetMessage) {
              query.createdAt = { $lte: targetMessage.createdAt };
            }
          }

          // Get the messages before updating them
          const messagesToUpdate = await Message.find(query).select("_id");

          const result = await Message.updateMany(query, {
            $set: {
              isRead: true,
              readAt: new Date(),
              status: "read",
            },
          });

          // Reset unread count
          conversation.unreadCount.set(userId.toString(), 0);
          await conversation.save();

          // Notify other user that their messages were read
          const otherUserId = conversation.participants
            .find((p) => p.toString() !== userId.toString())
            ?.toString();

          if (otherUserId && result.modifiedCount > 0) {
            io.to(`user:${otherUserId}`).emit("messages_read", {
              conversationId,
              readBy: userId,
              messageIds: messagesToUpdate.map((m) => m._id),
              readAt: new Date(),
            });
          }

          console.log(
            `Messages marked as read in conversation ${conversationId}`
          );
        } catch (error: any) {
          if (error?.remainingPoints !== undefined) {
            socket.emit("error", {
              message: "Rate limit exceeded. Please slow down.",
              retryAfter: Math.ceil(error.msBeforeNext / 1000),
            });
            return;
          }
          console.log(error);
          socket.emit("error", { message: "Couldnt mark message as read" });
        }
      }
    );

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
