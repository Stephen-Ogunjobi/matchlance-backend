import type { Types } from "mongoose";
export interface CachedJob {
    _id: Types.ObjectId;
    title: string;
    description: string;
    category: string;
    skills: string[];
    budget: {
        type: "fixed" | "hourly";
        amount?: number;
        min?: number;
        max?: number;
        currency: string;
    };
    experienceLevel: string;
    duration: {
        type: string;
        estimatedHours?: number;
    };
    clientId: Types.ObjectId;
    status: string;
    proposals: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const getCachedJob: (jobId: string) => Promise<CachedJob | null>;
export declare const getCachedJobsByClient: (clientId: string) => Promise<CachedJob[]>;
export declare const getCachedMatchedJobs: (freelancerId: string) => Promise<CachedJob[] | null>;
export declare const invalidateJobCache: (jobId: string) => Promise<void>;
export declare const invalidateMatchedJobsCache: (freelancerId: string) => Promise<void>;
export declare const invalidateClientJobsCache: (clientId: string) => Promise<void>;
export declare const updateJobCache: (jobId: string, jobData: Partial<CachedJob>) => Promise<void>;
export declare const setJobCache: (job: CachedJob) => Promise<void>;
export declare const setMatchedJobsCache: (freelancerId: string, jobs: CachedJob[]) => Promise<void>;
//# sourceMappingURL=jobCache.d.ts.map