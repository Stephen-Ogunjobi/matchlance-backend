import type { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import { Conversation, Message } from "../../../models/chat.js";
import { socketMarkAsReadLimiter } from "../../../middlewares/rateLimiter.js";
import { markAsReadSchema } from "../validation.js";
import type { AuthenticatedSocket } from "../types.js";
import { handleRateLimitError } from "../helpers.js";
import {
  getCachedConversation,
  invalidateConversationCache,
  invalidateUserConversationsCache,
} from "../../conversationCache.js";

export const handleMarkAsRead = async (
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  data: unknown
) => {
  const userId = socket.userId!;

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
        conversation.participants.map((participantId: mongoose.Types.ObjectId) =>
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

    console.log(`Messages marked as read in conversation ${conversationId}`);
  } catch (error) {
    if (handleRateLimitError(socket, error)) {
      return;
    }
    console.log(error);
    socket.emit("error", { message: "Couldnt mark message as read" });
  }
};
