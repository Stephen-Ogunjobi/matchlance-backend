import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Conversation, Message } from "../models/chat.js";
import mongoose, { type ClientSession } from "mongoose";
import {
  socketSendMessageLimiter,
  socketTypingLimiter,
  socketMarkAsReadLimiter,
  socketJoinConversationLimiter,
} from "../middlewares/rateLimiter.js";
import { pubClient, redisClient, subClient } from "../config/redis.js";
import { createAdapter } from "@socket.io/redis-adapter";
import {
  getCachedConversation,
  invalidateConversationCache,
  invalidateUserConversationsCache,
} from "./conversationCache.js";
import {
  sendMessageSchema,
  joinConversationSchema,
  leaveConversationSchema,
  typingSchema,
  markAsReadSchema,
} from "./socket/validation.js";
import type {
  CustomJwtPayload,
  AuthenticatedSocket,
  RateLimitError,
} from "./socket/types.js";
import { parseCookies, handleRateLimitError } from "./socket/helpers.js";

dotenv.config();

//redis key for online users
const ONLINE_USERS_KEY = "online_users";

//redis online users tracking
const addOnlineUser = async (userId: string, socketId: string) => {
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
  io.use((socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
      let token = socket.handshake.auth.token || socket.handshake.query.token;

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
    // Validate userId exists (should always be true after auth middleware)
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

    socket.on("join_conversation", async (data: unknown) => {
      try {
        await socketJoinConversationLimiter.consume(userId);

        const validationResult = joinConversationSchema.safeParse(data);

        if (!validationResult.success) {
          const errors = validationResult.error.issues.map((issue) => ({
            field: issue.path.join(".") || "conversationId",
            message: issue.message,
          }));
          socket.emit("error", {
            message: "Validation failed",
            errors,
          });
          return;
        }

        const conversationId = validationResult.data;

        // Use cache for conversation lookup
        const conversation = await getCachedConversation(conversationId);

        if (!conversation) {
          socket.emit("error", {
            message: "Access denied to this conversation",
          });
          return;
        }

        // Verify user is a participant
        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId.toString()
        );

        if (!isParticipant) {
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

        // Mark messages as delivered within a transaction
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            //mark message as delivered
            const undeliveredMessages = await Message.updateMany(
              {
                conversationId: new mongoose.Types.ObjectId(conversationId),
                senderId: { $ne: new mongoose.Types.ObjectId(userId) },
                status: "sent",
              },
              {
                $set: { status: "delivered", deliveredAt: new Date() },
              },
              { session }
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
          });

          // Invalidate conversation cache after successful transaction
          await invalidateConversationCache(conversationId);
        } finally {
          await session.endSession();
        }
      } catch (error) {
        if (handleRateLimitError(socket, error)) {
          return;
        }
        console.error("Error joining conversation:", error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    //leave conversation room//
    socket.on("leave_conversation", (data: unknown) => {
      try {
        // Validate input with Zod
        const validationResult = leaveConversationSchema.safeParse(data);

        if (!validationResult.success) {
          const errors = validationResult.error.issues.map((issue) => ({
            field: issue.path.join(".") || "conversationId",
            message: issue.message,
          }));
          socket.emit("error", {
            message: "Validation failed",
            errors,
          });
          return;
        }

        const conversationId = validationResult.data;

        socket.leave(`conversation:${conversationId}`);
        console.log(`user ${userId} left the conversation`);

        socket.to(`conversation:${conversationId}`).emit("user_left", {
          userId,
          conversationId,
        });
      } catch (error) {
        console.error("Error leaving conversation:", error);
        socket.emit("error", { message: "Failed to leave conversation" });
      }
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

        // Start a MongoDB session for transaction
        const session = await mongoose.startSession();
        let message: InstanceType<typeof Message> | undefined | null;
        let conversation: InstanceType<typeof Conversation> | undefined | null;
        let otherUserId: string | undefined;
        let shouldMarkAsDelivered = false;

        try {
          // Use cache for conversation lookup
          const conversationPreCheck = await getCachedConversation(
            conversationId
          );

          if (!conversationPreCheck) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }

          // Verify user is a participant
          const isParticipant = conversationPreCheck.participants.some(
            (p) => p.toString() === userId.toString()
          );

          if (!isParticipant) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }

          otherUserId = conversationPreCheck.participants
            .find((p) => p.toString() !== userId.toString())
            ?.toString();

          // Check if recipient is online BEFORE the transaction
          if (otherUserId) {
            const recipientSocketId = await getOnlineUserSocketId(otherUserId);
            const isInConversationRoom =
              recipientSocketId &&
              io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
            shouldMarkAsDelivered = !!isInConversationRoom;
          }

          await session.withTransaction(async () => {
            // Find and verify conversation access within transaction
            conversation = await Conversation.findOne({
              _id: new mongoose.Types.ObjectId(conversationId),
              participants: new mongoose.Types.ObjectId(userId),
            }).session(session);

            if (!conversation) {
              throw new Error("Conversation not found");
            }

            // Determine initial status based on online check
            const initialStatus = shouldMarkAsDelivered ? "delivered" : "sent";
            const deliveredAt = shouldMarkAsDelivered ? new Date() : undefined;

            // Create message within transaction
            const messages = await Message.create(
              [
                {
                  conversationId: new mongoose.Types.ObjectId(conversationId),
                  senderId: new mongoose.Types.ObjectId(userId),
                  content,
                  messageType: messageType || "text",
                  status: initialStatus,
                  ...(deliveredAt && { deliveredAt }),
                  ...(fileUrl && { fileUrl }),
                  ...(fileName && { fileName }),
                },
              ],
              { session }
            );
            message = messages[0];

            // Update conversation metadata within transaction
            conversation.lastMessage = {
              content,
              senderId: new mongoose.Types.ObjectId(userId),
              timestamp: new Date(),
            };

            if (otherUserId) {
              const currentUnread =
                conversation.unreadCount.get(otherUserId) || 0;
              conversation.unreadCount.set(otherUserId, currentUnread + 1);
            }

            await conversation.save({ session });
          });

          // Ensure message and conversation are defined after transaction
          if (!message || !conversation) {
            throw new Error(
              "Transaction failed to create message or update conversation"
            );
          }

          // Populate after transaction completes
          await message.populate("senderId", "firstName lastName email");

          // Invalidate caches after successful transaction
          await invalidateConversationCache(conversationId);
          await Promise.all(
            conversation.participants.map(
              (participantId: mongoose.Types.ObjectId) =>
                invalidateUserConversationsCache(participantId.toString())
            )
          );
        } catch (transactionError) {
          await session.endSession();
          if (
            transactionError instanceof Error &&
            transactionError.message === "Conversation not found"
          ) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }
          throw transactionError;
        }

        await session.endSession();

        //real-time emit message
        io.to(`conversation:${conversationId}`).emit("new_message", {
          message,
          conversationId,
        });

        // Notify sender if message was delivered
        if (shouldMarkAsDelivered) {
          socket.emit("message_delivered", {
            messageId: message._id,
            conversationId,
            deliveredAt: message.deliveredAt,
          });
        }

        // Send conversation update to recipient
        if (otherUserId) {
          io.to(`user:${otherUserId}`).emit("conversation_update", {
            conversationId,
            lastMessage: conversation.lastMessage,
            unreadCount: conversation.unreadCount.get(otherUserId),
          });
        }

        console.log(`Message sent in conversation`);
      } catch (error) {
        if (
          handleRateLimitError(
            socket,
            error,
            "Rate limit exceeded. You're sending messages too fast."
          )
        ) {
          return;
        }
        console.log(error);
        socket.emit("error", { message: "failed to send message" });
      }
    });

    //typing indicator//
    socket.on("typing", async (data: unknown) => {
      try {
        // Rate limit check
        await socketTypingLimiter.consume(userId);

        // Validate input with Zod
        const validationResult = typingSchema.safeParse(data);

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

        const { conversationId, isTyping } = validationResult.data;

        socket.to(`conversation:${conversationId}`).emit("user_typing", {
          userId,
          conversationId,
          isTyping,
        });
      } catch (error) {
        const rateLimitError = error as RateLimitError;
        if (rateLimitError.remainingPoints !== undefined) {
          // Silently ignore typing rate limits to avoid spamming errors
          return;
        }
        console.error("Typing event error:", error);
      }
    });

    //mark as read
    socket.on("mark_as_read", async (data: unknown) => {
      try {
        // Rate limit check
        await socketMarkAsReadLimiter.consume(userId);

        // Validate input with Zod
        const validationResult = markAsReadSchema.safeParse(data);

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

        const { conversationId, messageId } = validationResult.data;

        // Use cache for conversation lookup
        const cachedConversation = await getCachedConversation(conversationId);

        if (!cachedConversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        // Verify user is a participant
        const isParticipant = cachedConversation.participants.some(
          (p) => p.toString() === userId.toString()
        );

        if (!isParticipant) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        // We need the actual Conversation document for save() method later
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        // Build query to mark messages as read
        interface MessageQuery {
          conversationId: mongoose.Types.ObjectId;
          senderId: { $ne: mongoose.Types.ObjectId };
          isRead: boolean;
          createdAt?: { $lte: Date };
        }

        const query: MessageQuery = {
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

        // Wrap in transaction for atomicity
        const session = await mongoose.startSession();
        let messagesToUpdate: Array<{ _id: mongoose.Types.ObjectId }> = [];
        let modifiedCount = 0;

        try {
          await session.withTransaction(async () => {
            // Get the messages before updating them
            messagesToUpdate = await Message.find(query)
              .select("_id")
              .session(session);

            const result = await Message.updateMany(
              query,
              {
                $set: {
                  isRead: true,
                  readAt: new Date(),
                  status: "read",
                },
              },
              { session }
            );

            modifiedCount = result.modifiedCount;

            // Reset unread count
            conversation.unreadCount.set(userId.toString(), 0);
            await conversation.save({ session });
          });

          // Invalidate caches after successful transaction
          await invalidateConversationCache(conversationId);
          await Promise.all(
            conversation.participants.map(
              (participantId: mongoose.Types.ObjectId) =>
                invalidateUserConversationsCache(participantId.toString())
            )
          );
        } finally {
          await session.endSession();
        }

        // Notify other user that their messages were read
        const otherUserId = conversation.participants
          .find((p) => p.toString() !== userId.toString())
          ?.toString();

        if (otherUserId && modifiedCount > 0) {
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
      } catch (error) {
        if (handleRateLimitError(socket, error)) {
          return;
        }
        console.log(error);
        socket.emit("error", { message: "Couldnt mark message as read" });
      }
    });

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
