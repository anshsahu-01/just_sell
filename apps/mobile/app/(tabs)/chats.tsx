import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartButton } from "@/components/CartButton";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import * as chatService from "@/services/chat.service";
import { connectSocket } from "@/services/socket.service";
import { ConversationListItem, ChatMessage } from "@/types";
import { formatTimeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";

export default function ChatsScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const data = await chatService.getConversations(token);
        setConversations(data);
      } catch {
        setConversations([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats])
  );

  useEffect(() => {
    if (!token || !user?.id) return;
    
    const socket = connectSocket(token);

    const handleNewMessage = (data: { chatId: string, message: ChatMessage }) => {
      const isMine = data.message.sender.id === user?.id;

      if (!isMine) {
        socket.emit("mark_delivered", { chatId: data.chatId, messageIds: [data.message.id] });
      }

      setConversations((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === data.chatId);
        
        if (existingIdx >= 0) {
          const updatedConversations = [...prev];
          const conv = { ...updatedConversations[existingIdx] };
          conv.lastMessage = {
            content: data.message.content,
            createdAt: data.message.createdAt,
            isMine: isMine,
          };
          conv.lastMessageAt = data.message.createdAt;
          
          updatedConversations.splice(existingIdx, 1);
          return [conv, ...updatedConversations].sort(
            (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
          );
        } else {
          // If conversation doesn't exist in list, fetch full list to get all product/user details
          loadChats();
          return prev;
        }
      });
    };

    const handleConversationCleared = (data: { conversationId: string }) => {
      setConversations((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === data.conversationId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], lastMessage: null };
          return updated;
        }
        return prev;
      });
    };

    const handleConversationDeleted = (data: { conversationId: string }) => {
      setConversations((prev) => prev.filter((c) => c.id !== data.conversationId));
    };

    socket.on("new_message", handleNewMessage);
    socket.on("conversation_cleared", handleConversationCleared);
    socket.on("conversation_deleted", handleConversationDeleted);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("conversation_cleared", handleConversationCleared);
      socket.off("conversation_deleted", handleConversationDeleted);
    };
  }, [token, user?.id, loadChats]);

  if (loading && conversations.length === 0) {
    return <LoadingState />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScreenHeader title="Chats" rightAction={<CartButton />} />

      <FlatList
        className="flex-1"
        data={conversations}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadChats(true)} />
        }
        contentContainerStyle={conversations.length === 0 ? { flexGrow: 1 } : { paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View className="ml-[76px] h-[0.5px] bg-line" />}
        renderItem={({ item }) => {
          const isUnread = item.lastMessage && !item.lastMessage.isMine; // Should use seenAt ideally, but basic check is fine
          return (
            <Pressable
              className="flex-row items-center bg-white px-4 py-3 active:bg-slate-50 active:opacity-70"
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <View className="relative h-14 w-14">
                {item.otherUser.profileImage ? (
                  <Image
                    source={{ uri: item.otherUser.profileImage }}
                    className="h-14 w-14 rounded-full bg-canvas"
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-canvas">
                    <Text className="text-[18px] font-semibold text-ink opacity-50">
                      {item.otherUser.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {item.productImage && (
                  <Image
                    source={{ uri: item.productImage }}
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-md border border-white bg-canvas shadow-sm"
                    contentFit="cover"
                  />
                )}
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-baseline justify-between">
                  <Text className="flex-1 text-[16px] font-semibold text-ink" numberOfLines={1}>
                    {item.otherUser.name}
                  </Text>
                  <Text className={cn("ml-2 text-[12px]", isUnread ? "font-semibold text-ink" : "text-muted")}>
                    {formatTimeAgo(item.lastMessageAt)}
                  </Text>
                </View>
                <Text className="text-[12px] text-muted" numberOfLines={1}>
                  {item.productTitle}
                </Text>
                <View className="mt-0.5 flex-row items-center justify-between">
                  <Text 
                    className={cn(
                      "flex-1 text-[13px]", 
                      isUnread ? "font-medium text-ink" : "text-ink/80"
                    )} 
                    numberOfLines={1}
                  >
                    {item.lastMessage
                      ? `${item.lastMessage.isMine ? "You: " : ""}${item.lastMessage.content}`
                      : "No messages yet"}
                  </Text>
                  {isUnread && (
                    <View className="ml-2 h-2 w-2 rounded-full bg-[#007AFF]" />
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState message="No conversations yet. Message a seller from a listing." />
        }
      />
    </SafeAreaView>
  );
}
