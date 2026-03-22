import { Document, Types } from "mongoose";
export interface IContract extends Document {
    jobId: Types.ObjectId;
    clientId: Types.ObjectId;
    freelancerId: Types.ObjectId;
    proposalId: Types.ObjectId;
    conversationId: Types.ObjectId;
    projectDetails: {
        title: string;
        description: string;
        category: string;
        skills: string[];
    };
    budget: {
        type: "fixed" | "hourly";
        amount: number;
        currency: string;
    };
    duration: {
        startDate: Date;
        deadline?: Date;
        estimatedDuration: number;
    };
    status: "active" | "in_progress" | "under_review" | "completed" | "cancelled" | "disputed";
    deliverables: Array<{
        description: string;
        submittedAt?: Date;
        fileUrl?: string;
        status: "pending" | "submitted" | "approved" | "revision_requested";
        feedback?: string;
    }>;
    completionRequest?: {
        requestedBy: "client" | "freelancer";
        requestedAt: Date;
        message?: string;
    };
    completedAt?: Date;
    completedBy?: "client" | "freelancer" | "mutual";
    cancellationRequest?: {
        requestedBy: "client" | "freelancer";
        requestedAt: Date;
        reason: string;
        approvedBy?: "client" | "freelancer";
        approvedAt?: Date;
    };
    cancelledAt?: Date;
    cancellationReason?: string;
    dispute?: {
        isDisputed: boolean;
        filedBy: "client" | "freelancer";
        filedAt: Date;
        reason: string;
        status: "open" | "under_review" | "resolved";
        resolution?: string;
        resolvedAt?: Date;
        resolvedBy?: "admin" | "mutual_agreement";
    };
    reviews: {
        clientReview?: {
            rating: number;
            comment: string;
            reviewedAt: Date;
        };
        freelancerReview?: {
            rating: number;
            comment: string;
            reviewedAt: Date;
        };
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Contract: import("mongoose").Model<IContract, {}, {}, {}, Document<unknown, {}, IContract, {}, import("mongoose").DefaultSchemaOptions> & IContract & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any, IContract>;
//# sourceMappingURL=contract.d.ts.map