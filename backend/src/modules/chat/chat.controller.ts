import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getValidated } from "../../middleware/validate";
import * as chatService from "./chat.service";
import {
  CreateConversationInput,
  SendMessageInput,
} from "./chat.validation";

export const createConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const conversation = await chatService.createOrGetConversation(
      req.user!.userId,
      getValidated<CreateConversationInput>(req, "body")
    );
    res.status(201).json({ success: true, data: conversation });
  }
);

export const getConversations = asyncHandler(
  async (req: Request, res: Response) => {
    const conversations = await chatService.getUserConversations(
      req.user!.userId
    );
    res.json({ success: true, data: conversations });
  }
);

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = getValidated<{ id: string }>(req, "params");
  const data = await chatService.getConversationMessages(id, req.user!.userId);
  res.json({ success: true, data });
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = getValidated<{ id: string }>(req, "params");
  const message = await chatService.sendMessage(
    id,
    req.user!.userId,
    getValidated<SendMessageInput>(req, "body")
  );
  res.status(201).json({ success: true, data: message });
});

export const editMessage = asyncHandler(async (req: Request, res: Response) => {
  const messageId = req.params.messageId as string;
  const input = req.body;
  const message = await chatService.editMessage(messageId, req.user!.userId, input);
  res.json({ success: true, data: message });
});

export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const messageId = req.params.messageId as string;
  const message = await chatService.deleteMessage(messageId, req.user!.userId);
  res.json({ success: true, data: message });
});

export const clearConversation = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await chatService.clearConversation(id, req.user!.userId);
  res.json({ success: true });
});

export const deleteConversation = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await chatService.deleteConversation(id, req.user!.userId);
  res.json({ success: true });
});
