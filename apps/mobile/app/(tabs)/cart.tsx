import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/utils/format";

export default function CartScreen() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScreenHeader title="My Cart" showBack />

      {items.length === 0 ? (
        <EmptyState message="Your cart is empty right now." />
      ) : (
        <>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 180 }}>
            {items.map((item) => (
              <View key={item.productId} className="mb-4 rounded-2xl border border-line bg-white p-3">
                <View className="flex-row gap-3">
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      className="h-20 w-20 rounded-xl bg-white"
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-20 w-20 rounded-xl border border-line bg-white" />
                  )}

                  <View className="flex-1 justify-between">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <Text className="text-[15px] font-medium leading-5 text-ink" numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text className="mt-1 text-[13px] text-muted">
                          Seller: {item.sellerName}
                        </Text>
                      </View>
                      <Pressable onPress={() => void removeItem(item.productId)}>
                        <Ionicons name="close-circle-outline" size={20} color="#FF4C3B" />
                      </Pressable>
                    </View>

                    <View className="mt-3 flex-row items-center justify-between">
                      <Text className="text-[18px] font-semibold text-ink">
                        {formatPrice(item.price)}
                      </Text>
                      <Text className="text-[13px] text-muted">Qty: {item.quantity}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-white p-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[15px] text-muted">Subtotal</Text>
              <Text className="text-[16px] font-medium text-ink">{formatPrice(subtotal)}</Text>
            </View>
            <View className="mb-4 h-px bg-line" />
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-semibold text-ink">Total</Text>
              <Text className="text-[18px] font-semibold text-ink">{formatPrice(total)}</Text>
            </View>
            <Pressable
              onPress={() => router.push("/checkout")}
              className="h-12 items-center justify-center rounded-2xl bg-ink"
            >
              <Text className="text-[15px] font-medium text-white">Checkout</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
