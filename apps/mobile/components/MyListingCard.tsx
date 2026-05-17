import { Alert, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Product } from "@/types";
import { formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";

type MyListingCardProps = {
  product: Product;
  onEdit?: () => void;
  onMarkSold?: () => void;
  onDelete?: () => void;
  showMarkSold?: boolean;
};

export function MyListingCard({
  product,
  onEdit,
  onMarkSold,
  onDelete,
  showMarkSold = true,
}: MyListingCardProps) {
  const imageUri = product.images?.[0];
  const isSold = product.status === "SOLD" || product.isSold;

  const confirmDelete = () => {
    Alert.alert("Delete listing", `Remove "${product.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  const confirmMarkSold = () => {
    Alert.alert("Mark as sold", `Mark "${product.title}" as sold?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Mark sold", onPress: onMarkSold },
    ]);
  };

  return (
    <View
      className={cn(
        "border-b border-line bg-white p-3",
        isSold && "opacity-70"
      )}
    >
      <Pressable
        className="flex-row gap-3"
        onPress={() => router.push(`/product/${product.id}`)}
      >
        <View className="relative">
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              className="h-[72px] w-[72px] rounded bg-canvas"
              contentFit="cover"
            />
          ) : (
            <View className="h-[72px] w-[72px] rounded bg-canvas" />
          )}
          {isSold ? (
            <View className="absolute left-1 top-1 rounded bg-ink px-1 py-0.5">
              <Text className="text-[9px] font-bold text-white">SOLD</Text>
            </View>
          ) : null}
        </View>
        <View className="flex-1 justify-center">
          <Text className="text-[15px] font-bold text-ink">
            {formatPrice(product.price)}
          </Text>
          <Text className="text-[14px] text-ink" numberOfLines={2}>
            {product.title}
          </Text>
        </View>
      </Pressable>

      <View className="mt-2 flex-row gap-2">
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            className="flex-1 items-center rounded border border-line py-2"
          >
            <Text className="text-[13px] font-medium text-ink">Edit</Text>
          </Pressable>
        ) : null}
        {showMarkSold && !isSold && onMarkSold ? (
          <Pressable
            onPress={confirmMarkSold}
            className="flex-1 items-center rounded border border-line py-2"
          >
            <Text className="text-[13px] font-medium text-ink">Mark sold</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable
            onPress={confirmDelete}
            className="flex-1 items-center rounded border border-line py-2"
          >
            <Text className="text-[13px] font-medium text-danger">Delete</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
