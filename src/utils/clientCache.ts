import { redisClient } from "../config/redis.js";
import { ClientProfile } from "../models/client.js";
import { Types } from "mongoose";

const CLIENT_CACHE_PREFIX = "client:";
const CLIENT_CACHE_TTL = 3600;

export interface CachedClientProfile {
  _id: Types.ObjectId;
  clientId: Types.ObjectId;
  bio?: string;
  profilePicture?: string;
  company: {
    name?: string;
    website?: string;
    size?: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
    industry?: string;
  };
  location: {
    country: string;
    city?: string;
    timezone: string;
  };
  hiringPreferences: {
    categories: string[];
    preferredExperienceLevel?: "entry" | "intermediate" | "expert";
    typicalBudget: {
      min?: number;
      max?: number;
      currency: "USD" | "NGN" | "EUR" | "GBP";
    };
  };
  rating: {
    average: number;
    count: number;
    breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  totalJobsPosted: number;
  totalHires: number;
  totalSpent: number;
  hireRate: number;
  paymentVerified: boolean;
  preferredCurrency: "USD" | "NGN" | "EUR" | "GBP";
  isVerified: boolean;
  profileCompleteness: number;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const getCachedClientProfile = async (
  clientId: string,
): Promise<CachedClientProfile | null> => {
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

    await redisClient.setex(
      cacheKey,
      CLIENT_CACHE_TTL,
      JSON.stringify(profile),
    );

    return profile as unknown as CachedClientProfile;
  } catch (err) {
    console.error("Client cache error:", err);

    // Fallback on cache error
    const profile = await ClientProfile.findOne({ clientId }).lean();
    return profile as unknown as CachedClientProfile | null;
  }
};

export const invalidateClientCache = async (
  clientId: string,
): Promise<void> => {
  try {
    const cacheKey = `${CLIENT_CACHE_PREFIX}${clientId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error("Client cache invalidation error:", error);
  }
};

export const updateClientCache = async (
  clientId: string,
  profileData: Partial<CachedClientProfile>,
): Promise<void> => {
  try {
    const cacheKey = `${CLIENT_CACHE_PREFIX}${clientId}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const existingProfile = JSON.parse(cachedData);
      const updatedProfile = { ...existingProfile, ...profileData };
      await redisClient.setex(
        cacheKey,
        CLIENT_CACHE_TTL,
        JSON.stringify(updatedProfile),
      );
    }
  } catch (error) {
    console.error("Client cache update error:", error);
  }
};

export const setClientCache = async (
  profile: CachedClientProfile,
): Promise<void> => {
  try {
    const cacheKey = `${CLIENT_CACHE_PREFIX}${profile.clientId}`;
    await redisClient.setex(
      cacheKey,
      CLIENT_CACHE_TTL,
      JSON.stringify(profile),
    );
  } catch (error) {
    console.error("Client cache set error:", error);
  }
};
