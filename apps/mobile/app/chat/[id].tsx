import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingState } from "@/components/LoadingState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import * as chatService from "@/services/chat.service";
import { connectSocket, getSocket } from "@/services/socket.service";
import { ApiError } from "@/services/api";
import { ChatMessage, ConversationDetail } from "@/types";
import { formatMessageTime, formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";

function TypingIndicator() {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, [dot1, dot2, dot3]);

  return (
    <View className="mb-3 self-start">
      <View className="rounded-2xl rounded-bl-[4px] bg-[#F2F2F7] px-4 py-3 flex-row items-center h-10 w-16 justify-center gap-1">
        <Animated.View style={{ opacity: dot1 }} className="h-1.5 w-1.5 bg-muted rounded-full" />
        <Animated.View style={{ opacity: dot2 }} className="h-1.5 w-1.5 bg-muted rounded-full" />
        <Animated.View style={{ opacity: dot3 }} className="h-1.5 w-1.5 bg-muted rounded-full" />
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMessages = useCallback(async () => {
    if (!id || !token) return;
    try {
      const data = await chatService.getConversationMessages(id, token);
      setConversation(data);
    } catch {
      setConversation(null);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!token || !id || !user?.id) return;
    
    const socket = connectSocket(token);
    socket.emit("join_chat", id);

    const handleNewMessage = (data: { chatId: string, message: ChatMessage }) => {
      if (data.chatId === id) {
        const isMine = data.message.sender.id === user.id;

        setConversation((prev) => {
          if (!prev) return prev;
          if (prev.messages.some(m => m.id === data.message.id)) return prev;
          return { ...prev, messages: [...prev.messages, { ...data.message, isMine }] };
        });
        
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        
        if (!isMine) {
          socket.emit("mark_delivered", { chatId: id, messageIds: [data.message.id] });
          socket.emit("mark_seen", { chatId: id, messageIds: [data.message.id] });
        }
      }
    };

    const handleTyping = (data: { chatId: string, userId: string }) => {
      if (data.chatId === id && data.userId !== user.id) {
        setIsTyping(true);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleStopTyping = (data: { chatId: string, userId: string }) => {
      if (data.chatId === id && data.userId !== user.id) setIsTyping(false);
    };

    const handleMessageDelivered = (data: { chatId: string, messageIds: string[], userId: string }) => {
      if (data.chatId === id) {
        setConversation((prev) => {
          if (!prev) return prev;
          const updatedMessages = prev.messages.map(m => 
            data.messageIds.includes(m.id) ? { ...m, deliveredAt: new Date().toISOString() } : m
          );
          return { ...prev, messages: updatedMessages };
        });
      }
    };

    const handleMessageSeen = (data: { chatId: string, messageIds: string[], userId: string }) => {
      if (data.chatId === id) {
        setConversation((prev) => {
          if (!prev) return prev;
          const updatedMessages = prev.messages.map(m => 
            data.messageIds.includes(m.id) ? { ...m, seenAt: new Date().toISOString() } : m
          );
          return { ...prev, messages: updatedMessages };
        });
      }
    };

    const handleMessageUpdated = (data: { id: string, content: string, editedAt: string }) => {
      setConversation((prev) => {
        if (!prev) return prev;
        const updatedMessages = prev.messages.map(m => 
          m.id === data.id ? { ...m, content: data.content, editedAt: data.editedAt } : m
        );
        return { ...prev, messages: updatedMessages };
      });
    };

    const handleMessageDeleted = (data: { id: string, content: string, deletedAt: string }) => {
      setConversation((prev) => {
        if (!prev) return prev;
        const updatedMessages = prev.messages.map(m => 
          m.id === data.id ? { ...m, content: data.content, deletedAt: data.deletedAt } : m
        );
        return { ...prev, messages: updatedMessages };
      });
    };

    const handleConversationCleared = (data: { conversationId: string }) => {
      if (data.conversationId === id) {
        setConversation((prev) => prev ? { ...prev, messages: [] } : prev);
      }
    };

    const handleConversationDeleted = (data: { conversationId: string }) => {
      if (data.conversationId === id) {
        router.back();
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("message_seen", handleMessageSeen);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("conversation_cleared", handleConversationCleared);
    socket.on("conversation_deleted", handleConversationDeleted);

    return () => {
      socket.emit("leave_chat", id);
      socket.off("new_message", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("message_seen", handleMessageSeen);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("conversation_cleared", handleConversationCleared);
      socket.off("conversation_deleted", handleConversationDeleted);
    };
  }, [id, token, user?.id, router]);

  useEffect(() => {
    if (conversation?.messages.length && user?.id) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
      
      const socket = getSocket();
      if (!socket) return;

      const unseenIds = conversation.messages
        .filter(m => !m.isMine && !m.seenAt)
        .map(m => m.id);
        
      const undeliveredIds = conversation.messages
        .filter(m => !m.isMine && !m.deliveredAt)
        .map(m => m.id);
      
      if (undeliveredIds.length > 0) {
        socket.emit("mark_delivered", { chatId: id, messageIds: undeliveredIds });
      }

      if (unseenIds.length > 0) {
        socket.emit("mark_seen", { chatId: id, messageIds: unseenIds });
      }
    }
  }, [conversation?.messages.length, user?.id, id]);

  const handleTextChange = (val: string) => {
    setText(val);
    const socket = getSocket();
    if (!socket || !id) return;
    
    socket.emit("typing", id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", id);
    }, 1200);
  };

  const handleSend = async () => {
    if (!id || !token || !text.trim() || !user) return;
    const content = text.trim();
    const isEdit = !!editingMessageId;
    const targetMessageId = editingMessageId;
    
    setText("");
    setEditingMessageId(null);
    
    const socket = getSocket();
    if (socket) socket.emit("stop_typing", id);

    try {
      setSending(true);

      if (isEdit) {
        // Optimistic update for edit is optional, we just wait for server to keep it simple and safe
        const updated = await chatService.editMessage(targetMessageId, content, token);
        setConversation((prev) => {
          if (!prev) return prev;
          const msgs = prev.messages.map(m => m.id === targetMessageId ? { ...m, content, editedAt: updated.editedAt } : m);
          return { ...prev, messages: msgs };
        });
      } else {
        setOptimisticMessage(content);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

        const message = await chatService.sendMessage(id, content, token);
        
        setConversation((prev) => {
          if (!prev) return prev;
          if (prev.messages.some(m => m.id === message.id)) return prev;
          return { ...prev, messages: [...prev.messages, { ...message, isMine: true }] };
        });
        setOptimisticMessage(null);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      }
    } catch (err) {
      if (!isEdit) setOptimisticMessage(null);
      setText(content); // restore text
      if (isEdit) setEditingMessageId(targetMessageId); // restore edit state
      
      Alert.alert(
        isEdit ? "Edit failed" : "Send failed",
        err instanceof ApiError ? err.message : "Could not complete action"
      );
    } finally {
      setSending(false);
    }
  };

  const handleMessageLongPress = (item: ChatMessage) => {
    if (!item.isMine || item.deletedAt) return; // Only allow editing/deleting own active messages

    const now = new Date().getTime();
    const createdTime = new Date(item.createdAt).getTime();
    const canEdit = now - createdTime <= 15 * 60 * 1000;

    const options = [
      ...(canEdit ? [{
        text: "Edit",
        onPress: () => {
          setEditingMessageId(item.id);
          setText(item.content);
        }
      }] : []),
      {
        text: "Delete",
        style: "destructive" as const,
        onPress: () => {
          Alert.alert(
            "Delete Message",
            "Are you sure you want to delete this message? This action cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    const deleted = await chatService.deleteMessage(item.id, token!);
                    setConversation(prev => {
                      if (!prev) return prev;
                      const msgs = prev.messages.map(m => m.id === item.id ? { ...m, content: deleted.content, deletedAt: deleted.deletedAt } : m);
                      return { ...prev, messages: msgs };
                    });
                  } catch (error) {
                    Alert.alert("Error", "Could not delete message");
                  }
                }
              }
            ]
          );
        }
      },
      { text: "Cancel", style: "cancel" as const }
    ];

    Alert.alert("Message Options", undefined, options);
  };

  const handleConversationOptions = () => {
    Alert.alert(
      "Conversation Options",
      undefined,
      [
        {
          text: "Clear Conversation",
          onPress: () => {
            Alert.alert("Clear Conversation", "Delete all messages for you?", [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Clear", 
                style: "destructive", 
                onPress: async () => {
                  if (token && id) {
                    await chatService.clearConversation(id, token);
                    setConversation(prev => prev ? { ...prev, messages: [] } : prev);
                  }
                } 
              }
            ]);
          }
        },
        {
          text: "Delete Chat",
          style: "destructive",
          onPress: () => {
            Alert.alert("Delete Chat", "Permanently remove this conversation?", [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Delete", 
                style: "destructive", 
                onPress: async () => {
                  if (token && id) {
                    await chatService.deleteConversation(id, token);
                    router.back();
                  }
                } 
              }
            ]);
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  if (loading) return <LoadingState />;

  if (!conversation) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScreenHeader title="Chat" showBack />
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Conversation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMessageTicks = (item: ChatMessage) => {
    if (!item.isMine || item.deletedAt) return null;
    if (item.seenAt) return <Ionicons name="checkmark-done" size={14} color="#34B7F1" />;
    if (item.deliveredAt) return <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.7)" />;
    return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.7)" />;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F8FA]" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1">
          <View className="bg-white">
            <ScreenHeader
              title={conversation.otherUser.name}
              showBack
              rightAction={
                <Pressable onPress={handleConversationOptions} className="p-2">
                  <Ionicons name="ellipsis-vertical" size={20} color="#000" />
                </Pressable>
              }
            />
            <View className="px-4 pb-3 pt-1">
              <Pressable 
                onPress={() => router.push(`/product/${conversation.productId}`)}
                className="flex-row items-center rounded-2xl border border-line bg-white p-3 shadow-sm active:bg-slate-50"
              >
                {conversation.productImage ? (
                  <Image
                    source={{ uri: conversation.productImage }}
                    className="h-12 w-12 rounded-lg bg-canvas"
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-12 w-12 rounded-lg bg-canvas" />
                )}
                <View className="ml-3 flex-1 justify-center">
                  <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
                    {conversation.productTitle}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Text className="text-[13px] font-medium text-ink">
                      {formatPrice(conversation.productPrice)}
                    </Text>
                    {conversation.isSold && (
                      <View className="rounded-full bg-danger/10 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-danger">SOLD</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#999999" />
              </Pressable>
            </View>
          </View>

          <FlatList
            ref={listRef}
            className="flex-1 px-4 py-3"
            data={conversation.messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
            renderItem={({ item }) => (
              <Pressable
                onLongPress={() => handleMessageLongPress(item)}
                delayLongPress={250}
                className={cn(
                  "mb-3 max-w-[75%]",
                  item.isMine ? "self-end" : "self-start",
                  item.deletedAt && "opacity-70"
                )}
              >
                <View
                  className={cn(
                    "px-4 py-3",
                    item.isMine 
                      ? "rounded-2xl rounded-br-[4px] bg-ink" 
                      : "rounded-2xl rounded-bl-[4px] bg-[#F2F2F7]"
                  )}
                >
                  <Text
                    className={cn(
                      "text-[15px] leading-5",
                      item.isMine ? "text-white" : "text-ink",
                      item.deletedAt && "italic opacity-80"
                    )}
                  >
                    {item.content}
                  </Text>
                  <View className="mt-1 flex-row items-center justify-end gap-1">
                    <Text
                      className={cn(
                        "text-[10px]",
                        item.isMine ? "text-right text-white/70" : "text-left text-muted"
                      )}
                    >
                      {formatMessageTime(item.createdAt)}
                    </Text>
                    {item.editedAt && !item.deletedAt && (
                      <Text
                        className={cn(
                          "text-[10px]",
                          item.isMine ? "text-right text-white/70" : "text-left text-muted"
                        )}
                      >
                        (edited)
                      </Text>
                    )}
                    {renderMessageTicks(item)}
                  </View>
                </View>
              </Pressable>
            )}
            ListFooterComponent={
              <>
                {optimisticMessage && (
                  <View className="mb-3 max-w-[75%] self-end">
                    <View className="rounded-2xl rounded-br-[4px] bg-ink/70 px-4 py-3">
                      <Text className="text-[15px] leading-5 text-white">
                        {optimisticMessage}
                      </Text>
                      <View className="mt-1 flex-row items-center justify-end gap-1">
                        <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.7)" />
                        <Text className="text-[10px] text-white/70">Sending...</Text>
                      </View>
                    </View>
                  </View>
                )}
                {isTyping && <TypingIndicator />}
              </>
            }
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-10">
                <Ionicons name="chatbubbles-outline" size={48} color="#E5E5EA" className="mb-3" />
                <Text className="text-[16px] font-medium text-ink">No messages yet</Text>
                <Text className="mt-1 text-center text-[14px] text-muted">
                  Send a message to start the conversation.
                </Text>
              </View>
            }
          />

          <View 
            className="border-t border-line bg-white px-4 py-3" 
            style={{ paddingBottom: Math.max(insets.bottom, 8) }}
          >
            {editingMessageId && (
              <View className="mb-2 flex-row items-center justify-between bg-canvas p-2 rounded-lg">
                <Text className="text-[12px] font-medium text-ink">Editing message...</Text>
                <Pressable onPress={() => { setEditingMessageId(null); setText(""); }}>
                  <Ionicons name="close" size={16} color="#666" />
                </Pressable>
              </View>
            )}
            <View className="flex-row items-end gap-3">
              <View className="min-h-[40px] max-h-24 flex-1 flex-row items-end rounded-full bg-[#F2F2F7] px-4 py-1">
                <TextInput
                  className="max-h-20 flex-1 py-2 text-[15px] leading-5 text-ink"
                  placeholder="Message..."
                  placeholderTextColor="#8E8E93"
                  value={text}
                  onChangeText={handleTextChange}
                  multiline
                />
              </View>
              <Pressable
                onPress={handleSend}
                disabled={sending || !text.trim()}
                className={cn(
                  "h-[40px] w-[40px] items-center justify-center rounded-full bg-ink",
                  (!text.trim() || sending) && "bg-[#E5E5EA] opacity-100"
                )}
              >
                <Ionicons 
                  name={editingMessageId ? "checkmark" : "send"} 
                  size={16} 
                  color={(!text.trim() || sending) ? "#8E8E93" : "#FFFFFF"} 
                  style={{ marginLeft: editingMessageId ? 0 : 2, marginTop: 1 }} 
                />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
