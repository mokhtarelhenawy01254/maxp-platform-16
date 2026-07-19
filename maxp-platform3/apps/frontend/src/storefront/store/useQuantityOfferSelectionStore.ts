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

export const useQuantityOfferSelectionStore =
  create<QuantityOfferSelectionStore>((set) => ({
    selection: null,

    syncSelection: (selection) => {
      set({ selection });
    },

    resetSelection: (productId) => {
      set((state) => {
        if (!productId || state.selection?.productId === productId) {
          return { selection: null };
        }

        return state;
      });
    },
  }));
