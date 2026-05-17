import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "@/types";
import { formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useFavoritesStore } from "@/store/favoritesStore";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const imageUri = product.images?.[0];
  const isSold = product.status === "SOLD" || product.isSold;
  const isFavorite = useFavoritesStore((state) => state.isFavorite(product.id));
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  return (
    <Pressable
      style={{ width: "100%" }}
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-white",
        isSold && "opacity-60"
      )}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={{ width: "100%", height: 154 }} className="relative bg-white">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-white">
            <Text className="text-[13px] text-faint">No photo</Text>
          </View>
        )}

        <Pressable
          onPress={() => void toggleFavorite(product)}
          className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full border border-line bg-white"
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={15}
            color={isFavorite ? "#FF4C3B" : "#111111"}
          />
        </Pressable>

        {isSold ? (
          <View className="absolute left-3 top-3 rounded-full bg-danger px-2.5 py-1">
            <Text className="text-[10px] font-semibold text-white">SOLD</Text>
          </View>
        ) : null}
      </View>

      <View className="p-3">
        <Text className="text-[15px] font-semibold leading-5 text-ink" numberOfLines={2}>
          {product.title}
        </Text>
        <Text className="mt-2 text-[15px] font-semibold text-ink">{formatPrice(product.price)}</Text>
        <Text className="mt-1 text-[13px] text-muted" numberOfLines={1}>
          {product.category?.name ?? "Uncategorized"}
        </Text>
        {product.seller?.name ? (
          <Text className="mt-1 text-[12px] text-faint" numberOfLines={1}>
            {product.seller.name}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
