import {
  ApiResponse,
  ConversationDetail,
  ConversationListItem,
  ChatMessage,
} from "@/types";
import { apiRequest } from "./api";

export async function createConversation(productId: string, token: string) {
  const res = await apiRequest<ApiResponse<ConversationListItem>>(
    "/chats/conversations",
    {
      method: "POST",
      body: { productId },
      token,
    }
  );
  return res.data;
}

export async function getConversations(token: string) {
  const res = await apiRequest<ApiResponse<ConversationListItem[]>>(
    "/chats/conversations",
    { token }
  );
  return Array.isArray(res.data) ? res.data : [];
}

export async function getConversationMessages(
  conversationId: string,
  token: string
) {
  const res = await apiRequest<ApiResponse<ConversationDetail>>(
    `/chats/conversations/${conversationId}/messages`,
    { token }
  );
  return res.data;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  token: string
) {
  const res = await apiRequest<ApiResponse<ChatMessage>>(
    `/chats/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: { content },
      token,
    }
  );
  return res.data;
}

export async function editMessage(
  messageId: string,
  content: string,
  token: string
) {
  const res = await apiRequest<ApiResponse<ChatMessage>>(
    `/chats/messages/${messageId}`,
    {
      method: "PATCH",
      body: { content },
      token,
    }
  );
  return res.data;
}

export async function deleteMessage(
  messageId: string,
  token: string
) {
  const res = await apiRequest<ApiResponse<ChatMessage>>(
    `/chats/messages/${messageId}`,
    {
      method: "DELETE",
      token,
    }
  );
  return res.data;
}

export async function clearConversation(
  conversationId: string,
  token: string
) {
  const res = await apiRequest<ApiResponse<void>>(
    `/chats/conversations/${conversationId}/messages`,
    {
      method: "DELETE",
      token,
    }
  );
  return res.data;
}

export async function deleteConversation(
  conversationId: string,
  token: string
) {
  const res = await apiRequest<ApiResponse<void>>(
    `/chats/conversations/${conversationId}`,
    {
      method: "DELETE",
      token,
    }
  );
  return res.data;
}
