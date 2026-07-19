import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  productId: string;
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  toggleItem: (productId: string) => void;
  hasItem: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (productId) => {
        if (!get().hasItem(productId)) {
          set((state) => ({
            items: [...state.items, { productId, addedAt: new Date().toISOString() }],
          }));
        }
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },
      toggleItem: (productId) => {
        if (get().hasItem(productId)) {
          get().removeItem(productId);
        } else {
          get().addItem(productId);
        }
      },
      hasItem: (productId) => {
        return get().items.some((item) => item.productId === productId);
      },
      clearWishlist: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'storefront-wishlist-storage',
    }
  )
);
