import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCartStore } from "@/store/cartStore";

export function CartButton() {
  const badgeCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  return (
    <Pressable
      onPress={() => router.push("/cart")}
      className="relative h-10 w-10 items-center justify-center rounded-xl border border-line bg-white"
    >
      <Ionicons name="cart-outline" size={19} color="#111111" />
      {badgeCount > 0 ? (
        <View className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-danger px-1 py-[1px]">
          <Text className="text-center text-[10px] font-semibold text-white">{badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
