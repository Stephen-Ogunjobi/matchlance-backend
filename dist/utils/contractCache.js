import { redisClient } from "../config/redis.js";
import { Contract } from "../models/contract.js";
const CONTRACT_CACHE_PREFIX = "contract:";
const CLIENT_CONTRACTS_CACHE_PREFIX = "contracts:client:";
const FREELANCER_CONTRACTS_CACHE_PREFIX = "contracts:freelancer:";
const JOB_CONTRACT_CACHE_PREFIX = "contract:job:";
const CONTRACT_CACHE_TTL = 3600;
export const getCachedContract = async (contractId) => {
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
        await redisClient.setex(cacheKey, CONTRACT_CACHE_TTL, JSON.stringify(contract));
        return contract;
    }
    catch (err) {
        console.error("Contract cache error:", err);
        const contract = await Contract.findById(contractId).lean();
        return contract;
    }
};
export const getCachedContractsByClient = async (clientId) => {
    try {
        const cacheKey = `${CLIENT_CONTRACTS_CACHE_PREFIX}${clientId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const contracts = await Contract.find({ clientId }).lean();
        if (contracts.length > 0) {
            await redisClient.setex(cacheKey, CONTRACT_CACHE_TTL, JSON.stringify(contracts));
        }
        return contracts;
    }
    catch (err) {
        console.error("Client contracts cache error:", err);
        const contracts = await Contract.find({ clientId }).lean();
        return contracts;
    }
};
export const getCachedContractsByFreelancer = async (freelancerId) => {
    try {
        const cacheKey = `${FREELANCER_CONTRACTS_CACHE_PREFIX}${freelancerId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const contracts = await Contract.find({ freelancerId }).lean();
        if (contracts.length > 0) {
            await redisClient.setex(cacheKey, CONTRACT_CACHE_TTL, JSON.stringify(contracts));
        }
        return contracts;
    }
    catch (err) {
        console.error("Freelancer contracts cache error:", err);
        const contracts = await Contract.find({ freelancerId }).lean();
        return contracts;
    }
};
export const getCachedContractByJob = async (jobId) => {
    try {
        const cacheKey = `${JOB_CONTRACT_CACHE_PREFIX}${jobId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const contract = await Contract.findOne({ jobId }).lean();
        if (contract) {
            await redisClient.setex(cacheKey, CONTRACT_CACHE_TTL, JSON.stringify(contract));
        }
        return contract;
    }
    catch (err) {
        console.error("Job contract cache error:", err);
        const contract = await Contract.findOne({ jobId }).lean();
        return contract;
    }
};
export const invalidateContractCache = async (contractId) => {
    try {
        const cacheKey = `${CONTRACT_CACHE_PREFIX}${contractId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Contract cache invalidation error:", error);
    }
};
export const invalidateClientContractsCache = async (clientId) => {
    try {
        const cacheKey = `${CLIENT_CONTRACTS_CACHE_PREFIX}${clientId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Client contracts cache invalidation error:", error);
    }
};
export const invalidateFreelancerContractsCache = async (freelancerId) => {
    try {
        const cacheKey = `${FREELANCER_CONTRACTS_CACHE_PREFIX}${freelancerId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Freelancer contracts cache invalidation error:", error);
    }
};
export const invalidateJobContractCache = async (jobId) => {
    try {
        const cacheKey = `${JOB_CONTRACT_CACHE_PREFIX}${jobId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Job contract cache invalidation error:", error);
    }
};
export const setContractCache = async (contract) => {
    try {
        const cacheKey = `${CONTRACT_CACHE_PREFIX}${contract._id}`;
        await redisClient.setex(cacheKey, CONTRACT_CACHE_TTL, JSON.stringify(contract));
    }
    catch (error) {
        console.error("Contract cache set error:", error);
    }
};
export const updateContractCache = async (contractId, contractData) => {
    try {
        const cacheKey = `${CONTRACT_CACHE_PREFIX}${contractId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            const existingContract = JSON.parse(cachedData);
            const updatedContract = { ...existingContract, ...contractData };
            await redisClient.setex(cacheKey, CONTRACT_CACHE_TTL, JSON.stringify(updatedContract));
        }
    }
    catch (error) {
        console.error("Contract cache update error:", error);
    }
};
//# sourceMappingURL=contractCache.js.map