import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/LoadingState";
import { useCartStore } from "@/store/cartStore";
import { useFavoritesStore } from "@/store/favoritesStore";

export default function RootLayout() {
  const { hydrate, isHydrated } = useAuth();
  const hydrateCart = useCartStore((state) => state.hydrate);
  const hydrateFavorites = useFavoritesStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
    hydrateCart();
    hydrateFavorites();
  }, [hydrate, hydrateCart, hydrateFavorites]);

  if (!isHydrated) {
    return <LoadingState />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="product/edit/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="checkout"
          options={{ headerShown: false, presentation: "card" }}
        />
      </Stack>
    </>
  );
}
