import type { Types } from "mongoose";
export declare const generateAccessToken: (userId: string | Types.ObjectId, role?: string) => string;
export declare const generateRefreshToken: (userId: string | Types.ObjectId) => string;
//# sourceMappingURL=generateToken.d.ts.map