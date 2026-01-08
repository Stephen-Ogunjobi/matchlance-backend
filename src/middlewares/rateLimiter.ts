import type { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redisClient } from "../config/redis.js";

// get client identifier
const getClientKey = (req: Request): string => {
  const userId = req.user?.userId;
  if (userId) return `user_${userId}`;

  // Fallback to IP address
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(",")[0]
    : req.ip || req.socket.remoteAddress || "unknown";
  return `ip_${ip}`;
};

//auth rate limiters
const loginLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:login",
  points: 5,
  duration: 15 * 60,
  blockDuration: 15 * 60,
});

const signupLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:signup",
  points: 3,
  duration: 60 * 60,
});

const passwordResetLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:password-reset",
  points: 3,
  duration: 60 * 60,
});

const resendVerificationLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:resend-verification",
  points: 3,
  duration: 60 * 60,
});

const newPasswordLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:new-password",
  points: 5,
  duration: 15 * 60,
});

//job rate limiters
const postJobLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:post-job",
  points: 10,
  duration: 60 * 60,
});

const getJobsLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:get-jobs",
  points: 60,
  duration: 60,
});

// proposal rate limiters
const submitProposalLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:submit-proposal",
  points: 5,
  duration: 60 * 60,
});

// chat rate limiters
const sendMessageHttpLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:send-message-http",
  points: 30,
  duration: 60, // 1 minute
});

//socket rate limiters
const socketSendMessageLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:socket-send-message",
  points: 15,
  duration: 10,
});

const socketTypingLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:socket-typing",
  points: 5,
  duration: 5,
});

const socketMarkAsReadLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:socket-mark-read",
  points: 10,
  duration: 10,
});

const socketJoinConversationLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:socket-join-conversation",
  points: 5,
  duration: 10,
});

// freelancer rate limiters
const uploadPictureLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:upload-picture",
  points: 5,
  duration: 60 * 60, // 1 hour
});

const matchedJobsLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl:matched-jobs",
  points: 30,
  duration: 60,
});

// ==================== MIDDLEWARE FACTORY ====================

type RateLimiterType =
  | "login"
  | "signup"
  | "passwordReset"
  | "resendVerification"
  | "newPassword"
  | "postJob"
  | "getJobs"
  | "submitProposal"
  | "sendMessageHttp"
  | "uploadPicture"
  | "matchedJobs";

const limiters: Record<RateLimiterType, RateLimiterRedis> = {
  login: loginLimiter,
  signup: signupLimiter,
  passwordReset: passwordResetLimiter,
  resendVerification: resendVerificationLimiter,
  newPassword: newPasswordLimiter,
  postJob: postJobLimiter,
  getJobs: getJobsLimiter,
  submitProposal: submitProposalLimiter,
  sendMessageHttp: sendMessageHttpLimiter,
  uploadPicture: uploadPictureLimiter,
  matchedJobs: matchedJobsLimiter,
};

/**
 * Creates a rate limiting middleware for the specified limiter type
 */
export const rateLimiter = (type: RateLimiterType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const limiter = limiters[type];
    const key = getClientKey(req);

    try {
      await limiter.consume(key);
      next();
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

      res.set("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter,
      });
    }
  };
};

export {
  // HTTP route limiters
  loginLimiter,
  signupLimiter,
  passwordResetLimiter,
  resendVerificationLimiter,
  newPasswordLimiter,
  postJobLimiter,
  getJobsLimiter,
  submitProposalLimiter,
  sendMessageHttpLimiter,
  uploadPictureLimiter,
  matchedJobsLimiter,
  // Socket limiters
  socketSendMessageLimiter,
  socketTypingLimiter,
  socketMarkAsReadLimiter,
  socketJoinConversationLimiter,
};
