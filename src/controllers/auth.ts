import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "../models/users.js";
import jwt from "jsonwebtoken";
import passport from "passport";

import dotenv from "dotenv";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import {
  generateToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../utils/emailServices.js";
import { getCachedUser, invalidateUserCached } from "../utils/userCache.js";

dotenv.config();

const SALT_ROUNDS = 10;

const postSignup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid email address" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const verificationToken = generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1).trim(),
      lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1).trim(),
      role: role,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    await sendVerificationEmail(user.email, user.firstName, verificationToken);

    return res.status(201).json({
      message:
        "Signup successful! Please check your email to verify your account.",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.log("signup error", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

const verifyEmail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Verification token required" });
    }

    // Find user with this token and check expiry
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired verification token",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    //store refreshToken in DB
    user.refreshToken = refreshToken;
    await user.save();

    // Invalidate cache since isEmailVerified changed
    await invalidateUserCached(user._id.toString());

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Email verified successfully!",
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.log("Email verification error", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

const initiateGoogleAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const role = req.query.role || "freelancer";

  // Encode role in state parameter to persist through OAuth flow using base64
  const state = Buffer.from(JSON.stringify({ role })).toString("base64");

  // Initiate passport Google authentication with role encoded in state
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: state,
  })(req, res, next);
};

const handleGoogleCallback = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(500).json({ message: "Something went wrong" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${frontendUrl}/auth/callback?success=true`);
  } catch (err) {
    console.log("Google callback error", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const postLogin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.password) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in",
        emailNotVerified: true,
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login Successful",
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (err) {
    console.log("logi error", err);
    return res.status(500).json({ error: "something went wrong" });
  }
};

const postRefresh = async (req: Request, res: Response): Promise<Response> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Token not found" });
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Sever config error" });
    }

    //verify refresh token
    const decoded = jwt.verify(refreshToken, secret) as any;

    const user = await User.findById(decoded.userId);

    if (!user || refreshToken !== user.refreshToken) {
      return res.status(403).json({ message: "Invalid Token" });
    }
    const newAccessToken = generateAccessToken(user._id);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json({ message: "Token refreshed successfully" });
  } catch (err) {
    console.log("refresh error", err);
    return res.status(500).json({ error: "Invalid or expired token" });
  }
};

const postLogout = async (req: Request, res: Response): Promise<Response> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(200).json({ message: "Logged out successfully" });
    }
    const user = (await User.findOne({ refreshToken })) as any;

    if (!user) {
      return res.status(200).json({ message: "Logged out successfully" });
    }

    user.refreshToken = null;
    await user.save();

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.log("Logout error", err);
    return res.status(500).json({ message: "Invalid Request" });
  }
};

const postResetPassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json({
        message: "If an account exists, a password reset email has been sent",
      });
    }

    // Generate reset token
    const resetToken = generateToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    await sendPasswordResetEmail(user.email, user.firstName, resetToken);

    return res
      .status(200)
      .json({ message: "Password rest email sent", userId: user._id });
  } catch (err) {
    console.log("Reset error", err);
    return res.status(500).json({ message: "Invalid Request" });
  }
};

const postNewPassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Password doesnt match" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Invalidate cache after password change
    await invalidateUserCached(user._id.toString());

    return res.status(200).json({ message: "Password successfully change" });
  } catch (err) {
    console.log("New password error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyLogin = async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({ loggedIn: true, user: req.user });
};

const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = await getCachedUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Invalid request" });
  }
};

const resendVerificationEmail = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    // Generate new token
    const verificationToken = generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, user.firstName, verificationToken);

    return res.status(200).json({
      message: "Verification email sent successfully",
    });
  } catch (err) {
    console.log("Resend verification error", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

export {
  postSignup,
  postLogin,
  postRefresh,
  postLogout,
  postResetPassword,
  postNewPassword,
  verifyLogin,
  initiateGoogleAuth,
  handleGoogleCallback,
  resendVerificationEmail,
  verifyEmail,
  getCurrentUser,
};
