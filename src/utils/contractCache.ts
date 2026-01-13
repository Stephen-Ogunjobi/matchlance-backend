import type { Types } from "mongoose";
import { redisClient } from "../config/redis.js";
import { Contract } from "../models/contract.js";

const CONTRACT_CACHE_PREFIX = "contract:";
const CLIENT_CONTRACTS_CACHE_PREFIX = "contracts:client:";
const FREELANCER_CONTRACTS_CACHE_PREFIX = "contracts:freelancer:";
const JOB_CONTRACT_CACHE_PREFIX = "contract:job:";
const CONTRACT_CACHE_TTL = 3600;

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
  status:
    | "active"
    | "in_progress"
    | "under_review"
    | "completed"
    | "cancelled"
    | "disputed";
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

export const getCachedContract = async (
  contractId: string
): Promise<CachedContract | null> => {
  try {
    const cacheKey = `${CONTRACT_CACHE_PREFIX}${contractId}`;

    const cacheData = await redisClient.get(cacheKey);
    if (cacheData) {
      return JSON.parse(cacheData);
    }

    const contract = await Contract.findById(contractId).lean();
    if (!contract) {
      return null;
    }

    await redisClient.setex(
      cacheKey,
      CONTRACT_CACHE_TTL,
      JSON.stringify(contract)
    );

    return contract as CachedContract;
  } catch (err) {
    console.error("Contract cache error:", err);
    const contract = await Contract.findById(contractId).lean();
    return contract as CachedContract | null;
  }
};

export const getCachedContractsByClient = async (
  clientId: string
): Promise<CachedContract[]> => {
  try {
    const cacheKey = `${CLIENT_CONTRACTS_CACHE_PREFIX}${clientId}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const contracts = await Contract.find({ clientId }).lean();

    if (contracts.length > 0) {
      await redisClient.setex(
        cacheKey,
        CONTRACT_CACHE_TTL,
        JSON.stringify(contracts)
      );
    }

    return contracts as CachedContract[];
  } catch (err) {
    console.error("Client contracts cache error:", err);
    const contracts = await Contract.find({ clientId }).lean();
    return contracts as CachedContract[];
  }
};

export const getCachedContractsByFreelancer = async (
  freelancerId: string
): Promise<CachedContract[]> => {
  try {
    const cacheKey = `${FREELANCER_CONTRACTS_CACHE_PREFIX}${freelancerId}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const contracts = await Contract.find({ freelancerId }).lean();

    if (contracts.length > 0) {
      await redisClient.setex(
        cacheKey,
        CONTRACT_CACHE_TTL,
        JSON.stringify(contracts)
      );
    }

    return contracts as CachedContract[];
  } catch (err) {
    console.error("Freelancer contracts cache error:", err);
    const contracts = await Contract.find({ freelancerId }).lean();
    return contracts as CachedContract[];
  }
};

export const getCachedContractByJob = async (
  jobId: string
): Promise<CachedContract | null> => {
  try {
    const cacheKey = `${JOB_CONTRACT_CACHE_PREFIX}${jobId}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const contract = await Contract.findOne({ jobId }).lean();

    if (contract) {
      await redisClient.setex(
        cacheKey,
        CONTRACT_CACHE_TTL,
        JSON.stringify(contract)
      );
    }

    return contract as CachedContract | null;
  } catch (err) {
    console.error("Job contract cache error:", err);
    const contract = await Contract.findOne({ jobId }).lean();
    return contract as CachedContract | null;
  }
};

export const invalidateContractCache = async (
  contractId: string
): Promise<void> => {
  try {
    const cacheKey = `${CONTRACT_CACHE_PREFIX}${contractId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error("Contract cache invalidation error:", error);
  }
};

export const invalidateClientContractsCache = async (
  clientId: string
): Promise<void> => {
  try {
    const cacheKey = `${CLIENT_CONTRACTS_CACHE_PREFIX}${clientId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error("Client contracts cache invalidation error:", error);
  }
};

export const invalidateFreelancerContractsCache = async (
  freelancerId: string
): Promise<void> => {
  try {
    const cacheKey = `${FREELANCER_CONTRACTS_CACHE_PREFIX}${freelancerId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error("Freelancer contracts cache invalidation error:", error);
  }
};

export const invalidateJobContractCache = async (
  jobId: string
): Promise<void> => {
  try {
    const cacheKey = `${JOB_CONTRACT_CACHE_PREFIX}${jobId}`;
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error("Job contract cache invalidation error:", error);
  }
};

export const setContractCache = async (
  contract: CachedContract
): Promise<void> => {
  try {
    const cacheKey = `${CONTRACT_CACHE_PREFIX}${contract._id}`;
    await redisClient.setex(
      cacheKey,
      CONTRACT_CACHE_TTL,
      JSON.stringify(contract)
    );
  } catch (error) {
    console.error("Contract cache set error:", error);
  }
};

export const updateContractCache = async (
  contractId: string,
  contractData: Partial<CachedContract>
): Promise<void> => {
  try {
    const cacheKey = `${CONTRACT_CACHE_PREFIX}${contractId}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const existingContract = JSON.parse(cachedData);
      const updatedContract = { ...existingContract, ...contractData };
      await redisClient.setex(
        cacheKey,
        CONTRACT_CACHE_TTL,
        JSON.stringify(updatedContract)
      );
    }
  } catch (error) {
    console.error("Contract cache update error:", error);
  }
};
