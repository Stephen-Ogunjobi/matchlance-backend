import { Document, Types } from "mongoose";
export interface IClientProfile extends Document {
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
    reviews: Array<{
        freelancerId: Types.ObjectId;
        contractId: Types.ObjectId;
        rating: number;
        comment: string;
        createdAt: Date;
    }>;
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
export declare const ClientProfile: import("mongoose").Model<IClientProfile, {}, {}, {}, Document<unknown, {}, IClientProfile, {}, import("mongoose").DefaultSchemaOptions> & IClientProfile & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any, IClientProfile>;
//# sourceMappingURL=client.d.ts.map