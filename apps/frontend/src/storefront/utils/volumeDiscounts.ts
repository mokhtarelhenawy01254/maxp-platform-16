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
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean"
  ) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalFiniteNumber = (value: unknown) => {
  const parsed = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
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
    Math.floor(toFiniteNumber(rawDiscount["minQuantity"], 0)),
  );
  if (minQuantity <= 0) {
    return null;
  }

  const rawMaxQuantity = rawDiscount["maxQuantity"];
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
    String(rawDiscount["discountType"] || "").trim().toLowerCase() === "fixed"
      ? "fixed"
      : "percentage";
  const discountValue = Math.max(0, toFiniteNumber(rawDiscount["discountValue"], 0));

  if (discountValue <= 0) {
    return null;
  }

  return {
    id:
      typeof rawDiscount["id"] === "string" && rawDiscount["id"].trim()
        ? rawDiscount["id"].trim()
        : `volume-discount-${index + 1}`,
    minQuantity,
    maxQuantity,
    discountType,
    discountValue:
      discountType === "percentage" ? Math.min(discountValue, 100) : discountValue,
    isActive: rawDiscount["isActive"] !== false,
  };
};

const quantityOfferToVolumeDiscount = (
  offer: unknown,
  basePrice = 0,
): VolumeDiscountTier | null => {
  if (!isRecord(offer)) return null;
  const quantity = Math.floor(
    toFiniteNumber((offer as any).quantity ?? (offer as any).minQuantity, 0),
  );
  if (quantity <= 0) return null;

  const id =
    typeof (offer as any).id === "string" && (offer as any).id.trim()
      ? (offer as any).id.trim()
      : `volume-discount-${quantity}`;
  const isActive = (offer as any).isActive !== false;

  const pctCandidate =
    toOptionalFiniteNumber((offer as any).discountPercent) ??
    toOptionalFiniteNumber((offer as any).discountPercentage);
  if (
    pctCandidate !== null ||
    String((offer as any).discountType || "").trim().toLowerCase() === "percentage"
  ) {
    const pctValue = pctCandidate ?? toFiniteNumber((offer as any).discountValue, 0);
    return {
      id,
      minQuantity: quantity,
      maxQuantity: null,
      discountType: "percentage",
      discountValue: Math.min(100, Math.max(0, pctValue)),
      isActive,
    };
  }

  const directUnitPrice =
    toOptionalFiniteNumber((offer as any).unitPrice) ??
    toOptionalFiniteNumber((offer as any).price) ??
    toOptionalFiniteNumber((offer as any).offerUnitPrice);
  const totalPrice =
    toOptionalFiniteNumber((offer as any).totalPrice) ??
    toOptionalFiniteNumber((offer as any).offerTotal);
  const resolvedUnitPrice =
    directUnitPrice !== null
      ? directUnitPrice
      : totalPrice !== null
        ? totalPrice / quantity
        : null;

  const numericBasePrice = toFiniteNumber(basePrice, 0);
  const discountValue =
    numericBasePrice > 0 && resolvedUnitPrice !== null
      ? Number(Math.max(0, numericBasePrice - resolvedUnitPrice).toFixed(2))
      : Math.max(0, toFiniteNumber((offer as any).discountValue, 0));

  return {
    id,
    minQuantity: quantity,
    maxQuantity: null,
    discountType: "fixed",
    discountValue,
    isActive,
  };
};

const normalizeAndSort = (rawList: unknown[]): VolumeDiscountTier[] =>
  rawList
    .map((discount, index) => normalizeDiscount(discount, index))
    .filter((discount): discount is VolumeDiscountTier => Boolean(discount))
    .filter((discount) => discount.isActive !== false)
    .sort((left, right) => left.minQuantity - right.minQuantity);

export const normalizeVolumeDiscounts = (
  value: unknown,
  basePrice = 0,
): VolumeDiscountTier[] => {
  if (Array.isArray(value)) {
    return normalizeAndSort(value);
  }

  const metadata = parseMetadataObject(value);
  const rawQuantityOffers = metadata["quantityOffers"];
  if (Array.isArray(rawQuantityOffers) && rawQuantityOffers.length > 0) {
    const offerDiscounts = normalizeAndSort(
      rawQuantityOffers
        .filter(
          (offer: unknown) =>
            isRecord(offer) &&
            toFiniteNumber(offer["quantity"] ?? offer["minQuantity"], 0) > 1,
        )
        .map((offer: unknown) => quantityOfferToVolumeDiscount(offer, basePrice))
        .filter(Boolean),
    );
    if (offerDiscounts.length > 0) {
      return offerDiscounts;
    }
  }

  const rawVolumeDiscounts = metadata["volumeDiscounts"];
  if (Array.isArray(rawVolumeDiscounts) && rawVolumeDiscounts.length > 0) {
    return normalizeAndSort(rawVolumeDiscounts);
  }

  const rawBulkSavings = metadata["bulkSavings"];
  if (Array.isArray(rawBulkSavings) && rawBulkSavings.length > 0) {
    return normalizeAndSort(rawBulkSavings);
  }

  return [];
};

export const getProductVolumeDiscounts = (
  product: Record<string, any> | null | undefined,
  basePrice?: number,
) => {
  const effectiveBasePrice =
    basePrice !== undefined && basePrice > 0
      ? basePrice
      : Number(product?.["price"] || 0);

  return normalizeVolumeDiscounts(
    product?.["metadata"] || product?.["volumeDiscounts"],
    effectiveBasePrice,
  );
};

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
  applicableQuantity,
  discounts,
  metadata,
  product,
  variant,
}: {
  unitPrice: number;
  quantity: number;
  applicableQuantity?: number;
  discounts?: VolumeDiscountTier[];
  metadata?: unknown;
  product?: Record<string, any> | null;
  variant?: Record<string, any> | null;
}) => {
  const normalizedUnitPrice = Math.max(0, toFiniteNumber(unitPrice, 0));
  const normalizedQuantity = Math.max(1, Math.floor(toFiniteNumber(quantity, 1)));
  const tierQuantity =
    applicableQuantity !== undefined && applicableQuantity !== null
      ? Math.max(
          normalizedQuantity,
          Math.floor(toFiniteNumber(applicableQuantity, normalizedQuantity)),
        )
      : normalizedQuantity;

  let normalizedDiscounts: VolumeDiscountTier[];
  if (Array.isArray(discounts)) {
    normalizedDiscounts = normalizeVolumeDiscounts(discounts, normalizedUnitPrice);
  } else {
    const variantDiscounts = variant
      ? getProductVolumeDiscounts(variant, normalizedUnitPrice)
      : [];
    if (variantDiscounts.length > 0) {
      normalizedDiscounts = variantDiscounts;
    } else if (product) {
      normalizedDiscounts = getProductVolumeDiscounts(product, normalizedUnitPrice);
    } else if (metadata !== undefined) {
      normalizedDiscounts = normalizeVolumeDiscounts(metadata, normalizedUnitPrice);
    } else {
      normalizedDiscounts = [];
    }
  }

  const appliedDiscount = getApplicableVolumeDiscount(
    normalizedDiscounts,
    tierQuantity,
  );
  const baseSubtotal = Number((normalizedUnitPrice * normalizedQuantity).toFixed(2));

  if (!appliedDiscount || normalizedUnitPrice <= 0) {
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

export const applyVolumeDiscount = calculateVolumeDiscountPricing;
