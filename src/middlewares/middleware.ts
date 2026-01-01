import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const getAccessToken = (req: Request): string | null => {
  if (!req.cookies || !req.cookies.accessToken) {
    return null;
  }

  return req.cookies.accessToken;
};

const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = getAccessToken(req);

  if (!token || !JWT_SECRET) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    req.user = {
      userId: decoded.userId || decoded.sub || decoded.id,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };
    next();
  } catch (err) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }
};

export { verifyToken };
