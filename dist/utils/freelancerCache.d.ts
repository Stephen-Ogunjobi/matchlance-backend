import { Types } from "mongoose";
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
export declare const getCachedFreelancerProfile: (freelancerId: string) => Promise<CachedFreelancerProfile | null>;
export declare const invalidateFreelancerCache: (freelancerId: string) => Promise<void>;
export declare const updateFreelancerCache: (freelancerId: string, profileData: Partial<CachedFreelancerProfile>) => Promise<void>;
export declare const setFreelancerCache: (profile: CachedFreelancerProfile) => Promise<void>;
//# sourceMappingURL=freelancerCache.d.ts.map