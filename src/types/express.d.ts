import { Types } from "mongoose";

declare global {
  namespace Express {
    interface User {
      // From JWT middleware
      userId?: string;
      iat?: number;
      exp?: number;
      // From Mongoose document (passport)
      _id?: Types.ObjectId;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      role?: string | null;
      googleId?: string | null;
      isEmailVerified?: boolean | null;
      refreshToken?: string | null;
      refreshTokenExpiration?: number | null;
      timestamps?: Date | null;
      password?: string | null;
      emailVerificationToken?: string | null;
      emailVerificationExpires?: Date | null;
      resetPasswordToken?: string | null;
      resetPasswordExpires?: Date | null;
      save?: () => Promise<User>;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
