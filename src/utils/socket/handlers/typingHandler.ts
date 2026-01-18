import type { AuthenticatedSocket, RateLimitError } from "../types.js";
import { socketTypingLimiter } from "../../../middlewares/rateLimiter.js";
import { typingSchema } from "../validation.js";

export const handleTyping = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.userId!;

  try {
    // Rate limit check
    await socketTypingLimiter.consume(userId);

    // Validate input with Zod
    const validationResult = typingSchema.safeParse(data);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      socket.emit("error", {
        message: "Validation failed",
        errors,
      });
      return;
    }

    const { conversationId, isTyping } = validationResult.data;

    socket.to(`conversation:${conversationId}`).emit("user_typing", {
      userId,
      conversationId,
      isTyping,
    });
  } catch (error) {
    const rateLimitError = error as RateLimitError;
    if (rateLimitError.remainingPoints !== undefined) {
      // Silently ignore typing rate limits to avoid spamming errors
      return;
    }
    console.error("Typing event error:", error);
  }
};
