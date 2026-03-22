import { redisClient } from "../config/redis.js";
import { FreelancerProfile } from "../models/freelancer.js";
import { Types } from "mongoose";
const FREELANCER_CACHE_PREFIX = "freelancer:";
const FREELANCER_CACHE_TTL = 3600; // 1 hour
export const getCachedFreelancerProfile = async (freelancerId) => {
    try {
        const cacheKey = `${FREELANCER_CACHE_PREFIX}${freelancerId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const profile = await FreelancerProfile.findOne({ freelancerId }).lean();
        if (!profile) {
            return null;
        }
        await redisClient.setex(cacheKey, FREELANCER_CACHE_TTL, JSON.stringify(profile));
        return profile;
    }
    catch (err) {
        console.error("Freelancer cache error:", err);
        // Fallback on cache error
        const profile = await FreelancerProfile.findOne({ freelancerId }).lean();
        return profile;
    }
};
export const invalidateFreelancerCache = async (freelancerId) => {
    try {
        const cacheKey = `${FREELANCER_CACHE_PREFIX}${freelancerId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Freelancer cache invalidation error:", error);
    }
};
export const updateFreelancerCache = async (freelancerId, profileData) => {
    try {
        const cacheKey = `${FREELANCER_CACHE_PREFIX}${freelancerId}`;
        // Get existing cached data
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            const existingProfile = JSON.parse(cachedData);
            const updatedProfile = { ...existingProfile, ...profileData };
            await redisClient.setex(cacheKey, FREELANCER_CACHE_TTL, JSON.stringify(updatedProfile));
        }
    }
    catch (error) {
        console.error("Freelancer cache update error:", error);
    }
};
export const setFreelancerCache = async (profile) => {
    try {
        const cacheKey = `${FREELANCER_CACHE_PREFIX}${profile.freelancerId}`;
        await redisClient.setex(cacheKey, FREELANCER_CACHE_TTL, JSON.stringify(profile));
    }
    catch (error) {
        console.error("Freelancer cache set error:", error);
    }
};
//# sourceMappingURL=freelancerCache.js.map