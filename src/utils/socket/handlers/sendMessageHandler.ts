import type { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import { Conversation, Message } from "../../../models/chat.js";
import { socketSendMessageLimiter } from "../../../middlewares/rateLimiter.js";
import { sendMessageSchema } from "../validation.js";
import type { AuthenticatedSocket } from "../types.js";
import { handleRateLimitError } from "../helpers.js";
import {
  getCachedConversation,
  invalidateConversationCache,
  invalidateUserConversationsCache,
} from "../../conversationCache.js";
import { getOnlineUserSocketId } from "../onlineUsers.js";

export const handleSendMessage = async (
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  data: unknown
) => {
  const userId = socket.userId!;

  try {
    await socketSendMessageLimiter.consume(userId);

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
      const conversationPreCheck = await getCachedConversation(conversationId);

      if (!conversationPreCheck) {
        socket.emit("error", { message: "Conversation not found" });
        return;
      }

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

      // check if recipent is online bfore transaction
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
          const currentUnread = conversation.unreadCount.get(otherUserId) || 0;
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
        conversation.participants.map((participantId: mongoose.Types.ObjectId) =>
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
};
