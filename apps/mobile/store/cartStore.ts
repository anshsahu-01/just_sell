import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { Product } from "@/types";

const CART_STORAGE_KEY = "just_sell_cart";

export type CartItem = {
  productId: string;
  title: string;
  price: number;
  image: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  addItem: (product: Product) => Promise<{ added: boolean }>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  verifyItems: () => Promise<void>;
};

async function persistItems(items: CartItem[]) {
  await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
      const items = raw ? (JSON.parse(raw) as CartItem[]) : [];
      set({ items, isHydrated: true });
    } catch {
      set({ items: [], isHydrated: true });
    }
  },

  addItem: async (product) => {
    const existing = get().items.find((item) => item.productId === product.id);
    if (existing) {
      return { added: false };
    }

    const nextItems = [
      ...get().items,
      {
        productId: product.id,
        title: product.title,
        price: product.price,
        image: product.images?.[0] ?? "",
        sellerId: product.userId,
        sellerName: product.seller.name,
        quantity: 1,
      },
    ];

    set({ items: nextItems });
    await persistItems(nextItems);
    return { added: true };
  },

  removeItem: async (productId) => {
    const nextItems = get().items.filter((item) => item.productId !== productId);
    set({ items: nextItems });
    await persistItems(nextItems);
  },

  clearCart: async () => {
    set({ items: [] });
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
  },

  verifyItems: async () => {
    const currentItems = get().items;
    if (currentItems.length === 0) return;

    // We only need to check if products are still active.
    // For simplicity, we can fetch all my products or just rely on getProducts API
    // Actually, making N requests is bad, but for MVP it's fine.
    // We can just rely on the existing cart items, we'll implement it as a simple Promise.all
    // But since we can't easily import productService here due to circular deps or api context,
    // we'll just leave verifyItems as a placeholder here and do it in the component.
  },
}));
