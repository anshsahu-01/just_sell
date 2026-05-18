import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as chatController from "./chat.controller";
import {
  conversationIdParamSchema,
  createConversationSchema,
  sendMessageSchema,
} from "./chat.validation";

const router = Router();

router.use(authenticate);

router.post(
  "/conversations",
  validate(createConversationSchema),
  chatController.createConversation
);

router.get("/conversations", chatController.getConversations);

router.get(
  "/conversations/:id/messages",
  validate(conversationIdParamSchema, "params"),
  chatController.getMessages
);

router.post(
  "/conversations/:id/messages",
  validate(conversationIdParamSchema, "params"),
  validate(sendMessageSchema),
  chatController.sendMessage
);

router.delete(
  "/conversations/:id",
  validate(conversationIdParamSchema, "params"),
  chatController.deleteConversation
);

router.delete(
  "/conversations/:id/messages",
  validate(conversationIdParamSchema, "params"),
  chatController.clearConversation
);

router.patch(
  "/messages/:messageId",
  chatController.editMessage
);

router.delete(
  "/messages/:messageId",
  chatController.deleteMessage
);

export default router;
