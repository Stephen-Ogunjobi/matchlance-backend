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
  (req, res, next) => {
    passport.authenticate("google", (err, user, info) => {
      if (err) {
        console.error("Passport authentication error:", err);
        return res.status(500).json({ error: "Authentication failed", details: err.message });
      }
      if (!user) {
        console.error("Passport authentication: No user returned", info);
        return res.status(401).json({ error: "Authentication failed", info });
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("Session login error:", loginErr);
          return res.status(500).json({ error: "Login failed", details: loginErr.message });
        }
        next();
      });
    })(req, res, next);
  },
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
