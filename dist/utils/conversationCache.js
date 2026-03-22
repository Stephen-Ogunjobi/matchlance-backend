import { Types } from "mongoose";
import { redisClient } from "../config/redis.js";
import { Conversation } from "../models/chat.js";
const CONVERSATION_CACHE_PREFIX = "conversation:";
const USER_CONVERSATIONS_CACHE_PREFIX = "conversations:user:";
const CONVERSATION_CACHE_TTL = 3600;
export const getCachedConversation = async (conversationId) => {
    try {
        const cacheKey = `${CONVERSATION_CACHE_PREFIX}${conversationId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const conversation = await Conversation.findById(conversationId)
            .populate("participants", "firstName lastName email")
            .populate("jobId", "title")
            .populate("proposalId")
            .lean();
        if (!conversation) {
            return null;
        }
        // Convert Map to object for caching (if it's a Map)
        const unreadCount = conversation.unreadCount
            ? conversation.unreadCount instanceof Map
                ? Object.fromEntries(conversation.unreadCount)
                : conversation.unreadCount
            : {};
        const cacheData = {
            ...conversation,
            unreadCount,
        };
        // Store in cache
        await redisClient.setex(cacheKey, CONVERSATION_CACHE_TTL, JSON.stringify(cacheData));
        return cacheData;
    }
    catch (err) {
        console.error("Conversation cache error:", err);
        const conversation = await Conversation.findById(conversationId).lean();
        return conversation;
    }
};
export const getCachedUserConversations = async (userId) => {
    try {
        const cacheKey = `${USER_CONVERSATIONS_CACHE_PREFIX}${userId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const conversations = await Conversation.find({
            participants: new Types.ObjectId(userId),
        })
            .sort({ "lastMessage.timestamp": -1 })
            .populate("participants", "firstName lastName email")
            .lean();
        // Convert Map to object for caching (if it's a Map)
        const cacheData = conversations.map((conv) => {
            const unreadCount = conv.unreadCount
                ? conv.unreadCount instanceof Map
                    ? Object.fromEntries(conv.unreadCount)
                    : conv.unreadCount
                : {};
            return {
                ...conv,
                unreadCount,
            };
        });
        if (cacheData.length > 0) {
            await redisClient.setex(cacheKey, CONVERSATION_CACHE_TTL, JSON.stringify(cacheData));
        }
        return cacheData;
    }
    catch (err) {
        console.error("User conversations cache error:", err);
        const conversations = await Conversation.find({
            participants: new Types.ObjectId(userId),
        }).lean();
        const cacheData = conversations.map((conv) => {
            const unreadCount = conv.unreadCount
                ? conv.unreadCount instanceof Map
                    ? Object.fromEntries(conv.unreadCount)
                    : conv.unreadCount
                : {};
            return {
                ...conv,
                unreadCount,
            };
        });
        return cacheData;
    }
};
export const invalidateConversationCache = async (conversationId) => {
    try {
        const cacheKey = `${CONVERSATION_CACHE_PREFIX}${conversationId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Conversation cache invalidation error:", error);
    }
};
export const invalidateUserConversationsCache = async (userId) => {
    try {
        const cacheKey = `${USER_CONVERSATIONS_CACHE_PREFIX}${userId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("User conversations cache invalidation error:", error);
    }
};
export const updateConversationCache = async (conversationId, conversationData) => {
    try {
        const cacheKey = `${CONVERSATION_CACHE_PREFIX}${conversationId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            const existingConversation = JSON.parse(cachedData);
            const updatedConversation = {
                ...existingConversation,
                ...conversationData,
            };
            await redisClient.setex(cacheKey, CONVERSATION_CACHE_TTL, JSON.stringify(updatedConversation));
        }
    }
    catch (error) {
        console.error("Conversation cache update error:", error);
    }
};
//# sourceMappingURL=conversationCache.js.map