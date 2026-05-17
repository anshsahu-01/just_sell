import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/BrandMark";
import { CartButton } from "@/components/CartButton";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import * as categoryService from "@/services/category.service";
import { Category } from "@/types";
import { cn } from "@/utils/cn";

const SORT_OPTIONS = [
  { label: "Latest", value: "latest" as const },
  { label: "Low to high", value: "price_asc" as const },
  { label: "High to low", value: "price_desc" as const },
];

const CATEGORY_ICONS = [
  "grid-outline",
  "shirt-outline",
  "book-outline",
  "headset-outline",
  "game-controller-outline",
  "bag-handle-outline",
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"latest" | "price_asc" | "price_desc">("latest");
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");

  const { products, loading, refreshing, error, refetch, setFilters } = useProducts({
    sort: "latest",
    limit: 20,
  });

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const heroImage = products.find((product) => product.images?.[0])?.images?.[0];

  const categoryOptions = useMemo(
    () => [{ id: "all", name: "All" }, ...categories.slice(0, 5)],
    [categories]
  );

  const applyFilters = useCallback(
    (next: { searchText?: string; sortValue?: typeof sort; categoryId?: string }) => {
      const nextSearch = next.searchText ?? search;
      const nextSort = next.sortValue ?? sort;
      const nextCategoryId = next.categoryId ?? activeCategoryId;

      setFilters((prev) => ({
        ...prev,
        search: nextSearch.trim() || undefined,
        sort: nextSort,
        categoryId: nextCategoryId === "all" ? undefined : nextCategoryId,
      }));
    },
    [activeCategoryId, search, setFilters, sort]
  );

  const handleSearch = () => applyFilters({ searchText: search });

  const handleSortChange = (value: typeof sort) => {
    setSort(value);
    applyFilters({ sortValue: value });
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    applyFilters({ categoryId });
  };

  if (loading && products.length === 0) {
    return <LoadingState />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item, index }) => (
          <View
            style={{
              width: "48%",
              marginRight: index % 2 === 0 ? 12 : 0,
              marginBottom: 12,
            }}
          >
            <ProductCard product={item} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 12 }}
        ListHeaderComponent={
          <View className="pb-4">
            <View className="pb-4 pt-2">
              <View className="flex-row items-start justify-between">
                <Pressable className="h-10 w-10 items-center justify-center rounded-xl border border-line bg-white">
                  <Ionicons name="menu-outline" size={20} color="#111111" />
                </Pressable>
                <View className="flex-1 items-center px-3">
                  <BrandMark subtitle={user?.collegeName ?? "Campus marketplace"} />
                </View>
                <CartButton />
              </View>
            </View>

            <View className="pb-4">
              <View className="flex-row items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
                <Ionicons name="search-outline" size={18} color="#666666" />
                <TextInput
                  className="flex-1 text-[15px] text-ink"
                  placeholder="Search items"
                  placeholderTextColor="#666666"
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                <Pressable
                  onPress={handleSearch}
                  className="rounded-xl bg-ink px-4 py-2"
                >
                  <Text className="text-[13px] font-medium text-white">Search</Text>
                </Pressable>
              </View>
            </View>

            <View className="mb-5 overflow-hidden rounded-2xl bg-ink">
              {heroImage ? (
                <Image source={{ uri: heroImage }} className="h-[190px] w-full opacity-75" contentFit="cover" />
              ) : (
                <View className="h-[190px] w-full bg-ink" />
              )}
              <View className="absolute inset-0 justify-end p-5">
                <Text className="text-[28px] font-semibold text-white">Fresh campus finds</Text>
                <Text className="mt-2 max-w-[220px] text-[14px] leading-5 text-white/85">
                  Discover great deals from students around you.
                </Text>
                <Pressable className="mt-4 self-start rounded-full bg-white px-4 py-2">
                  <Text className="text-[13px] font-medium text-ink">Explore now</Text>
                </Pressable>
              </View>
            </View>

            <View className="mb-5">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-[18px] font-semibold text-ink">Categories</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 20 }}
              >
                {categoryOptions.map((category, index) => {
                  const active = activeCategoryId === category.id;
                  const iconName =
                    CATEGORY_ICONS[index] ?? CATEGORY_ICONS[CATEGORY_ICONS.length - 1];

                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => handleCategoryChange(category.id)}
                      className="items-center"
                    >
                      <View
                        className={cn(
                          "mb-2 h-12 w-12 items-center justify-center rounded-2xl border",
                          active ? "border-ink bg-ink" : "border-line bg-white"
                        )}
                      >
                        <Ionicons
                          name={iconName as never}
                          size={20}
                          color={active ? "#FFFFFF" : "#111111"}
                        />
                      </View>
                      <Text className={cn("text-[12px]", active ? "font-medium text-ink" : "text-muted")}>
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View className="mb-4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {SORT_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => handleSortChange(option.value)}
                    className={cn(
                      "rounded-full border px-4 py-2",
                      sort === option.value ? "border-ink bg-ink" : "border-line bg-white"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[13px]",
                        sort === option.value ? "text-white" : "text-muted"
                      )}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-[18px] font-semibold text-ink">Popular Products</Text>
              <Text className="text-[13px] text-muted">{products.length} items</Text>
            </View>

            {error ? (
              <View className="mt-4 rounded-2xl border border-line bg-white p-4">
                <Text className="text-[13px] text-danger">{error}</Text>
                <Pressable onPress={refetch}>
                  <Text className="mt-2 text-[13px] font-medium text-ink">Try again</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState message="No listings yet. Be the first to sell." />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
