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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingState } from "@/components/LoadingState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import * as chatService from "@/services/chat.service";
import { ApiError } from "@/services/api";
import { ChatMessage, ConversationDetail } from "@/types";
import { formatMessageTime, formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

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
    if (conversation?.messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [conversation?.messages.length]);

  const handleSend = async () => {
    if (!id || !token || !text.trim()) return;
    const content = text.trim();
    setText("");
    try {
      setSending(true);
      setOptimisticMessage(content);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

      const message = await chatService.sendMessage(id, content, token);
      
      setConversation((prev) =>
        prev
          ? { ...prev, messages: [...prev.messages, message] }
          : prev
      );
      setOptimisticMessage(null);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      setOptimisticMessage(null);
      setText(content);
      Alert.alert(
        "Send failed",
        err instanceof ApiError ? err.message : "Could not send message"
      );
    } finally {
      setSending(false);
    }
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

  return (
    <SafeAreaView className="flex-1 bg-[#F8F8FA]" edges={["top"]}>
      <View className="bg-white">
        <ScreenHeader
          title={conversation.otherUser.name}
          showBack
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

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          className="flex-1 px-4 py-3"
          data={conversation.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
          renderItem={({ item }) => (
            <View
              className={cn(
                "mb-3 max-w-[75%]",
                item.isMine ? "self-end" : "self-start"
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
                    item.isMine ? "text-white" : "text-ink"
                  )}
                >
                  {item.content}
                </Text>
                <Text
                  className={cn(
                    "mt-1 text-[10px]",
                    item.isMine ? "text-right text-white/70" : "text-left text-muted"
                  )}
                >
                  {formatMessageTime(item.createdAt)}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            optimisticMessage ? (
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
            ) : null
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

        <View className="border-t border-line bg-white px-4 py-3 pb-5">
          <View className="flex-row items-end gap-3">
            <View className="min-h-[40px] max-h-24 flex-1 flex-row items-end rounded-full bg-[#F2F2F7] px-4 py-1">
              <TextInput
                className="max-h-20 flex-1 py-2 text-[15px] leading-5 text-ink"
                placeholder="Message..."
                placeholderTextColor="#8E8E93"
                value={text}
                onChangeText={setText}
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
                name="send" 
                size={16} 
                color={(!text.trim() || sending) ? "#8E8E93" : "#FFFFFF"} 
                style={{ marginLeft: 2, marginTop: 1 }} 
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
