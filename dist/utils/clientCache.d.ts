import { Types } from "mongoose";
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
export declare const getCachedClientProfile: (clientId: string) => Promise<CachedClientProfile | null>;
export declare const invalidateClientCache: (clientId: string) => Promise<void>;
export declare const updateClientCache: (clientId: string, profileData: Partial<CachedClientProfile>) => Promise<void>;
export declare const setClientCache: (profile: CachedClientProfile) => Promise<void>;
//# sourceMappingURL=clientCache.d.ts.map