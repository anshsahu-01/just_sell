import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Get API URL correctly
const getApiUrl = () => {
  const localhost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
  const url = process.env.EXPO_PUBLIC_API_URL || `http://${localhost}:5000`;
  // remove trailing /api if present, since socket.io connects to root usually
  return url.replace(/\/api$/, "");
};

let socket: Socket | null = null;

export const connectSocket = (token: string) => {
  if (socket) {
    if (socket.connected) return socket;
    socket.disconnect();
  }

  socket = io(getApiUrl(), {
    auth: {
      token,
    },
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connect error:", error);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
