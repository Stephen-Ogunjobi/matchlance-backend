import { Schema, model, Document, Types } from "mongoose";
const messageSchema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true,
    },
    senderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    messageType: {
        type: String,
        enum: ["text", "file", "image"],
        default: "text",
    },
    fileUrl: {
        type: String,
    },
    fileName: {
        type: String,
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    readAt: {
        type: Date,
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent",
        index: true,
    },
    deliveredAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
const conversationSchema = new Schema({
    participants: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    ],
    jobId: {
        type: Schema.Types.ObjectId,
        ref: "Job",
        index: true,
    },
    proposalId: {
        type: Schema.Types.ObjectId,
        ref: "Proposal",
    },
    lastMessage: {
        content: String,
        senderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        timestamp: Date,
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: {},
    },
}, {
    timestamps: true,
});
// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, isRead: 1 });
conversationSchema.index({ participants: 1 });
conversationSchema.index({ jobId: 1, proposalId: 1 });
conversationSchema.index({ "lastMessage.timestamp": -1 });
conversationSchema.index({ proposalId: 1 }, {
    unique: true,
    partialFilterExpression: { proposalId: { $exists: true } },
});
// Validation: Must have 2 participants
conversationSchema.pre("validate", function () {
    if (this.participants.length !== 2) {
        throw new Error("Conversation must have exactly 2 participants");
    }
});
export const Message = model("Message", messageSchema);
export const Conversation = model("Conversation", conversationSchema);
//# sourceMappingURL=chat.js.map