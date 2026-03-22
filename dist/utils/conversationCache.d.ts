import { Types } from "mongoose";
interface CachedConversation {
    _id: Types.ObjectId;
    participants: Types.ObjectId[];
    jobId?: Types.ObjectId;
    proposalId?: Types.ObjectId;
    lastMessage?: {
        content: string;
        senderId: Types.ObjectId;
        timestamp: Date;
    };
    unreadCount: Record<string, number>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const getCachedConversation: (conversationId: string) => Promise<CachedConversation | null>;
export declare const getCachedUserConversations: (userId: string) => Promise<CachedConversation[]>;
export declare const invalidateConversationCache: (conversationId: string) => Promise<void>;
export declare const invalidateUserConversationsCache: (userId: string) => Promise<void>;
export declare const updateConversationCache: (conversationId: string, conversationData: Partial<CachedConversation>) => Promise<void>;
export {};
//# sourceMappingURL=conversationCache.d.ts.map