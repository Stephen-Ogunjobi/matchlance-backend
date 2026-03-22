import { Types } from "mongoose";
interface CachedUser {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    googleId?: string | null;
}
export declare const getCachedUser: (userId: string) => Promise<CachedUser | null>;
export declare const invalidateUserCached: (userId: string) => Promise<void>;
export declare const updateUserCache: (userId: string, userData: Partial<CachedUser>) => Promise<void>;
export {};
//# sourceMappingURL=userCache.d.ts.map