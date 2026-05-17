import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartButton } from "@/components/CartButton";
import { LoadingState } from "@/components/LoadingState";
import { MyListingCard } from "@/components/MyListingCard";
import { ProductCard } from "@/components/ProductCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import * as productService from "@/services/product.service";
import { ApiError } from "@/services/api";
import { Product } from "@/types";
import { useFavoritesStore } from "@/store/favoritesStore";

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const favoriteProducts = useFavoritesStore((state) => state.products);
  const [active, setActive] = useState<Product[]>([]);
  const [sold, setSold] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const initials = useMemo(() => {
    const name = user?.name?.trim() ?? "";
    if (!name) return "JS";
    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [user?.name]);

  const loadListings = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const data = await productService.getMyProducts(token);
        setActive(data.active);
        setSold(data.sold);
      } catch {
        setActive([]);
        setSold([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings])
  );

  const handleMarkSold = async (productId: string) => {
    if (!token) return;
    try {
      await productService.updateProductStatus(productId, "SOLD", token);
      await loadListings(true);
    } catch (err) {
      Alert.alert(
        "Failed",
        err instanceof ApiError ? err.message : "Could not update status"
      );
    }
  };

  const handleDelete = async (productId: string) => {
    if (!token) return;
    try {
      await productService.deleteProduct(productId, token);
      await loadListings(true);
    } catch (err) {
      Alert.alert(
        "Failed",
        err instanceof ApiError ? err.message : "Could not delete listing"
      );
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScreenHeader title="Profile" rightAction={<CartButton />} />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadListings(true)} />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        <View className="items-center rounded-2xl border border-line bg-white px-5 py-6">
          {user?.profileImage ? (
            <Image
              source={{ uri: user.profileImage }}
              className="mb-4 h-20 w-20 rounded-full border border-line bg-white"
              contentFit="cover"
            />
          ) : (
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border border-line bg-white">
              <Text className="text-[24px] font-semibold text-ink">{initials}</Text>
            </View>
          )}
          <Text className="text-[22px] font-semibold text-ink">{user?.name}</Text>
          <Text className="mt-1 text-[14px] text-muted">{user?.email}</Text>
          {user?.collegeName ? (
            <Text className="mt-1 text-[13px] text-muted">{user.collegeName}</Text>
          ) : null}
          <View className="mt-4 rounded-full border border-line px-4 py-2">
            <Text className="text-[13px] text-muted">
              {user?.isVerified ? "Verified account" : "Standard account"}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-line bg-white p-4">
            <Text className="text-[13px] text-muted">Active</Text>
            <Text className="mt-2 text-[24px] font-semibold text-ink">{active.length}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-line bg-white p-4">
            <Text className="text-[13px] text-muted">Sold</Text>
            <Text className="mt-2 text-[24px] font-semibold text-ink">{sold.length}</Text>
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-line bg-white">
          {[
            { icon: "bag-handle-outline", title: "My listings", value: `${active.length} active` },
            { icon: "archive-outline", title: "Sold archive", value: `${sold.length} sold` },
            { icon: "heart-outline", title: "Favourites", value: `${favoriteProducts.length} saved` },
          ].map((item, index) => (
            <View key={item.title}>
              <View className="flex-row items-center gap-3 px-4 py-4">
                <Ionicons name={item.icon as never} size={18} color="#111111" />
                <View className="flex-1">
                  <Text className="text-[15px] font-medium text-ink">{item.title}</Text>
                  <Text className="mt-1 text-[13px] text-muted">{item.value}</Text>
                </View>
              </View>
              {index < 2 ? <View className="mx-4 h-px bg-line" /> : null}
            </View>
          ))}
        </View>

        <View className="mt-4">
          <Text className="mb-3 text-[18px] font-semibold text-ink">My listings</Text>
          <View className="overflow-hidden rounded-2xl border border-line bg-white">
            <Text className="border-b border-line px-4 py-3 text-[13px] font-medium text-muted">
              Active ({active.length})
            </Text>
            {active.length === 0 ? (
              <Text className="px-4 py-5 text-[14px] text-muted">No active listings</Text>
            ) : (
              active.map((product) => (
                <MyListingCard
                  key={product.id}
                  product={product}
                  onEdit={() => router.push(`/product/edit/${product.id}`)}
                  showMarkSold
                  onMarkSold={() => handleMarkSold(product.id)}
                  onDelete={() => handleDelete(product.id)}
                />
              ))
            )}
          </View>
        </View>

        <View className="mt-4">
          <View className="overflow-hidden rounded-2xl border border-line bg-white">
            <Text className="border-b border-line px-4 py-3 text-[13px] font-medium text-muted">
              Sold ({sold.length})
            </Text>
            {sold.length === 0 ? (
              <Text className="px-4 py-5 text-[14px] text-muted">No sold listings</Text>
            ) : (
              sold.map((product) => (
                <MyListingCard
                  key={product.id}
                  product={product}
                  onEdit={() => router.push(`/product/edit/${product.id}`)}
                  showMarkSold={false}
                  onDelete={() => handleDelete(product.id)}
                />
              ))
            )}
          </View>
        </View>

        <View className="mt-4">
          <Text className="mb-3 text-[18px] font-semibold text-ink">Favourites</Text>
          {favoriteProducts.length === 0 ? (
            <View className="rounded-2xl border border-line bg-white p-4">
              <Text className="text-[14px] text-muted">No favourites yet.</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {favoriteProducts.map((product, index) => (
                <View
                  key={product.id}
                  style={{
                    width: "48%",
                    marginRight: index % 2 === 0 ? 12 : 0,
                    marginBottom: 12,
                  }}
                >
                  <ProductCard product={product} />
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={logout}
          className="mt-4 h-12 items-center justify-center rounded-2xl border border-line bg-white"
        >
          <Text className="text-[15px] font-medium text-danger">Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
