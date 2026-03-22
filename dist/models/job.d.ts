import { Document, Types } from "mongoose";
export interface IJob extends Document {
    title: string;
    description: string;
    category: "web-development" | "mobile-development" | "design" | "writing" | "marketing" | "data-science" | "other";
    skills: string[];
    budget: {
        type: "fixed" | "hourly";
        amount?: number;
        min?: number;
        max?: number;
        currency: "USD";
    };
    experienceLevel: "entry" | "intermediate" | "expert";
    duration: {
        type: "short" | "medium" | "long";
        estimatedHours?: number;
    };
    clientId: Types.ObjectId;
    status: "draft" | "open" | "in_progress" | "completed" | "cancelled" | "closed";
    proposals: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Job: import("mongoose").Model<IJob, {}, {}, {}, Document<unknown, {}, IJob, {}, import("mongoose").DefaultSchemaOptions> & IJob & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any, IJob>;
//# sourceMappingURL=job.d.ts.map