import type { Request, Response } from "express";
import { Conversation, Message } from "../models/chat.js";
import mongoose from "mongoose";
import {
  getCachedConversation,
  invalidateConversationCache,
  invalidateUserConversationsCache,
} from "../utils/conversationCache.js";

export const getConversationByProposal = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { proposalId } = req.params;

    if (!userId || !proposalId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated or missing proposalId",
      });
    }

    // Step 1: Find conversation ID (lightweight query)
    const conversationDoc = await Conversation.findOne({
      proposalId: new mongoose.Types.ObjectId(proposalId),
      participants: new mongoose.Types.ObjectId(userId),
    })
      .select("_id")
      .lean();

    if (!conversationDoc) {
      return res.status(404).json({
        success: false,
        message: "No chat room found for this proposal",
      });
    }

    // Step 2: Get full conversation from cache
    const conversation = await getCachedConversation(
      conversationDoc._id.toString()
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    res.status(200).json({
      conversation,
    });
  } catch (error: any) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({
      message: "Failed to fetch conversation",
    });
  }
};

export const getChats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId || !conversationId) {
      return res.status(400).json({
        message: "Missing required parameters",
      });
    }

    // Get conversation from cache
    const conversation = await getCachedConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    // Verify user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    //getting messages with pagination
    const messages = await Message.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("senderId", "firstname lastName email")
      .lean();

    //count total messages for pagination info
    const total = await Message.countDocuments({
      conversationId: new mongoose.Types.ObjectId(conversationId),
    });

    //mark unread messages as read
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

    // Get the actual conversation document to update unread count
    const conversationDoc = await Conversation.findById(conversationId);

    if (conversationDoc) {
      //reset unread count
      conversationDoc.unreadCount.set(userId.toString(), 0);
      await conversationDoc.save();

      // Invalidate caches
      await invalidateConversationCache(conversationId);
      await invalidateUserConversationsCache(userId);
    }

    res.status(200).json({
      success: true,
      messages: messages.reverse(), //chronological order to reverse to show oldest first for the frontend
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch messages",
    });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { conversationId, content, messageType, fileUrl, fileName } =
      req.body;

    if (!userId || !conversationId || !content) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const conversation = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(conversationId),
      participants: new mongoose.Types.ObjectId(userId),
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found ",
      });
    }

    const message = await Message.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      senderId: new mongoose.Types.ObjectId(userId),
      content,
      messageType: messageType || "text",
      fileUrl,
      fileName,
    });

    //get message sender info
    await message.populate("senderId", "firstName lastName email");

    //update conversation last message
    conversation.lastMessage = {
      content,
      senderId: new mongoose.Types.ObjectId(userId),
      timestamp: new Date(),
    };

    //increase unread count for the other participant
    const otherUserId = conversation.participants
      .find((participantId) => participantId.toString() !== userId.toString())
      ?.toString();

    if (otherUserId) {
      const currentUnread = conversation.unreadCount.get(otherUserId) || 0;
      conversation.unreadCount.set(otherUserId, currentUnread + 1);
    }

    await conversation.save();

    // Invalidate caches
    await invalidateConversationCache(conversationId);
    await invalidateUserConversationsCache(userId);
    if (otherUserId) {
      await invalidateUserConversationsCache(otherUserId);
    }

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};
