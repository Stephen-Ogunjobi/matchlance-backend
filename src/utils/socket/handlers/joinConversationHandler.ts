import type { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import { Message } from "../../../models/chat.js";
import { socketJoinConversationLimiter } from "../../../middlewares/rateLimiter.js";
import { joinConversationSchema } from "../validation.js";
import type { AuthenticatedSocket } from "../types.js";
import { handleRateLimitError } from "../helpers.js";
import {
  getCachedConversation,
  invalidateConversationCache,
} from "../../conversationCache.js";

export const handleJoinConversation = async (
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  data: unknown
) => {
  const userId = socket.userId!;

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

    const conversation = await getCachedConversation(conversationId);

    if (!conversation) {
      socket.emit("error", {
        message: "Access denied to this conversation",
      });
      return;
    }

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

    // starts a transaction
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
};
