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

interface CachedUser {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  googleId?: string | null;
}

export const getCachedUser = async (
  userId: string
): Promise<CachedUser | null> => {
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

    return user as CachedUser;
  } catch (err) {
    console.log(err);

    //fallback on cache error
    const user = await User.findById(userId)
      .select(EXCLUDED_FIELDS.map((f) => `-${f}`).join(" "))
      .lean();
    return user as CachedUser | null;
  }
};

export const invalidateUserCached = async (userId: string): Promise<void> => {
  try {
    const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
};

export const updateUserCache = async (
  userId: string,
  userData: Partial<CachedUser>
): Promise<void> => {
  try {
    const cacheKey = `${USER_CACHE_PREFIX}${userId}`;

    // Get existing cached data
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const existingUser = JSON.parse(cachedData);
      const updatedUser = { ...existingUser, ...userData };
      await redisClient.setex(
        cacheKey,
        USER_CACHE_TTL,
        JSON.stringify(updatedUser)
      );
    }
  } catch (error) {
    console.error("Cache update error:", error);
  }
};
