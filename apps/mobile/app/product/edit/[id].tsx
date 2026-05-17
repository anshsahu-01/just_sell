import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartButton } from "@/components/CartButton";
import { ListingForm } from "@/components/ListingForm";
import { LoadingState } from "@/components/LoadingState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import * as productService from "@/services/product.service";
import { Product } from "@/types";

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      setError("");
      const data = await productService.getProductById(id);
      setProduct(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const initialValues = useMemo(() => {
    if (!product) return undefined;
    return {
      title: product.title,
      description: product.description,
      price: String(product.price),
      condition: product.condition,
      categoryId: product.categoryId,
      images: product.images,
    };
  }, [product]);

  const handleSubmit = async (values: {
    title: string;
    description: string;
    price: string;
    condition: string;
    categoryId: string;
    images: string[];
  }) => {
    if (!token || !product) return;

    try {
      setSaving(true);
      setError("");
      const existingImages = values.images.filter((uri) => uri.startsWith("http"));
      const imageUris = values.images.filter((uri) => !uri.startsWith("http"));

      await productService.updateProduct(
        product.id,
        {
          title: values.title,
          description: values.description,
          price: values.price,
          condition: values.condition,
          categoryId: values.categoryId,
          imageUris,
          existingImages,
        },
        token
      );

      Alert.alert("Updated", "Your listing was updated.", [
        { text: "OK", onPress: () => router.replace(`/product/${product.id}`) },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update listing");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error && !product) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <ScreenHeader title="Edit product" showBack rightAction={<CartButton />} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[14px] text-muted">{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product || user?.id !== product.userId) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <ScreenHeader title="Edit product" showBack rightAction={<CartButton />} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[14px] text-muted">
            You are not allowed to edit this listing.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScreenHeader title="Edit product" showBack rightAction={<CartButton />} />
      <ScrollView contentContainerClassName="p-4 pb-10" keyboardShouldPersistTaps="handled">
        <ListingForm
          initialValues={initialValues}
          submitLabel="Save changes"
          loading={saving}
          error={error}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
