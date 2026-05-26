import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View, Image as RNImage, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Input } from "@/components/Input";
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
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const [mobileNumber, setMobileNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const { token } = useAuth();
  const removeItemFromCart = useCartStore((state) => state.removeItem);
  const UPLOAD_STORAGE_KEY = "just_sell_upi_proof";

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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const trimmedMobile = mobileNumber.trim();
    const trimmedAddress = deliveryAddress.trim();
    const trimmedUtr = utrNumber.trim();

    if (!trimmedMobile) {
      errors.mobileNumber = "Mobile number is required";
    } else if (!/^\d+$/.test(trimmedMobile)) {
      errors.mobileNumber = "Mobile number must contain digits only";
    } else if (trimmedMobile.length < 10) {
      errors.mobileNumber = "Mobile number must be at least 10 digits";
    }

    if (!trimmedAddress) {
      errors.deliveryAddress = paymentMethod === "Cash on Delivery"
        ? "Pickup location is required"
        : "Delivery address is required";
    }

    if (paymentMethod === "Online Payment") {
      if (!trimmedUtr) {
        errors.utrNumber = "UTR number is required";
      }
      if (!paymentScreenshot) {
        errors.paymentScreenshot = "Payment screenshot is required";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveUpiProofLocally = async () => {
    try {
      const payload = {
        productId: checkoutData.productId,
        utrNumber: utrNumber.trim(),
        paymentScreenshot,
        paymentStatus: "verification_pending",
        createdAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(`${UPLOAD_STORAGE_KEY}:${checkoutData.productId}`, JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to save UPI proof locally", err);
    }
  };

  const pickPaymentScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your photo library to upload the payment screenshot.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const selected = result.assets[0];
      setPaymentScreenshot(selected.uri);
      if (validationErrors.paymentScreenshot) {
        setValidationErrors((prev) => ({ ...prev, paymentScreenshot: "" }));
      }
    }
  };

  const handlePlaceOrder = async (method: "COD" | "UPI") => {
    if (!token || !checkoutData.productId) return;

    if (!validateForm()) {
      return;
    }

    try {
      setOrderLoading(true);
      const trimmedMobile = mobileNumber.trim();
      const trimmedAddress = deliveryAddress.trim();
      await orderService.createOrder(
        checkoutData.productId,
        method,
        trimmedMobile,
        trimmedAddress,
        token,
        method === "UPI"
          ? {
              utrNumber: utrNumber.trim(),
              paymentScreenshot: paymentScreenshot ?? undefined,
              paymentStatus: "verification_pending",
            }
          : undefined
      );

      if (method === "UPI") {
        await saveUpiProofLocally();
      }

      await removeItemFromCart(checkoutData.productId);
      Alert.alert(
        "Success",
        method === "UPI"
          ? "Order placed successfully! UPI proof is saved locally and pending verification."
          : "Order placed successfully!"
      );
      router.push("/(tabs)/profile");
    } catch (err) {
      Alert.alert(
        "Order failed",
        err instanceof ApiError
          ? err.message
          : "Could not place order"
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
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
          <Text className="mb-3 text-[16px] font-semibold text-ink">Delivery details</Text>
          <Input
            label="Mobile Number"
            placeholder="Enter 10-digit mobile number"
            value={mobileNumber}
            onChangeText={(text) => {
              setMobileNumber(text);
              if (validationErrors.mobileNumber) {
                setValidationErrors((prev) => ({ ...prev, mobileNumber: "" }));
              }
            }}
            keyboardType="numeric"
            maxLength={15}
            error={validationErrors.mobileNumber}
          />
          <Input
            label={paymentMethod === "Cash on Delivery" ? "Pickup Location" : "Delivery Address"}
            placeholder={paymentMethod === "Cash on Delivery" ? "Enter pickup location" : "Enter delivery address"}
            value={deliveryAddress}
            onChangeText={(text) => {
              setDeliveryAddress(text);
              if (validationErrors.deliveryAddress) {
                setValidationErrors((prev) => ({ ...prev, deliveryAddress: "" }));
              }
            }}
            multiline={true}
            numberOfLines={3}
            inputClassName="h-20 py-2"
            style={{ textAlignVertical: "top" }}
            error={validationErrors.deliveryAddress}
          />
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
              <View className="mt-4">
                <Input
                  label="UTR Number"
                  placeholder="Enter transaction UTR number"
                  value={utrNumber}
                  onChangeText={(text) => {
                    setUtrNumber(text);
                    if (validationErrors.utrNumber) {
                      setValidationErrors((prev) => ({ ...prev, utrNumber: "" }));
                    }
                  }}
                  error={validationErrors.utrNumber}
                />
                <View className="mt-4">
                  <Text className="mb-2 text-[14px] text-ink">Payment screenshot</Text>
                  {paymentScreenshot ? (
                    <View className="rounded-2xl border border-line bg-white p-2">
                      <Image
                        source={{ uri: paymentScreenshot }}
                        className="h-40 w-full rounded-xl"
                        contentFit="cover"
                      />
                      <Pressable
                        onPress={pickPaymentScreenshot}
                        className="mt-3 h-12 items-center justify-center rounded-xl border border-line bg-white"
                      >
                        <Text className="text-[13px] font-medium text-ink">Change screenshot</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={pickPaymentScreenshot}
                      className="h-40 items-center justify-center rounded-2xl border border-dashed border-line bg-white"
                    >
                      <Text className="text-[14px] text-muted">Tap to upload screenshot</Text>
                    </Pressable>
                  )}
                  {validationErrors.paymentScreenshot ? (
                    <Text className="mt-2 text-[13px] text-danger">{validationErrors.paymentScreenshot}</Text>
                  ) : null}
                </View>
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
                disabled={orderLoading || !utrNumber.trim() || !paymentScreenshot}
                className={`mt-3 h-12 items-center justify-center rounded-xl bg-ink ${orderLoading || !utrNumber.trim() || !paymentScreenshot ? "opacity-50" : ""}`}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
