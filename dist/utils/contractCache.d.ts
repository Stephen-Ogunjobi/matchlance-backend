import type { Types } from "mongoose";
interface CachedContract {
    _id: Types.ObjectId;
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
export declare const getCachedContract: (contractId: string) => Promise<CachedContract | null>;
export declare const getCachedContractsByClient: (clientId: string) => Promise<CachedContract[]>;
export declare const getCachedContractsByFreelancer: (freelancerId: string) => Promise<CachedContract[]>;
export declare const getCachedContractByJob: (jobId: string) => Promise<CachedContract | null>;
export declare const invalidateContractCache: (contractId: string) => Promise<void>;
export declare const invalidateClientContractsCache: (clientId: string) => Promise<void>;
export declare const invalidateFreelancerContractsCache: (freelancerId: string) => Promise<void>;
export declare const invalidateJobContractCache: (jobId: string) => Promise<void>;
export declare const setContractCache: (contract: CachedContract) => Promise<void>;
export declare const updateContractCache: (contractId: string, contractData: Partial<CachedContract>) => Promise<void>;
export {};
//# sourceMappingURL=contractCache.d.ts.map