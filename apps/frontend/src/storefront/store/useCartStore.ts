import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  calculateVolumeDiscountPricing,
  type VolumeDiscountTier,
} from "../utils/volumeDiscounts";

export const DEFAULT_STOREFRONT_CART_STORAGE_NAME = "sf-cart-storage";
export const getStorefrontPreviewCartStorageName = (previewThemeId: string) =>
  `${DEFAULT_STOREFRONT_CART_STORAGE_NAME}:preview:${previewThemeId}`;

type ImageLike = {
  fullUrl?: string;
  url?: string;
};

type CartItemIdentityInput = {
  id?: string | null;
  productId?: string | null;
  variantId?: string | null;
  attributes?: Record<string, string> | null;
};

const normalizeCartImageUrl = (value: string | ImageLike | undefined) => {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return value.fullUrl || value.url || "";
  }

  return "";
};

export const buildCartItemId = (item: CartItemIdentityInput): string => {
  const explicitId = String(item.id || "").trim();
  if (explicitId) {
    return explicitId;
  }

  const productId = String(item.productId || "").trim();
  const variantId = String(item.variantId || "").trim();
  const attributeHash =
    item.attributes && Object.keys(item.attributes).length > 0
      ? JSON.stringify(item.attributes)
      : "default";

  return variantId ? `${productId}-${variantId}` : `${productId}-${attributeHash}`;
};

export interface CartItem {
  id: string; // Unique identifier for the cart item (e.g., productId + selected variant hash)
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  basePrice?: number;
  comparePrice?: number;
  quantity: number;
  imageUrl?: string;
  attributes?: Record<string, string>; // e.g., { Color: "Red", Size: "M" }
  productColor?: string;
  productSize?: string;
  volumeDiscounts?: VolumeDiscountTier[];
  quantityOffer?: {
    groupId: string;
    offerId: string;
    offerLabel: string;
    offerQuantity: number;
    slotIndex?: number;
    freeShipping?: boolean;
  } | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (
    item: Omit<CartItem, "id"> & { id?: string },
    options?: { openCart?: boolean },
  ) => void;
  removeItem: (id: string) => void;
  removeQuantityOfferGroup: (groupId: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;

  // Computed
  getTotalItems: () => number;
  getSubtotal: () => number;
  hasQuantityOfferFreeShipping: () => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItemInput, options) => {
        set((state) => {
          const shouldOpenCart = options?.openCart !== false;
          const itemId = buildCartItemId(newItemInput);

          const existingItemIndex = state.items.findIndex(
            (item) => item.id === itemId
          );

          if (existingItemIndex >= 0) {
            // Update quantity of existing item
            const newItems = [...state.items];
            const existingItem = newItems[existingItemIndex];
            if (existingItem) {
              existingItem.quantity += newItemInput.quantity;
              existingItem.basePrice =
                newItemInput.basePrice ?? existingItem.basePrice ?? existingItem.price;
              if (Array.isArray(newItemInput.volumeDiscounts) && newItemInput.volumeDiscounts.length > 0) {
                existingItem.volumeDiscounts = newItemInput.volumeDiscounts;
              }
              if (newItemInput.quantityOffer) {
                existingItem.quantityOffer = newItemInput.quantityOffer;
              }
              
              // Ensure imageUrl is a string even if updated from object
              if (newItemInput.imageUrl) {
                existingItem.imageUrl = normalizeCartImageUrl(
                  newItemInput.imageUrl as string | ImageLike,
                );
              }
            }
            return { items: newItems, isOpen: shouldOpenCart };
          } else {
            // Add new item
            let normalizedImageUrl = newItemInput.imageUrl;
            if (newItemInput.imageUrl) {
              normalizedImageUrl = normalizeCartImageUrl(
                newItemInput.imageUrl as string | ImageLike,
              );
            }

            const newItem: CartItem = {
              ...newItemInput,
              basePrice: newItemInput.basePrice ?? newItemInput.price,
              imageUrl: normalizedImageUrl,
              id: itemId,
            };
            return { items: [newItem, ...state.items], isOpen: shouldOpenCart };
          }
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      removeQuantityOfferGroup: (groupId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => item.quantityOffer?.groupId !== groupId,
          ),
        }));
      },

      updateQuantity: (id, quantity) => {
        set((state) => {
          const targetItem = state.items.find((item) => item.id === id);
          if (targetItem?.quantityOffer?.groupId) {
            return state;
          }

          return {
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
            ),
          };
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      setIsOpen: (isOpen) => {
        set({ isOpen });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        const subtotal = get().items.reduce((total, item) => {
          const pricing = calculateVolumeDiscountPricing({
            unitPrice: item.basePrice ?? item.price,
            quantity: item.quantity,
            discounts: item.volumeDiscounts,
          });
          return total + pricing.lineSubtotal;
        }, 0);
        return Number(subtotal.toFixed(2));
      },

      hasQuantityOfferFreeShipping: () =>
        get().items.some((item) => Boolean(item.quantityOffer?.freeShipping)),
    }),
    {
      name: DEFAULT_STOREFRONT_CART_STORAGE_NAME,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }), // Only persist items, not UI state like isOpen
    }
  )
);
