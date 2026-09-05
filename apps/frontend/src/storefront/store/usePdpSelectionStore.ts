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

export const arePdpSelectionsEqual = (
  a: PdpProductSelection | null,
  b: PdpProductSelection | null,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  if (
    a.productId !== b.productId ||
    a.productSlug !== b.productSlug ||
    a.productName !== b.productName ||
    a.variantId !== b.variantId ||
    a.imageUrl !== b.imageUrl ||
    a.unitPrice !== b.unitPrice ||
    a.basePrice !== b.basePrice ||
    a.requiresVariantSelection !== b.requiresVariantSelection ||
    a.isSelectionReady !== b.isSelectionReady
  ) {
    return false;
  }

  const aAttrs = a.attributes || {};
  const bAttrs = b.attributes || {};
  const aKeys = Object.keys(aAttrs);
  const bKeys = Object.keys(bAttrs);
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    const key = aKeys[i];
    if (aAttrs[key] !== bAttrs[key]) return false;
  }

  const aVd = a.volumeDiscounts || [];
  const bVd = b.volumeDiscounts || [];
  if (aVd.length !== bVd.length) return false;
  for (let i = 0; i < aVd.length; i++) {
    const vd1 = aVd[i];
    const vd2 = bVd[i];
    if (
      vd1?.id !== vd2?.id ||
      vd1?.minQuantity !== vd2?.minQuantity ||
      vd1?.maxQuantity !== vd2?.maxQuantity ||
      vd1?.discountType !== vd2?.discountType ||
      vd1?.discountValue !== vd2?.discountValue
    ) {
      return false;
    }
  }

  return true;
};

export const usePdpSelectionStore = create<PdpSelectionStore>((set) => ({
  selection: null,
  quantity: 1,

  setQuantity: (quantity) => {
    const normalized = clampQuantity(quantity);
    set((state) => {
      if (state.quantity === normalized) {
        return state;
      }
      return { quantity: normalized };
    });
  },

  syncSelection: (selection) => {
    set((state) => {
      const normalizedSelection = selection
        ? {
            ...selection,
            attributes: selection.attributes || {},
            volumeDiscounts: Array.isArray(selection.volumeDiscounts)
              ? selection.volumeDiscounts
              : [],
          }
        : null;

      const nextQuantity = normalizedSelection
        ? clampQuantity(state.quantity)
        : 1;

      if (
        arePdpSelectionsEqual(state.selection, normalizedSelection) &&
        state.quantity === nextQuantity
      ) {
        return state;
      }

      return {
        selection: normalizedSelection,
        quantity: nextQuantity,
      };
    });
  },

  resetSelection: () => {
    set((state) => {
      if (!state.selection && state.quantity === 1) {
        return state;
      }
      return {
        selection: null,
        quantity: 1,
      };
    });
  },
}));

