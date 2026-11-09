import type { CartItem } from "../store/useCartStore";
import { calculateVolumeDiscountPricing } from "./volumeDiscounts";
import { getVariantAttributeLabel } from "./variants";

export interface CartItemPricingSummary {
  effectiveUnitPrice: number;
  baseUnitPrice: number;
  lineSubtotal: number;
  totalDiscount: number;
}

export interface QuantityOfferCartGroupItem {
  item: CartItem;
  pricing: CartItemPricingSummary;
}

export interface QuantityOfferCartGroup {
  groupId: string;
  offerId: string;
  offerLabel: string;
  offerQuantity: number;
  freeShipping: boolean;
  items: QuantityOfferCartGroupItem[];
  subtotal: number;
  originalTotal: number;
  totalDiscount: number;
  selectedPieces: number;
}

export type CartDisplayEntry =
  | {
      type: "single";
      key: string;
      item: CartItem;
      pricing: CartItemPricingSummary;
    }
  | {
      type: "quantity-offer";
      key: string;
      group: QuantityOfferCartGroup;
    };

export const getCartItemPricing = (item: CartItem, allItems: CartItem[] = []): CartItemPricingSummary => {
  let effectiveQuantity = item.quantity;
  if (item.quantityOffer?.groupId && allItems.length > 0) {
    const groupUnits = allItems
      .filter((other) => other.quantityOffer?.groupId === item.quantityOffer?.groupId)
      .reduce((sum, other) => sum + other.quantity, 0);
    effectiveQuantity = Math.max(effectiveQuantity, groupUnits, item.quantityOffer.offerQuantity || 0);
  } else if (item.quantityOffer?.offerQuantity) {
    effectiveQuantity = Math.max(item.quantity, item.quantityOffer.offerQuantity);
  } else if (allItems.length > 0) {
    const totalProductUnits = allItems
      .filter((other) => other.productId === item.productId && !other.quantityOffer?.groupId)
      .reduce((sum, other) => sum + other.quantity, 0);
    if (totalProductUnits > item.quantity) {
      effectiveQuantity = totalProductUnits;
    }
  }

  const basePricing = calculateVolumeDiscountPricing({
    unitPrice: item.basePrice ?? item.price,
    quantity: effectiveQuantity,
    discounts: item.volumeDiscounts,
  });

  const lineSubtotal = Number((basePricing.effectiveUnitPrice * item.quantity).toFixed(2));
  const baseSubtotal = Number((basePricing.baseUnitPrice * item.quantity).toFixed(2));
  const totalDiscount = Number(Math.max(0, baseSubtotal - lineSubtotal).toFixed(2));

  return {
    ...basePricing,
    lineSubtotal,
    baseSubtotal,
    totalDiscount,
  };
};

const createEmptyGroup = (item: CartItem): QuantityOfferCartGroup => ({
  groupId: item.quantityOffer?.groupId || item.id,
  offerId: item.quantityOffer?.offerId || item.id,
  offerLabel:
    item.quantityOffer?.offerLabel ||
    item.attributes?.["عرض الكمية"] ||
    `${item.quantityOffer?.offerQuantity || item.quantity} قطعة`,
  offerQuantity: item.quantityOffer?.offerQuantity || item.quantity,
  freeShipping: Boolean(item.quantityOffer?.freeShipping),
  items: [],
  subtotal: 0,
  originalTotal: 0,
  totalDiscount: 0,
  selectedPieces: 0,
});

export const getCartDisplayEntries = (items: CartItem[]): CartDisplayEntry[] => {
  const entries: CartDisplayEntry[] = [];
  const groupedEntries = new Map<string, QuantityOfferCartGroup>();

  items.forEach((item) => {
    const pricing = getCartItemPricing(item, items);
    const quantityOffer = item.quantityOffer;

    if (!quantityOffer?.groupId) {
      entries.push({
        type: "single",
        key: item.id,
        item,
        pricing,
      });
      return;
    }

    const existingGroup = groupedEntries.get(quantityOffer.groupId);
    const group = existingGroup || createEmptyGroup(item);

    group.items.push({ item, pricing });
    group.subtotal = Number((group.subtotal + pricing.lineSubtotal).toFixed(2));
    group.originalTotal = Number(
      (group.originalTotal + pricing.baseUnitPrice * item.quantity).toFixed(2),
    );
    group.totalDiscount = Number(
      Math.max(0, group.originalTotal - group.subtotal).toFixed(2),
    );
    group.selectedPieces += item.quantity;
    group.freeShipping = group.freeShipping || Boolean(quantityOffer.freeShipping);

    if (!existingGroup) {
      groupedEntries.set(quantityOffer.groupId, group);
      entries.push({
        type: "quantity-offer",
        key: quantityOffer.groupId,
        group,
      });
    }
  });

  return entries;
};

export const getDisplayAttributes = (
  attributes?: Record<string, string>,
  prefersArabicCopy = false,
): Array<[string, string]> =>
  Object.entries(attributes || {})
    .filter(([key]) => key !== "عرض الكمية")
    .map(([key, value]) => [getVariantAttributeLabel(key, prefersArabicCopy), value]);
