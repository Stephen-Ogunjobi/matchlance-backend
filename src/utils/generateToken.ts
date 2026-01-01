import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateAccessToken = (
  userId: any,
  role: string = "freelancer"
) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in the environment");
  }

  return jwt.sign({ userId, role }, secret, { expiresIn: "15m" });
};

export const generateRefreshToken = (userId: any) => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not defined in the environment");
  }

  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
};
