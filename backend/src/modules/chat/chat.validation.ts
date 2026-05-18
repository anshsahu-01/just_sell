import { z } from "zod";

export const createConversationSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
});

export const conversationIdParamSchema = z.object({
  id: z.string().uuid("Invalid conversation ID"),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(2000),
});

export const editMessageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(1000, "Message too long"),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
