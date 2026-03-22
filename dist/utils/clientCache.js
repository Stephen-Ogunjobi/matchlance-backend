import { redisClient } from "../config/redis.js";
import { ClientProfile } from "../models/client.js";
import { Types } from "mongoose";
const CLIENT_CACHE_PREFIX = "client:";
const CLIENT_CACHE_TTL = 3600;
export const getCachedClientProfile = async (clientId) => {
    try {
        const cacheKey = `${CLIENT_CACHE_PREFIX}${clientId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const profile = await ClientProfile.findOne({ clientId }).lean();
        if (!profile) {
            return null;
        }
        await redisClient.setex(cacheKey, CLIENT_CACHE_TTL, JSON.stringify(profile));
        return profile;
    }
    catch (err) {
        console.error("Client cache error:", err);
        // Fallback on cache error
        const profile = await ClientProfile.findOne({ clientId }).lean();
        return profile;
    }
};
export const invalidateClientCache = async (clientId) => {
    try {
        const cacheKey = `${CLIENT_CACHE_PREFIX}${clientId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Client cache invalidation error:", error);
    }
};
export const updateClientCache = async (clientId, profileData) => {
    try {
        const cacheKey = `${CLIENT_CACHE_PREFIX}${clientId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            const existingProfile = JSON.parse(cachedData);
            const updatedProfile = { ...existingProfile, ...profileData };
            await redisClient.setex(cacheKey, CLIENT_CACHE_TTL, JSON.stringify(updatedProfile));
        }
    }
    catch (error) {
        console.error("Client cache update error:", error);
    }
};
export const setClientCache = async (profile) => {
    try {
        const cacheKey = `${CLIENT_CACHE_PREFIX}${profile.clientId}`;
        await redisClient.setex(cacheKey, CLIENT_CACHE_TTL, JSON.stringify(profile));
    }
    catch (error) {
        console.error("Client cache set error:", error);
    }
};
//# sourceMappingURL=clientCache.js.map