import { Document, Types } from "mongoose";
export interface IMessage extends Document {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    content: string;
    messageType: "text" | "file" | "image";
    fileUrl?: string;
    fileName?: string;
    isRead: boolean;
    readAt?: Date;
    status: "sent" | "delivered" | "read";
    deliveredAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface IConversation extends Document {
    participants: Types.ObjectId[];
    jobId?: Types.ObjectId;
    proposalId?: Types.ObjectId;
    lastMessage?: {
        content: string;
        senderId: Types.ObjectId;
        timestamp: Date;
    };
    unreadCount: Map<string, number>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Message: import("mongoose").Model<IMessage, {}, {}, {}, Document<unknown, {}, IMessage, {}, import("mongoose").DefaultSchemaOptions> & IMessage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any, IMessage>;
export declare const Conversation: import("mongoose").Model<IConversation, {}, {}, {}, Document<unknown, {}, IConversation, {}, import("mongoose").DefaultSchemaOptions> & IConversation & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any, IConversation>;
//# sourceMappingURL=chat.d.ts.map