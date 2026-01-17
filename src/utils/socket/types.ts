import type { Socket } from "socket.io";
import type { JwtPayload } from "jsonwebtoken";

// Type definitions for better type safety

export interface CustomJwtPayload extends JwtPayload {
  id?: string;
  userId?: string;
}

export interface TypingEventData {
  conversationId: string;
  isTyping: boolean;
}

export interface MarkAsReadEventData {
  conversationId: string;
  messageId?: string;
}

export interface RateLimitError extends Error {
  remainingPoints?: number;
  msBeforeNext?: number;
}

// Add userId to each socket connection
export interface AuthenticatedSocket extends Socket {
  userId?: string;
}
