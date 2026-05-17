import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { CartButton } from "@/components/CartButton";
import { LoadingState } from "@/components/LoadingState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SellerRow } from "@/components/SellerRow";
import { useAuth } from "@/hooks/useAuth";
import * as chatService from "@/services/chat.service";
import * as productService from "@/services/product.service";
import { ApiError } from "@/services/api";
import { Product } from "@/types";
import { formatDate, formatPrice } from "@/utils/format";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      setError("");
      const data = await productService.getProductById(id);
      setProduct(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const currentUserId = user?.id ?? null;
  const sellerId = product?.userId ?? null;
  const isOwner = currentUserId != null && sellerId != null && currentUserId === sellerId;
  const isSold = product?.status === "SOLD" || product?.isSold === true;

  useEffect(() => {
    if (!product) return;

    console.log("[BuyNow Debug]", {
      currentUserId,
      sellerId,
      productStatus: product.status,
      isOwner,
      isSold,
    });
  }, [currentUserId, isOwner, isSold, product, sellerId]);

  const showActionBar = useMemo(
    () => Boolean(product && token && !isOwner && !isSold),
    [product, token, isOwner, isSold]
  );

  const handleChat = async () => {
    if (!product || !token || isOwner) return;
    try {
      setChatLoading(true);
      const conversation = await chatService.createConversation(product.id, token);
      router.push(`/chat/${conversation.id}`);
    } catch (err) {
      Alert.alert(
        "Chat failed",
        err instanceof ApiError ? err.message : "Could not start chat"
      );
    } finally {
      setChatLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (!product || !showActionBar) return;

    router.push({
      pathname: "/checkout",
      params: {
        productId: product.id,
        title: product.title,
        price: String(product.price),
        image: product.images?.[0] ?? "",
        sellerId: product.userId,
        items: "1",
        subtotal: String(product.price),
        shipping: "0",
        total: String(product.price),
      },
    });
  };

  if (loading) return <LoadingState />;

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScreenHeader title="Item" showBack />
        <View className="flex-1 items-center justify-center">
          <Text className="text-[15px] text-muted">{error || "Product not found"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScreenHeader title="Item" showBack rightAction={<CartButton count={1} />} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: showActionBar ? 96 : 16 }}>
        <View className="relative">
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {product.images.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width, height: 280 }}
                className="bg-white"
                contentFit="cover"
              />
            ))}
          </ScrollView>
          {isSold ? (
            <View className="absolute left-4 top-4 rounded-full bg-danger px-3 py-1">
              <Text className="text-[10px] font-medium text-white">SOLD</Text>
            </View>
          ) : null}
        </View>

        <View className="m-4 rounded-2xl border border-line bg-white p-4">
          <Text className="mb-2 text-[24px] font-semibold text-ink">{formatPrice(product.price)}</Text>
          <Text className="mb-3 text-[20px] font-semibold leading-[26px] text-ink">
            {product.title}
          </Text>

          <View className="mb-2 flex-row flex-wrap gap-2">
            <Text className="rounded-full border border-line px-3 py-1 text-[13px] text-muted">
              {product.category.name}
            </Text>
            <Text className="rounded-full border border-line px-3 py-1 text-[13px] text-muted">
              {product.condition}
            </Text>
          </View>

          <Text className="text-[13px] text-faint">
            Posted {formatDate(product.createdAt)}
          </Text>

          <View className="my-4 h-px bg-line" />

          <Text className="mb-2 text-[15px] font-medium text-ink">Description</Text>
          <Text className="text-[15px] leading-[22px] text-ink">{product.description}</Text>
        </View>

        <View className="mx-4 mb-4 overflow-hidden rounded-2xl border border-line bg-white">
          <SellerRow seller={product.seller} />
        </View>
      </ScrollView>

      {showActionBar ? (
        <View className="border-t border-line bg-white p-3">
          <View className="flex-row gap-3">
            <Button
              title="Message seller"
              onPress={handleChat}
              loading={chatLoading}
              variant="outline"
              className="h-12 flex-1 rounded-2xl"
            />
            <Button
              title="Buy Now"
              onPress={handleBuyNow}
              className="h-12 flex-1 rounded-2xl"
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
