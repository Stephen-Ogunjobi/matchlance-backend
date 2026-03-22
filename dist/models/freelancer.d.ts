import { Document, Types } from "mongoose";
export interface IFreelancerProfile extends Document {
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
export declare const FreelancerProfile: import("mongoose").Model<IFreelancerProfile, {}, {}, {}, Document<unknown, {}, IFreelancerProfile, {}, import("mongoose").DefaultSchemaOptions> & IFreelancerProfile & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any, IFreelancerProfile>;
//# sourceMappingURL=freelancer.d.ts.map