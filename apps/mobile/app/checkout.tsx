import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View, Image as RNImage } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenHeader } from "@/components/ScreenHeader";
import * as productService from "@/services/product.service";
import * as orderService from "@/services/order.service";
import { ApiError } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/store/cartStore";
import { Product } from "@/types";
import { formatPrice } from "@/utils/format";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";

const PAYMENT_OPTIONS = ["Online Payment", "Cash on Delivery"];

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{
    subtotal?: string;
    shipping?: string;
    total?: string;
    items?: string;
    productId?: string;
    title?: string;
    price?: string;
    image?: string;
    sellerId?: string;
  }>();
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_OPTIONS[0]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const router = useRouter();
  const { token } = useAuth();
  const removeItemFromCart = useCartStore((state) => state.removeItem);

  useEffect(() => {
    async function loadCheckoutProduct() {
      if (!params.productId) {
        setError("No product selected for checkout.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await productService.getProductById(params.productId);
        setProduct(data);
      } catch (err) {
        setProduct(null);
        setError(err instanceof Error ? err.message : "Could not load selected product.");
      } finally {
        setLoading(false);
      }
    }

    loadCheckoutProduct();
  }, [params.productId]);

  const handlePlaceOrder = async (method: "COD" | "UPI") => {
    if (!token || !checkoutData.productId) return;
    try {
      setOrderLoading(true);
      await orderService.createOrder(checkoutData.productId, method, token);
      await removeItemFromCart(checkoutData.productId);
      Alert.alert("Success", "Order placed successfully!");
      router.push("/(tabs)/profile");
    } catch (err) {
      Alert.alert(
        "Order failed",
        err instanceof ApiError ? err.message : "Could not place order"
      );
    } finally {
      setOrderLoading(false);
    }
  };

  const copyUpiId = async () => {
    await Clipboard.setStringAsync("9109185454-2@axl");
    Alert.alert("Copied", "UPI ID copied to clipboard");
  };

  const openUpiApp = async () => {
    const url = `upi://pay?pa=9109185454-2@axl&pn=Becho&am=${checkoutData.total}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "No UPI app found on this device.");
    }
  };

  const checkoutData = useMemo(() => {
    const selectedProduct = product;
    const price = selectedProduct?.price ?? Number(params.price ?? 0);
    const shipping = 0;
    const subtotal = price;
    const total = subtotal + shipping;

    return {
      productId: selectedProduct?.id ?? params.productId ?? "",
      title: selectedProduct?.title ?? params.title ?? "",
      image: selectedProduct?.images?.[0] ?? params.image ?? "",
      sellerName: selectedProduct?.seller?.name ?? "Unknown seller",
      sellerId: selectedProduct?.userId ?? params.sellerId ?? "",
      subtotal,
      shipping,
      total,
      quantity: 1,
    };
  }, [params.image, params.price, params.productId, params.sellerId, params.title, product]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !checkoutData.productId || !checkoutData.title) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <ScreenHeader title="Checkout" showBack />
        <EmptyState message={error || "No product selected for checkout."} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScreenHeader title="Checkout" showBack />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <View className="rounded-2xl border border-line bg-white p-4">
          <Text className="text-[18px] font-semibold text-ink">Order details</Text>
          <Text className="mt-2 text-[14px] text-muted">
            1 item selected for checkout.
          </Text>
        </View>

        <View className="mt-4 rounded-2xl border border-line bg-white p-4">
          <Text className="mb-3 text-[16px] font-semibold text-ink">Selected product</Text>
          <View className="flex-row gap-3">
            {checkoutData.image ? (
              <Image
                source={{ uri: checkoutData.image }}
                className="h-20 w-20 rounded-xl bg-white"
                contentFit="cover"
              />
            ) : (
              <View className="h-20 w-20 rounded-xl border border-line bg-white" />
            )}
            <View className="flex-1 justify-center">
              <Text className="text-[15px] font-medium text-ink" numberOfLines={2}>
                {checkoutData.title}
              </Text>
              <Text className="mt-2 text-[16px] font-semibold text-ink">
                {formatPrice(checkoutData.subtotal)}
              </Text>
              <Text className="mt-1 text-[13px] text-muted" numberOfLines={1}>
                Seller: {checkoutData.sellerName}
              </Text>
              <Text className="mt-1 text-[12px] text-faint">
                Quantity: {checkoutData.quantity}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-line bg-white p-4">
          <Text className="text-[16px] font-semibold text-ink">Payment method</Text>
          <View className="mt-3">
            {PAYMENT_OPTIONS.map((option, index) => {
              const active = paymentMethod === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => setPaymentMethod(option)}
                  className="flex-row items-center justify-between rounded-2xl border border-line px-4 py-3"
                  style={{ marginBottom: index === PAYMENT_OPTIONS.length - 1 ? 0 : 10 }}
                >
                  <Text className="text-[14px] text-ink">{option}</Text>
                  <View
                    className={
                      active
                        ? "h-4 w-4 rounded-full bg-danger"
                        : "h-4 w-4 rounded-full border border-line"
                    }
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-line bg-white p-4">
          <Text className="mb-3 text-[16px] font-semibold text-ink">Summary</Text>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[14px] text-muted">Subtotal</Text>
            <Text className="text-[14px] text-ink">{formatPrice(checkoutData.subtotal)}</Text>
          </View>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[14px] text-muted">Shipping</Text>
            <Text className="text-[14px] text-ink">{formatPrice(checkoutData.shipping)}</Text>
          </View>
          <View className="my-3 h-px bg-line" />
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[16px] font-semibold text-ink">Total</Text>
            <Text className="text-[16px] font-semibold text-ink">{formatPrice(checkoutData.total)}</Text>
          </View>
          {paymentMethod === "Online Payment" ? (
            <View className="mt-2 rounded-xl bg-[#F8F9FA] p-4">
              <View className="items-center">
                <RNImage
                  source={require("../assets/payments/upi-qr.jpeg")}
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                  resizeMode="contain"
                />
                <Text className="text-[14px] text-muted">Scan to pay</Text>
                <Text className="mt-1 text-[16px] font-semibold text-ink">9109185454-2@axl</Text>
              </View>
              <View className="mt-4 flex-row gap-2">
                <Pressable
                  onPress={copyUpiId}
                  className="h-10 flex-1 items-center justify-center rounded-xl border border-line bg-white"
                >
                  <Text className="text-[13px] font-medium text-ink">Copy UPI ID</Text>
                </Pressable>
                <Pressable
                  onPress={openUpiApp}
                  className="h-10 flex-1 items-center justify-center rounded-xl border border-line bg-white"
                >
                  <Text className="text-[13px] font-medium text-ink">Open App</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => handlePlaceOrder("UPI")}
                disabled={orderLoading}
                className={`mt-3 h-12 items-center justify-center rounded-xl bg-ink ${orderLoading ? "opacity-70" : ""}`}
              >
                <Text className="text-[15px] font-medium text-white">
                  {orderLoading ? "Processing..." : "I Have Paid"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => handlePlaceOrder("COD")}
              disabled={orderLoading}
              className={`h-12 items-center justify-center rounded-xl bg-ink ${orderLoading ? "opacity-70" : ""}`}
            >
              <Text className="text-[15px] font-medium text-white">
                {orderLoading ? "Processing..." : "Place order"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
