import type { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
declare const loginLimiter: RateLimiterRedis;
declare const signupLimiter: RateLimiterRedis;
declare const passwordResetLimiter: RateLimiterRedis;
declare const resendVerificationLimiter: RateLimiterRedis;
declare const newPasswordLimiter: RateLimiterRedis;
declare const postJobLimiter: RateLimiterRedis;
declare const getJobsLimiter: RateLimiterRedis;
declare const submitProposalLimiter: RateLimiterRedis;
declare const sendMessageHttpLimiter: RateLimiterRedis;
declare const socketSendMessageLimiter: RateLimiterRedis;
declare const socketTypingLimiter: RateLimiterRedis;
declare const socketMarkAsReadLimiter: RateLimiterRedis;
declare const socketJoinConversationLimiter: RateLimiterRedis;
declare const uploadPictureLimiter: RateLimiterRedis;
declare const matchedJobsLimiter: RateLimiterRedis;
type RateLimiterType = "login" | "signup" | "passwordReset" | "resendVerification" | "newPassword" | "postJob" | "getJobs" | "submitProposal" | "sendMessageHttp" | "uploadPicture" | "matchedJobs";
/**
 * Creates a rate limiting middleware for the specified limiter type
 */
export declare const rateLimiter: (type: RateLimiterType) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export { loginLimiter, signupLimiter, passwordResetLimiter, resendVerificationLimiter, newPasswordLimiter, postJobLimiter, getJobsLimiter, submitProposalLimiter, sendMessageHttpLimiter, uploadPictureLimiter, matchedJobsLimiter, socketSendMessageLimiter, socketTypingLimiter, socketMarkAsReadLimiter, socketJoinConversationLimiter, };
//# sourceMappingURL=rateLimiter.d.ts.map