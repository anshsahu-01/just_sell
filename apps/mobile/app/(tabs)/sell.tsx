import { Alert, ScrollView } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartButton } from "@/components/CartButton";
import { ListingForm } from "@/components/ListingForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import * as productService from "@/services/product.service";
import { ApiError } from "@/services/api";
import { useState } from "react";

export default function SellScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (values: {
    title: string;
    description: string;
    price: string;
    condition: string;
    categoryId: string;
    images: string[];
  }) => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");
      await productService.createProduct(
        {
          title: values.title,
          description: values.description,
          price: values.price,
          condition: values.condition,
          categoryId: values.categoryId,
          imageUris: values.images,
        },
        token
      );
      Alert.alert("Listed", "Your item is now live.", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to list item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScreenHeader title="Sell an item" rightAction={<CartButton />} />

      <ScrollView contentContainerClassName="p-4 pb-10" keyboardShouldPersistTaps="handled">
        <ListingForm
          submitLabel="Post listing"
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
