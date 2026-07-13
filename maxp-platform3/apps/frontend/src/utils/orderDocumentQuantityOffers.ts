export type OrderDocumentQuantityOffer = {
  groupId?: string;
  offerLabel?: string;
  offerQuantity?: number;
  slotIndex?: number;
  freeShipping?: boolean;
};

export type OrderDocumentItem = {
  productName?: string;
  quantity?: number | string | null;
  price?: number | string | null;
  total?: number | string | null;
  metadata?: unknown;
  quantityOffer?: OrderDocumentQuantityOffer;
};

export type OrderDocumentQuantityOfferGroupItem<T extends OrderDocumentItem> = {
  item: T;
  slotIndex: number | null;
};

export type OrderDocumentQuantityOfferGroup<T extends OrderDocumentItem> = {
  groupId: string;
  offerLabel: string;
  offerQuantity: number;
  freeShipping: boolean;
  total: number;
  selectedPieces: number;
  items: Array<OrderDocumentQuantityOfferGroupItem<T>>;
};

export type OrderDocumentItemsSummary = {
  hasQuantityOffers: boolean;
  quantityOfferCount: number;
  totalItemCount: number;
  primaryLabel: string;
  secondaryLabel: string;
};

type ItemMetadata = {
  quantityOffer?: OrderDocumentQuantityOffer;
  attributeValues?: Record<string, string>;
};

const getMetadataObject = (metadata: unknown): ItemMetadata => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata) as ItemMetadata;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  return typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as ItemMetadata)
    : {};
};

const getItemTotal = (item: OrderDocumentItem) => {
  const explicitTotal = Number(item.total);
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) {
    return explicitTotal;
  }

  return Number(item.price || 0) * Number(item.quantity || 0);
};

export const getOrderDocumentQuantityOffer = (
  item: OrderDocumentItem,
): OrderDocumentQuantityOffer | null => {
  if (item.quantityOffer && typeof item.quantityOffer === "object") {
    return item.quantityOffer;
  }

  const metadata = getMetadataObject(item.metadata);
  if (metadata.quantityOffer && typeof metadata.quantityOffer === "object") {
    return metadata.quantityOffer;
  }

  return null;
};

export const groupOrderDocumentQuantityOffers = <T extends OrderDocumentItem>(
  items: T[],
): {
  groups: Array<OrderDocumentQuantityOfferGroup<T>>;
  singles: T[];
} => {
  const singles: T[] = [];
  const groups = new Map<string, OrderDocumentQuantityOfferGroup<T>>();

  items.forEach((item) => {
    const quantityOffer = getOrderDocumentQuantityOffer(item);
    if (!quantityOffer?.groupId) {
      singles.push(item);
      return;
    }

    const metadata = getMetadataObject(item.metadata);
    const slotIndex = Number(quantityOffer.slotIndex);
    const offerQuantity = Number(quantityOffer.offerQuantity);
    const existingGroup = groups.get(quantityOffer.groupId);
    const nextGroup =
      existingGroup ||
      {
        groupId: quantityOffer.groupId,
        offerLabel:
          quantityOffer.offerLabel ||
          metadata.attributeValues?.["عرض الكمية"] ||
          "عرض كميات",
        offerQuantity:
          Number.isFinite(offerQuantity) && offerQuantity > 0
            ? offerQuantity
            : Math.max(1, Number(item.quantity || 1)),
        freeShipping: Boolean(quantityOffer.freeShipping),
        total: 0,
        selectedPieces: 0,
        items: [],
      };

    nextGroup.freeShipping = nextGroup.freeShipping || Boolean(quantityOffer.freeShipping);
    nextGroup.total = Number((nextGroup.total + getItemTotal(item)).toFixed(2));
    nextGroup.selectedPieces += Math.max(0, Number(item.quantity || 0));
    nextGroup.items.push({
      item,
      slotIndex:
        Number.isFinite(slotIndex) && slotIndex > 0 ? slotIndex : null,
    });

    if (!existingGroup) {
      groups.set(quantityOffer.groupId, nextGroup);
    }
  });

  return {
    groups: Array.from(groups.values()).map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => {
        const leftSlot = left.slotIndex ?? Number.MAX_SAFE_INTEGER;
        const rightSlot = right.slotIndex ?? Number.MAX_SAFE_INTEGER;
        return leftSlot - rightSlot;
      }),
    })),
    singles,
  };
};

export const summarizeOrderDocumentItems = <T extends OrderDocumentItem>(
  items: T[],
): OrderDocumentItemsSummary => {
  const grouped = groupOrderDocumentQuantityOffers(items);
  const totalItemCount = items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity || 0)),
    0,
  );

  if (grouped.groups.length === 0) {
    const firstItem = items[0];
    return {
      hasQuantityOffers: false,
      quantityOfferCount: 0,
      totalItemCount,
      primaryLabel: firstItem?.productName || "طلب بدون منتجات",
      secondaryLabel:
        items.length > 1
          ? `+${items.length - 1} منتجات إضافية`
          : `${Math.max(1, totalItemCount || 0)} قطعة`,
    };
  }

  const primaryGroup = grouped.groups[0];
  const extraGroupsCount = Math.max(0, grouped.groups.length - 1);
  const singlesCount = grouped.singles.length;
  const secondaryParts = [
    `${primaryGroup.selectedPieces}/${primaryGroup.offerQuantity || primaryGroup.selectedPieces} قطع`,
    extraGroupsCount > 0 ? `+${extraGroupsCount} عروض أخرى` : "",
    singlesCount > 0 ? `+${singlesCount} منتجات منفصلة` : "",
  ].filter(Boolean);

  return {
    hasQuantityOffers: true,
    quantityOfferCount: grouped.groups.length,
    totalItemCount,
    primaryLabel: primaryGroup.offerLabel,
    secondaryLabel: secondaryParts.join(" • "),
  };
};
