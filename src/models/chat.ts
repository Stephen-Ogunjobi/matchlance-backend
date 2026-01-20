import { Schema, model, Document, Types } from "mongoose";

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

const messageSchema = new Schema<IMessage>(
  {
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
  },
  {
    timestamps: true,
  }
);

const conversationSchema = new Schema<IConversation>(
  {
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
      index: true,
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
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, isRead: 1 });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ jobId: 1, proposalId: 1 });
conversationSchema.index({ "lastMessage.timestamp": -1 });
conversationSchema.index(
  { proposalId: 1 },
  {
    unique: true,
    partialFilterExpression: { proposalId: { $exists: true } },
  }
);

// Validation: Must have 2 participants
conversationSchema.pre("validate", function (this: IConversation) {
  if (this.participants.length !== 2) {
    throw new Error("Conversation must have exactly 2 participants");
  }
});

export const Message = model<IMessage>("Message", messageSchema);
export const Conversation = model<IConversation>(
  "Conversation",
  conversationSchema
);
