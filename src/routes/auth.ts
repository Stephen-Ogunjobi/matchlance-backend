import express from "express";
import {
  getCurrentUser,
  handleGoogleCallback,
  initiateGoogleAuth,
  postLogin,
  postLogout,
  postNewPassword,
  postRefresh,
  postResetPassword,
  postSignup,
  resendVerificationEmail,
  verifyEmail,
  verifyLogin,
} from "../controllers/auth.js";
import { verifyToken } from "../middlewares/middleware.js";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import passport from "passport";

const router = express.Router();

router.post("/signup", rateLimiter("signup"), postSignup);

router.get("/google", initiateGoogleAuth);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  handleGoogleCallback
);

router.post("/login", rateLimiter("login"), postLogin);

router.post("/refresh", postRefresh);

router.post("/logout", postLogout);

router.post("/reset-password", rateLimiter("passwordReset"), postResetPassword);

router.post("/new-password", rateLimiter("newPassword"), postNewPassword);

router.get("/verify", verifyToken, verifyLogin);

router.get("/me", verifyToken, getCurrentUser);

router.get("/verify-email", verifyEmail);

router.post(
  "/resend-verification",
  rateLimiter("resendVerification"),
  resendVerificationEmail
);

export default router;
