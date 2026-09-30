export interface VolumeDiscountTier {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  isActive?: boolean;
}

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseMetadataObject = (value: unknown): Record<string, any> => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeDiscount = (
  rawDiscount: unknown,
  index = 0,
): VolumeDiscountTier | null => {
  if (!isRecord(rawDiscount)) {
    return null;
  }

  const minQuantity = Math.max(
    1,
    Math.floor(toFiniteNumber(rawDiscount.minQuantity, 0)),
  );
  if (minQuantity <= 0) {
    return null;
  }

  const rawMaxQuantity = rawDiscount.maxQuantity;
  const maxQuantity =
    rawMaxQuantity === null ||
    rawMaxQuantity === undefined ||
    rawMaxQuantity === ""
      ? null
      : Math.max(
          minQuantity,
          Math.floor(toFiniteNumber(rawMaxQuantity, minQuantity)),
        );

  const discountType =
    String(rawDiscount.discountType || "").trim().toLowerCase() === "fixed"
      ? "fixed"
      : "percentage";
  const discountValue = Math.max(0, toFiniteNumber(rawDiscount.discountValue, 0));

  if (discountValue <= 0) {
    return null;
  }

  return {
    id:
      typeof rawDiscount.id === "string" && rawDiscount.id.trim()
        ? rawDiscount.id.trim()
        : `volume-discount-${index + 1}`,
    minQuantity,
    maxQuantity,
    discountType,
    discountValue:
      discountType === "percentage" ? Math.min(discountValue, 100) : discountValue,
    isActive: rawDiscount.isActive !== false,
  };
};

const quantityOfferToVolumeDiscount = (
  offer: unknown,
): VolumeDiscountTier | null => {
  if (!isRecord(offer)) return null;
  const quantity = Math.max(1, Math.floor(toFiniteNumber(offer.quantity, 0)));
  if (quantity <= 0) return null;
  return {
    id:
      typeof offer.id === "string" && offer.id.trim()
        ? offer.id.trim()
        : `volume-discount-${quantity}`,
    minQuantity: quantity,
    maxQuantity: null,
    discountType: "fixed",
    discountValue: 0,
    isActive: offer.isActive !== false,
  };
};

export const normalizeVolumeDiscounts = (value: unknown): VolumeDiscountTier[] => {
  const rawDiscounts = Array.isArray(value)
    ? value
    : (() => {
        const metadata = parseMetadataObject(value);
        if (Array.isArray(metadata.volumeDiscounts) && metadata.volumeDiscounts.length > 0) {
          return metadata.volumeDiscounts;
        }

        if (Array.isArray(metadata.bulkSavings)) {
          return metadata.bulkSavings;
        }

        if (Array.isArray(metadata.quantityOffers)) {
          return metadata.quantityOffers
            .filter((offer: unknown) => isRecord(offer) && toFiniteNumber((offer as any).quantity, 0) > 1)
            .map((offer: unknown) => quantityOfferToVolumeDiscount(offer))
            .filter(Boolean);
        }

        return [];
      })();

  return rawDiscounts
    .map((discount, index) => normalizeDiscount(discount, index))
    .filter((discount): discount is VolumeDiscountTier => Boolean(discount))
    .filter((discount) => discount.isActive !== false)
    .sort((left, right) => left.minQuantity - right.minQuantity);
};

export const getProductVolumeDiscounts = (product: Record<string, any> | null | undefined) =>
  normalizeVolumeDiscounts(product?.volumeDiscounts || product?.metadata);

export const getApplicableVolumeDiscount = (
  discounts: VolumeDiscountTier[],
  quantity: number,
) => {
  const normalizedQuantity = Math.max(1, Math.floor(toFiniteNumber(quantity, 1)));
  const applicable = discounts.filter((discount) => {
    const maxQuantity = discount.maxQuantity ?? Number.MAX_SAFE_INTEGER;
    return normalizedQuantity >= discount.minQuantity && normalizedQuantity <= maxQuantity;
  });

  if (applicable.length === 0) {
    return null;
  }

  return [...applicable].sort((left, right) => right.minQuantity - left.minQuantity)[0];
};

export const calculateVolumeDiscountPricing = ({
  unitPrice,
  quantity,
  discounts,
}: {
  unitPrice: number;
  quantity: number;
  discounts?: VolumeDiscountTier[];
}) => {
  const normalizedUnitPrice = Math.max(0, toFiniteNumber(unitPrice, 0));
  const normalizedQuantity = Math.max(1, Math.floor(toFiniteNumber(quantity, 1)));
  const normalizedDiscounts = normalizeVolumeDiscounts(discounts || []);
  const appliedDiscount = getApplicableVolumeDiscount(
    normalizedDiscounts,
    normalizedQuantity,
  );
  const baseSubtotal = Number((normalizedUnitPrice * normalizedQuantity).toFixed(2));

  if (!appliedDiscount) {
    return {
      appliedDiscount: null,
      baseUnitPrice: normalizedUnitPrice,
      effectiveUnitPrice: normalizedUnitPrice,
      baseSubtotal,
      lineSubtotal: baseSubtotal,
      totalDiscount: 0,
    };
  }

  const rawDiscountPerUnit =
    appliedDiscount.discountType === "percentage"
      ? (normalizedUnitPrice * appliedDiscount.discountValue) / 100
      : appliedDiscount.discountValue;
  const discountPerUnit = Math.min(normalizedUnitPrice, Math.max(0, rawDiscountPerUnit));
  const effectiveUnitPrice = Number((normalizedUnitPrice - discountPerUnit).toFixed(2));
  const lineSubtotal = Number((effectiveUnitPrice * normalizedQuantity).toFixed(2));
  const totalDiscount = Number((baseSubtotal - lineSubtotal).toFixed(2));

  return {
    appliedDiscount,
    baseUnitPrice: normalizedUnitPrice,
    effectiveUnitPrice,
    baseSubtotal,
    lineSubtotal,
    totalDiscount,
  };
};
