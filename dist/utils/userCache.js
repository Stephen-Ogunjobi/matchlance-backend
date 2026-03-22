import { redisClient } from "../config/redis.js";
import User from "../models/users.js";
import { Types } from "mongoose";
const USER_CACHE_PREFIX = "user:";
const USER_CACHE_TTL = 3600;
const EXCLUDED_FIELDS = [
    "password",
    "refreshToken",
    "refreshTokenExpiration",
    "emailVerificationToken",
    "emailVerificationExpires",
    "resetPasswordToken",
    "resetPasswordExpires",
];
export const getCachedUser = async (userId) => {
    try {
        const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const user = await User.findById(userId)
            .select(EXCLUDED_FIELDS.map((f) => `-${f}`).join(" "))
            .lean();
        if (!user) {
            return null;
        }
        await redisClient.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(user));
        return user;
    }
    catch (err) {
        console.log(err);
        //fallback on cache error
        const user = await User.findById(userId)
            .select(EXCLUDED_FIELDS.map((f) => `-${f}`).join(" "))
            .lean();
        return user;
    }
};
export const invalidateUserCached = async (userId) => {
    try {
        const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Cache invalidation error:", error);
    }
};
export const updateUserCache = async (userId, userData) => {
    try {
        const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
        // Get existing cached data
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            const existingUser = JSON.parse(cachedData);
            const updatedUser = { ...existingUser, ...userData };
            await redisClient.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(updatedUser));
        }
    }
    catch (error) {
        console.error("Cache update error:", error);
    }
};
//# sourceMappingURL=userCache.js.map