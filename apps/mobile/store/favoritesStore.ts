import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { Product } from "@/types";

const FAVORITES_STORAGE_KEY = "just_sell_favorites";

type FavoritesState = {
  products: Product[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  toggleFavorite: (product: Product) => Promise<boolean>;
  isFavorite: (productId: string) => boolean;
};

async function persistProducts(products: Product[]) {
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(products));
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  products: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      const products = raw ? (JSON.parse(raw) as Product[]) : [];
      set({ products, isHydrated: true });
    } catch {
      set({ products: [], isHydrated: true });
    }
  },

  toggleFavorite: async (product) => {
    const exists = get().products.some((item) => item.id === product.id);
    const nextProducts = exists
      ? get().products.filter((item) => item.id !== product.id)
      : [product, ...get().products.filter((item) => item.id !== product.id)];

    set({ products: nextProducts });
    await persistProducts(nextProducts);
    return !exists;
  },

  isFavorite: (productId) => get().products.some((item) => item.id === productId),
}));
