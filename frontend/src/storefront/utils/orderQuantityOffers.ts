type QuantityOfferMetadata = {
  groupId?: string;
  offerId?: string;
  offerLabel?: string;
  offerQuantity?: number;
  slotIndex?: number;
  freeShipping?: boolean;
};

type OrderItemMetadata = {
  quantityOffer?: QuantityOfferMetadata;
  attributeValues?: Record<string, string>;
};

export interface OrderQuantityOfferItem {
  id: string;
  productId?: string;
  variantId?: string;
  name?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  attributes?: Record<string, string>;
  metadata?: unknown;
  quantityOffer?: QuantityOfferMetadata;
}

export interface OrderQuantityOfferGroup {
  groupId: string;
  offerId?: string;
  offerLabel: string;
  offerQuantity: number;
  freeShipping: boolean;
  items: OrderQuantityOfferItem[];
  total: number;
  selectedPieces: number;
}

const getMetadataObject = (metadata: unknown): OrderItemMetadata => {
  if (!metadata) return {};

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata) as OrderItemMetadata;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as OrderItemMetadata)
    : {};
};

export const getOrderItemQuantityOffer = (
  item: OrderQuantityOfferItem,
): QuantityOfferMetadata | null => {
  if (item.quantityOffer && typeof item.quantityOffer === "object") {
    return item.quantityOffer;
  }

  const metadata = getMetadataObject(item.metadata);
  return metadata.quantityOffer && typeof metadata.quantityOffer === "object"
    ? metadata.quantityOffer
    : null;
};

export const getOrderItemAttributes = (
  item: OrderQuantityOfferItem,
): Record<string, string> => {
  const metadata = getMetadataObject(item.metadata);
  const attributeValues =
    metadata.attributeValues &&
    typeof metadata.attributeValues === "object" &&
    !Array.isArray(metadata.attributeValues)
      ? metadata.attributeValues
      : {};

  return Object.entries({
    ...attributeValues,
    ...(item.attributes || {}),
  }).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalizedKey = String(key || "").trim();
    const normalizedValue = String(value || "").trim();

    if (!normalizedKey || !normalizedValue || normalizedKey === "عرض الكمية") {
      return acc;
    }

    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
};

export const groupOrderQuantityOfferItems = (
  items: OrderQuantityOfferItem[],
): {
  groups: OrderQuantityOfferGroup[];
  singles: OrderQuantityOfferItem[];
} => {
  const groupsMap = new Map<string, OrderQuantityOfferGroup>();
  const singles: OrderQuantityOfferItem[] = [];

  items.forEach((item) => {
    const quantityOffer = getOrderItemQuantityOffer(item);

    if (!quantityOffer?.groupId) {
      singles.push(item);
      return;
    }

    const existingGroup = groupsMap.get(quantityOffer.groupId);
    const nextGroup =
      existingGroup ||
      {
        groupId: quantityOffer.groupId,
        offerId: quantityOffer.offerId,
        offerLabel:
          quantityOffer.offerLabel ||
          item.attributes?.["عرض الكمية"] ||
          `${quantityOffer.offerQuantity || item.quantity} قطعة`,
        offerQuantity: Number(quantityOffer.offerQuantity || item.quantity || 0),
        freeShipping: Boolean(quantityOffer.freeShipping),
        items: [],
        total: 0,
        selectedPieces: 0,
      };

    nextGroup.items.push(item);
    nextGroup.total = Number(
      (nextGroup.total + Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2),
    );
    nextGroup.selectedPieces += Math.max(0, Number(item.quantity || 0));
    nextGroup.freeShipping = nextGroup.freeShipping || Boolean(quantityOffer.freeShipping);

    if (!existingGroup) {
      groupsMap.set(quantityOffer.groupId, nextGroup);
    }
  });

  return {
    groups: Array.from(groupsMap.values()),
    singles,
  };
};
