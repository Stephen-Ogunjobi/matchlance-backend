import { redisClient } from "../config/redis.js";
import { FreelancerProfile } from "../models/freelancer.js";
import { Types } from "mongoose";

const FREELANCER_CACHE_PREFIX = "freelancer:";
const FREELANCER_CACHE_TTL = 3600; // 1 hour

export interface CachedFreelancerProfile {
  _id: Types.ObjectId;
  freelancerId: Types.ObjectId;
  bio: string;
  title: string;
  profilePicture?: string;
  skills: string[];
  categories: string[];
  experienceLevel: "entry" | "intermediate" | "expert";
  hourlyRate: {
    min: number;
    max: number;
    currency: string;
  };
  availability: {
    status: "available" | "busy" | "not-available";
    hoursPerWeek: number;
    startDate?: Date;
  };
  location: {
    country: string;
    city?: string;
    timezone: string;
    coordinates?: {
      type: string;
      coordinates: [number, number];
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
  completedJobs: number;
  successRate: number;
  totalEarnings: number;
  languages: Array<{
    language: string;
    proficiency: "basic" | "conversational" | "fluent" | "native";
  }>;
  isVerified: boolean;
  profileCompleteness: number;
  isAvailableForHire: boolean;
  lastActive: Date;
  searchKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const getCachedFreelancerProfile = async (
  freelancerId: string
): Promise<CachedFreelancerProfile | null> => {
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

    await redisClient.setex(
      cacheKey,
      FREELANCER_CACHE_TTL,
      JSON.stringify(profile)
    );

    return profile as CachedFreelancerProfile;
  } catch (err) {
    console.error("Freelancer cache error:", err);

    // Fallback on cache error
    const profile = await FreelancerProfile.findOne({ freelancerId }).lean();
    return profile as CachedFreelancerProfile | null;
  }
};

export const invalidateFreelancerCache = async (
  freelancerId: string
): Promise<void> => {
  try {
    const cacheKey = `${FREELANCER_CACHE_PREFIX}${freelancerId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error("Freelancer cache invalidation error:", error);
  }
};

export const updateFreelancerCache = async (
  freelancerId: string,
  profileData: Partial<CachedFreelancerProfile>
): Promise<void> => {
  try {
    const cacheKey = `${FREELANCER_CACHE_PREFIX}${freelancerId}`;

    // Get existing cached data
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const existingProfile = JSON.parse(cachedData);
      const updatedProfile = { ...existingProfile, ...profileData };
      await redisClient.setex(
        cacheKey,
        FREELANCER_CACHE_TTL,
        JSON.stringify(updatedProfile)
      );
    }
  } catch (error) {
    console.error("Freelancer cache update error:", error);
  }
};

export const setFreelancerCache = async (
  profile: CachedFreelancerProfile
): Promise<void> => {
  try {
    const cacheKey = `${FREELANCER_CACHE_PREFIX}${profile.freelancerId}`;
    await redisClient.setex(
      cacheKey,
      FREELANCER_CACHE_TTL,
      JSON.stringify(profile)
    );
  } catch (error) {
    console.error("Freelancer cache set error:", error);
  }
};
