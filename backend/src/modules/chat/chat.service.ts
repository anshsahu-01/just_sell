import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { CreateConversationInput, SendMessageInput } from "./chat.validation";

const userPublicSelect = {
  id: true,
  name: true,
  profileImage: true,
  collegeName: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const conversationInclude = {
  product: {
    select: {
      id: true,
      title: true,
      images: true,
      isSold: true,
      price: true,
    },
  },
  buyer: { select: userPublicSelect },
  seller: { select: userPublicSelect },
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      content: true,
      createdAt: true,
      senderId: true,
    },
  },
} satisfies Prisma.ConversationInclude;

type ConversationListItem = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

function formatConversation(conversation: ConversationListItem, currentUserId: string) {
  const otherUser =
    conversation.buyerId === currentUserId
      ? conversation.seller
      : conversation.buyer;
  const lastMessage = conversation.messages[0] ?? null;

  return {
    id: conversation.id,
    productId: conversation.productId,
    productTitle: conversation.product.title,
    productImage: conversation.product.images[0] ?? null,
    otherUser,
    lastMessage: lastMessage
      ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          isMine: lastMessage.senderId === currentUserId,
        }
      : null,
    lastMessageAt: conversation.lastMessageAt ?? conversation.createdAt,
    createdAt: conversation.createdAt,
  };
}

async function getConversationForUser(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    throw new AppError("You are not part of this conversation", 403);
  }

  return conversation;
}

export async function createOrGetConversation(
  userId: string,
  input: CreateConversationInput
) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, userId: true, title: true },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (product.userId === userId) {
    throw new AppError("You cannot chat with yourself", 403);
  }

  const sellerId = product.userId;

  let conversation = await prisma.conversation.findFirst({
    where: {
      productId: product.id,
      buyerId: userId,
      sellerId,
    },
    include: conversationInclude,
  });

  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: {
          productId: product.id,
          buyerId: userId,
          sellerId,
        },
        include: conversationInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        conversation = await prisma.conversation.findFirst({
          where: {
            productId: product.id,
            buyerId: userId,
            sellerId,
          },
          include: conversationInclude,
        });
      } else {
        throw error;
      }
    }
  }

  if (!conversation) {
    throw new AppError("Could not create conversation", 500);
  }

  return formatConversation(conversation, userId);
}

export async function getUserConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: conversationInclude,
    orderBy: [
      { lastMessageAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  return conversations.map((c) => formatConversation(c, userId));
}

export async function getConversationMessages(
  conversationId: string,
  userId: string
) {
  await getConversationForUser(conversationId, userId);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      product: { select: { id: true, title: true, images: true, price: true, isSold: true, status: true } },
      buyer: { select: userPublicSelect },
      seller: { select: userPublicSelect },
    },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: userPublicSelect },
    },
  });

  const otherUser =
    conversation.buyerId === userId ? conversation.seller : conversation.buyer;

  return {
    id: conversation.id,
    productId: conversation.product.id,
    productTitle: conversation.product.title,
    productImage: conversation.product.images[0] ?? null,
    productPrice: Number(conversation.product.price),
    isSold: conversation.product.isSold || conversation.product.status === "SOLD",
    otherUser,
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      deliveredAt: m.deliveredAt,
      seenAt: m.seenAt,
      isMine: m.senderId === userId,
      sender: m.sender,
    })),
  };
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  input: SendMessageInput
) {
  const conversation = await getConversationForUser(conversationId, userId);

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: input.content,
      },
      include: {
        sender: { select: userPublicSelect },
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: created.createdAt },
    });

    return created;
  });

  const formattedMessage = {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    deliveredAt: message.deliveredAt,
    seenAt: message.seenAt,
    isMine: true,
    sender: message.sender,
  };

  // Emit realtime event
  try {
    const { getIO } = require("../../config/socket");
    const io = getIO();
    
    // Broadcast to chat room
    io.to(`chat_${conversationId}`).emit("new_message", {
      chatId: conversationId,
      message: formattedMessage,
    });

    // Also broadcast to the recipient's personal room for the chat list update
    const recipientId = conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;
    io.to(`user_${recipientId}`).emit("new_message", {
      chatId: conversationId,
      message: formattedMessage,
    });
  } catch (error) {
    console.error("Failed to emit socket event:", error);
  }

  return formattedMessage;
}

export async function editMessage(
  messageId: string,
  userId: string,
  input: { content: string }
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) throw new AppError("Message not found", 404);
  if (message.senderId !== userId) throw new AppError("Unauthorized", 403);
  if (message.deletedAt) throw new AppError("Cannot edit a deleted message", 400);

  const now = new Date();
  const timeDiff = now.getTime() - new Date(message.createdAt).getTime();
  if (timeDiff > 15 * 60 * 1000) {
    throw new AppError("Messages can only be edited within 15 minutes", 400);
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: input.content, editedAt: now },
  });

  try {
    const { getIO } = require("../../config/socket");
    const io = getIO();
    io.to(`chat_${message.conversationId}`).emit("message_updated", {
      id: updated.id,
      content: updated.content,
      editedAt: updated.editedAt,
    });
  } catch (error) {
    console.error("Failed to emit socket event:", error);
  }

  return updated;
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) throw new AppError("Message not found", 404);
  if (message.senderId !== userId) throw new AppError("Unauthorized", 403);

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: "This message was deleted", deletedAt: new Date() },
  });

  try {
    const { getIO } = require("../../config/socket");
    const io = getIO();
    io.to(`chat_${message.conversationId}`).emit("message_deleted", {
      id: updated.id,
      content: updated.content,
      deletedAt: updated.deletedAt,
    });
  } catch (error) {
    console.error("Failed to emit socket event:", error);
  }

  return updated;
}

export async function clearConversation(conversationId: string, userId: string) {
  await getConversationForUser(conversationId, userId);

  // Note: True per-user message visibility requires a MessageVisibility table.
  // For simplicity based on requirements, we hard-delete messages if we clear.
  // Actually, standard marketplace just deletes the messages. 
  await prisma.message.deleteMany({
    where: { conversationId },
  });

  try {
    const { getIO } = require("../../config/socket");
    const io = getIO();
    io.to(`chat_${conversationId}`).emit("conversation_cleared", { conversationId });
  } catch (error) {
    console.error("Failed to emit socket event:", error);
  }

  return { success: true };
}

export async function deleteConversation(conversationId: string, userId: string) {
  const conversation = await getConversationForUser(conversationId, userId);

  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  try {
    const { getIO } = require("../../config/socket");
    const io = getIO();
    const recipientId = conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;
    io.to(`user_${recipientId}`).emit("conversation_deleted", { conversationId });
    io.to(`chat_${conversationId}`).emit("conversation_deleted", { conversationId });
  } catch (error) {
    console.error("Failed to emit socket event:", error);
  }

  return { success: true };
}
