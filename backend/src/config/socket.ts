import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { prisma } from "./prisma";

let io: Server;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: "*", // allow all in dev, restrict in prod
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as { id: string };
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    // Join personal room
    socket.join(`user_${userId}`);

    socket.on("join_chat", (chatId: string) => {
      socket.join(`chat_${chatId}`);
    });

    socket.on("leave_chat", (chatId: string) => {
      socket.leave(`chat_${chatId}`);
    });

    socket.on("typing", (chatId: string) => {
      socket.to(`chat_${chatId}`).emit("typing", { chatId, userId });
    });

    socket.on("stop_typing", (chatId: string) => {
      socket.to(`chat_${chatId}`).emit("stop_typing", { chatId, userId });
    });

    socket.on("mark_delivered", async ({ chatId, messageIds }: { chatId: string, messageIds: string[] }) => {
      try {
        await prisma.message.updateMany({
          where: {
            id: { in: messageIds },
            conversationId: chatId,
            deliveredAt: null,
          },
          data: {
            deliveredAt: new Date(),
          },
        });
        socket.to(`chat_${chatId}`).emit("message_delivered", { chatId, messageIds, userId });
      } catch (err) {
        console.error("Error marking messages as delivered:", err);
      }
    });

    socket.on("mark_seen", async ({ chatId, messageIds }: { chatId: string, messageIds: string[] }) => {
      try {
        await prisma.message.updateMany({
          where: {
            id: { in: messageIds },
            conversationId: chatId,
            seenAt: null,
          },
          data: {
            seenAt: new Date(),
          },
        });

        // broadcast to the other user so their chat UI updates
        // actually better to broadcast to the chat room
        socket.to(`chat_${chatId}`).emit("message_seen", { chatId, messageIds, userId });
      } catch (err) {
        console.error("Error marking messages as seen:", err);
      }
    });

    socket.on("disconnect", () => {
      // Clean up if needed
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}
