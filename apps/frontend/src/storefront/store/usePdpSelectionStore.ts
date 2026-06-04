import { create } from "zustand";
import type { VolumeDiscountTier } from "../utils/volumeDiscounts";

export interface PdpProductSelection {
  productId: string;
  productSlug?: string | null;
  productName: string;
  variantId?: string | null;
  imageUrl?: string;
  unitPrice: number;
  basePrice?: number;
  attributes: Record<string, string>;
  volumeDiscounts: VolumeDiscountTier[];
  requiresVariantSelection: boolean;
  isSelectionReady: boolean;
}

interface PdpSelectionStore {
  selection: PdpProductSelection | null;
  quantity: number;
  setQuantity: (quantity: number) => void;
  syncSelection: (selection: PdpProductSelection | null) => void;
  resetSelection: () => void;
}

const clampQuantity = (value: number) => {
  const normalized = Math.max(1, Math.floor(Number(value) || 1));
  return Number.isFinite(normalized) ? normalized : 1;
};

export const usePdpSelectionStore = create<PdpSelectionStore>((set) => ({
  selection: null,
  quantity: 1,

  setQuantity: (quantity) => {
    set({ quantity: clampQuantity(quantity) });
  },

  syncSelection: (selection) => {
    set((state) => ({
      selection: selection
        ? {
            ...selection,
            attributes: selection.attributes || {},
            volumeDiscounts: Array.isArray(selection.volumeDiscounts)
              ? selection.volumeDiscounts
              : [],
          }
        : null,
      quantity: selection ? clampQuantity(state.quantity) : 1,
    }));
  },

  resetSelection: () => {
    set({
      selection: null,
      quantity: 1,
    });
  },
}));

