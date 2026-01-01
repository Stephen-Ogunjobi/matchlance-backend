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
import passport from "passport";

const router = express.Router();

router.post("/signup", postSignup);

router.get("/google", initiateGoogleAuth);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  handleGoogleCallback
);

router.post("/login", postLogin);

router.post("/refresh", postRefresh);

router.post("/logout", postLogout);

router.post("/reset-password", postResetPassword);

router.post("/new-password", postNewPassword);

router.get("/verify", verifyToken, verifyLogin);

router.get("/me", verifyToken, getCurrentUser);

router.get("/verify-email", verifyEmail);

router.post("/resend-verification", resendVerificationEmail);

export default router;
