import { leaveConversationSchema } from "../validation.js";
export const handleLeaveConversation = (socket, data) => {
    const userId = socket.userId;
    try {
        // Validate input with Zod
        const validationResult = leaveConversationSchema.safeParse(data);
        if (!validationResult.success) {
            const errors = validationResult.error.issues.map((issue) => ({
                field: issue.path.join(".") || "conversationId",
                message: issue.message,
            }));
            socket.emit("error", {
                message: "Validation failed",
                errors,
            });
            return;
        }
        const conversationId = validationResult.data;
        socket.leave(`conversation:${conversationId}`);
        console.log(`user ${userId} left the conversation`);
        socket.to(`conversation:${conversationId}`).emit("user_left", {
            userId,
            conversationId,
        });
    }
    catch (error) {
        console.error("Error leaving conversation:", error);
        socket.emit("error", { message: "Failed to leave conversation" });
    }
};
//# sourceMappingURL=leaveConversationHandler.js.map