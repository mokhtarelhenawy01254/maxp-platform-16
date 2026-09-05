import { create } from "zustand";

export interface PdpQuantityOfferSelection {
  productId: string;
  offerId: string;
  offerLabel: string;
  offerQuantity: number;
  offerTotal: number;
  unitPrice: number;
  savings: number;
  freeShipping: boolean;
  selections: Array<Record<string, string>>;
  isReady: boolean;
}

interface QuantityOfferSelectionStore {
  selection: PdpQuantityOfferSelection | null;
  syncSelection: (selection: PdpQuantityOfferSelection | null) => void;
  resetSelection: (productId?: string) => void;
}

export const areQuantityOfferSelectionsEqual = (
  a: PdpQuantityOfferSelection | null,
  b: PdpQuantityOfferSelection | null,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  if (
    a.productId !== b.productId ||
    a.offerId !== b.offerId ||
    a.offerLabel !== b.offerLabel ||
    a.offerQuantity !== b.offerQuantity ||
    a.offerTotal !== b.offerTotal ||
    a.unitPrice !== b.unitPrice ||
    a.savings !== b.savings ||
    a.freeShipping !== b.freeShipping ||
    a.isReady !== b.isReady
  ) {
    return false;
  }

  const aSelections = a.selections || [];
  const bSelections = b.selections || [];
  if (aSelections.length !== bSelections.length) return false;

  for (let i = 0; i < aSelections.length; i++) {
    const s1 = aSelections[i] || {};
    const s2 = bSelections[i] || {};
    const k1 = Object.keys(s1);
    const k2 = Object.keys(s2);
    if (k1.length !== k2.length) return false;
    for (let j = 0; j < k1.length; j++) {
      const key = k1[j];
      if (s1[key] !== s2[key]) return false;
    }
  }

  return true;
};

export const useQuantityOfferSelectionStore =
  create<QuantityOfferSelectionStore>((set) => ({
    selection: null,

    syncSelection: (selection) => {
      set((state) => {
        if (areQuantityOfferSelectionsEqual(state.selection, selection)) {
          return state;
        }
        return { selection };
      });
    },

    resetSelection: (productId) => {
      set((state) => {
        if (!state.selection) {
          return state;
        }
        if (!productId || state.selection.productId === productId) {
          return { selection: null };
        }

        return state;
      });
    },
  }));
