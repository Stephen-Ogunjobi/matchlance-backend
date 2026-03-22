import { redisClient } from "../config/redis.js";
import { Job } from "../models/job.js";
const JOB_CACHE_PREFIX = "job:";
const CLIENT_JOBS_CACHE_PREFIX = "jobs:client:";
const MATCHED_JOBS_CACHE_PREFIX = "matched-jobs:";
const JOB_CACHE_TTL = 3600;
export const getCachedJob = async (jobId) => {
    try {
        const cacheKey = `${JOB_CACHE_PREFIX}${jobId}`;
        const cacheData = await redisClient.get(cacheKey);
        if (cacheData) {
            return JSON.parse(cacheData);
        }
        const job = await Job.findById(jobId).lean();
        if (!job) {
            return null;
        }
        await redisClient.setex(cacheKey, JOB_CACHE_TTL, JSON.stringify(job));
        return job;
    }
    catch (err) {
        console.error("Job cache error:", err);
        const job = await Job.findById(jobId).lean();
        return job;
    }
};
export const getCachedJobsByClient = async (clientId) => {
    try {
        const cacheKey = `${CLIENT_JOBS_CACHE_PREFIX}${clientId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const jobs = await Job.find({ clientId }).lean();
        if (jobs.length > 0) {
            await redisClient.setex(cacheKey, JOB_CACHE_TTL, JSON.stringify(jobs));
        }
        return jobs;
    }
    catch (err) {
        console.error("Client jobs cache error:", err);
        const jobs = await Job.find({ clientId }).lean();
        return jobs;
    }
};
export const getCachedMatchedJobs = async (freelancerId) => {
    try {
        const cacheKey = `${MATCHED_JOBS_CACHE_PREFIX}${freelancerId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        return null;
    }
    catch (err) {
        console.error("Matched jobs cache get error:", err);
        return null;
    }
};
export const invalidateJobCache = async (jobId) => {
    try {
        const cacheKey = `${JOB_CACHE_PREFIX}${jobId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Job cache invalidation error:", error);
    }
};
export const invalidateMatchedJobsCache = async (freelancerId) => {
    try {
        const cacheKey = `${MATCHED_JOBS_CACHE_PREFIX}${freelancerId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Matched jobs cache invalidation error:", error);
    }
};
export const invalidateClientJobsCache = async (clientId) => {
    try {
        const cacheKey = `${CLIENT_JOBS_CACHE_PREFIX}${clientId}`;
        await redisClient.del(cacheKey);
    }
    catch (error) {
        console.error("Client jobs cache invalidation error:", error);
    }
};
export const updateJobCache = async (jobId, jobData) => {
    try {
        const cacheKey = `${JOB_CACHE_PREFIX}${jobId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            const existingJob = JSON.parse(cachedData);
            const updatedJob = { ...existingJob, ...jobData };
            await redisClient.setex(cacheKey, JOB_CACHE_TTL, JSON.stringify(updatedJob));
        }
    }
    catch (error) {
        console.error("Job cache update error:", error);
    }
};
export const setJobCache = async (job) => {
    try {
        const cacheKey = `${JOB_CACHE_PREFIX}${job._id}`;
        await redisClient.setex(cacheKey, JOB_CACHE_TTL, JSON.stringify(job));
    }
    catch (error) {
        console.error("Job cache set error:", error);
    }
};
export const setMatchedJobsCache = async (freelancerId, jobs) => {
    try {
        const cacheKey = `${MATCHED_JOBS_CACHE_PREFIX}${freelancerId}`;
        await redisClient.setex(cacheKey, JOB_CACHE_TTL, JSON.stringify(jobs));
    }
    catch (error) {
        console.error("Matched jobs cache set error:", error);
    }
};
//# sourceMappingURL=jobCache.js.map