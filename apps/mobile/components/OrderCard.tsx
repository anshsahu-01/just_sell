import { Alert, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Order, PaymentStatus } from "@/types";
import { formatDate, formatPrice } from "@/utils/format";

type OrderCardProps = {
  order: Order;
  isSeller?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
};

export function OrderCard({ order, isSeller, onConfirm, onCancel, loading }: OrderCardProps) {
  const isPending = order.paymentStatus === "payment_pending";

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "payment_pending":
        return "text-warning";
      case "confirmed":
        return "text-success";
      case "cancelled":
        return "text-danger";
      default:
        return "text-muted";
    }
  };

  return (
    <View className="flex-row items-center gap-3 border-b border-line p-4 last:border-b-0">
      {order.product.images?.[0] ? (
        <Image
          source={{ uri: order.product.images[0] }}
          className="h-16 w-16 rounded-xl bg-white"
          contentFit="cover"
        />
      ) : (
        <View className="h-16 w-16 rounded-xl border border-line bg-white" />
      )}
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-ink" numberOfLines={1}>
          {order.product.title}
        </Text>
        <Text className="mt-1 text-[13px] text-muted">
          {formatDate(order.createdAt)} • {order.paymentMethod}
        </Text>
        <Text className={`mt-1 text-[13px] font-medium capitalize ${getStatusColor(order.paymentStatus)}`}>
          {order.paymentStatus.replace("_", " ")}
        </Text>
      </View>
      <View className="items-end justify-center">
        <Text className="text-[16px] font-semibold text-ink">{formatPrice(order.amount)}</Text>
      </View>
      {isSeller && isPending ? (
        <View className="ml-2 gap-2">
          <Pressable
            onPress={onConfirm}
            disabled={loading}
            className={`items-center justify-center rounded-lg bg-success px-3 py-1.5 ${loading ? "opacity-50" : ""}`}
          >
            <Text className="text-[12px] font-medium text-white">Confirm</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            disabled={loading}
            className={`items-center justify-center rounded-lg border border-danger px-3 py-1.5 ${loading ? "opacity-50" : ""}`}
          >
            <Text className="text-[12px] font-medium text-danger">Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
