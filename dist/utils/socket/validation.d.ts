import { z } from "zod";
export declare const sendMessageSchema: z.ZodObject<{
    conversationId: z.ZodString;
    content: z.ZodString;
    messageType: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        text: "text";
        file: "file";
        image: "image";
        audio: "audio";
        video: "video";
    }>>>;
    fileUrl: z.ZodOptional<z.ZodString>;
    fileName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const joinConversationSchema: z.ZodString;
export declare const leaveConversationSchema: z.ZodString;
export declare const typingSchema: z.ZodObject<{
    conversationId: z.ZodString;
    isTyping: z.ZodBoolean;
}, z.core.$strip>;
export declare const markAsReadSchema: z.ZodObject<{
    conversationId: z.ZodString;
    messageId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=validation.d.ts.map