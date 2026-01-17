import { z } from "zod";
import mongoose from "mongoose";

// Zod schema for send_message validation
export const sendMessageSchema = z.object({
  conversationId: z
    .string({ message: "conversationId is required" })
    .min(1, "conversationId cannot be empty")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid conversationId format",
    }),
  content: z
    .string({ message: "content is required" })
    .min(1, "Message content cannot be empty")
    .max(5000, "Message content cannot exceed 5000 characters"),
  messageType: z
    .enum(["text", "image", "file", "audio", "video"], {
      message: "Invalid message type",
    })
    .optional()
    .default("text"),
  fileUrl: z.string().url("Invalid file URL").optional(),
  fileName: z.string().max(255, "File name too long").optional(),
});

// Zod schema for join_conversation validation
export const joinConversationSchema = z
  .string({ message: "conversationId is required" })
  .min(1, "conversationId cannot be empty")
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid conversationId format",
  });

// Zod schema for leave_conversation validation
export const leaveConversationSchema = z
  .string({ message: "conversationId is required" })
  .min(1, "conversationId cannot be empty")
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid conversationId format",
  });

// Zod schema for typing event validation
export const typingSchema = z.object({
  conversationId: z
    .string({ message: "conversationId is required" })
    .min(1, "conversationId cannot be empty")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid conversationId format",
    }),
  isTyping: z.boolean({ message: "isTyping must be a boolean" }),
});

// Zod schema for mark_as_read validation
export const markAsReadSchema = z.object({
  conversationId: z
    .string({ message: "conversationId is required" })
    .min(1, "conversationId cannot be empty")
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid conversationId format",
    }),
  messageId: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid messageId format",
    })
    .optional(),
});
