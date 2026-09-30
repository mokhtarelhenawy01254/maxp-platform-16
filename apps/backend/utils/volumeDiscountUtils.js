const { isRecord, parseProductMetadata } = require('./productMetadataUtils');

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDiscountType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'fixed' ? 'fixed' : 'percentage';
};

const parseMetadataObject = (rawMetadata) => {
  return parseProductMetadata(rawMetadata);
};

const normalizeVolumeDiscount = (rawDiscount, index = 0) => {
  if (!isRecord(rawDiscount)) {
    return null;
  }

  const minQuantity = Math.max(1, Math.floor(toFiniteNumber(rawDiscount.minQuantity, 0)));
  if (minQuantity <= 0) {
    return null;
  }

  const rawMaxQuantity = rawDiscount.maxQuantity;
  const maxQuantity =
    rawMaxQuantity === null ||
    rawMaxQuantity === undefined ||
    rawMaxQuantity === ''
      ? null
      : Math.max(minQuantity, Math.floor(toFiniteNumber(rawMaxQuantity, minQuantity)));

  const discountType = normalizeDiscountType(rawDiscount.discountType);
  const discountValue = Math.max(0, toFiniteNumber(rawDiscount.discountValue, 0));
  if (discountValue <= 0) {
    return null;
  }

  const normalizedDiscountValue =
    discountType === 'percentage'
      ? Math.min(discountValue, 100)
      : discountValue;

  return {
    id:
      typeof rawDiscount.id === 'string' && rawDiscount.id.trim()
        ? rawDiscount.id.trim()
        : `volume-discount-${index + 1}`,
    minQuantity,
    maxQuantity,
    discountType,
    discountValue: normalizedDiscountValue,
    isActive: rawDiscount.isActive !== false,
  };
};

const sortVolumeDiscounts = (discounts) =>
  [...discounts].sort((left, right) => {
    if (left.minQuantity !== right.minQuantity) {
      return left.minQuantity - right.minQuantity;
    }

    const leftMax = left.maxQuantity ?? Number.MAX_SAFE_INTEGER;
    const rightMax = right.maxQuantity ?? Number.MAX_SAFE_INTEGER;
    return leftMax - rightMax;
  });

const quantityOfferToVolumeDiscount = (offer, basePrice) => {
  if (!isRecord(offer)) return null;
  const quantity = Math.max(1, Math.floor(toFiniteNumber(offer.quantity, 0)));
  if (quantity <= 0) return null;
  const unitPrice = toFiniteNumber(offer.unitPrice, 0);
  const discountValue = basePrice ? Math.max(0, basePrice - unitPrice) : 0;
  return {
    id: typeof offer.id === 'string' && offer.id.trim() ? offer.id.trim() : `volume-discount-${quantity}`,
    minQuantity: quantity,
    maxQuantity: null,
    discountType: 'fixed',
    discountValue,
    isActive: offer.isActive !== false,
  };
};

const getVolumeDiscountsFromMetadata = (rawMetadata, options = {}) => {
  const { activeOnly = true, basePrice } = options;
  const metadata = parseMetadataObject(rawMetadata);
  let rawDiscounts;

  if (Array.isArray(metadata.volumeDiscounts) && metadata.volumeDiscounts.length > 0) {
    rawDiscounts = metadata.volumeDiscounts;
  } else if (Array.isArray(metadata.bulkSavings)) {
    rawDiscounts = metadata.bulkSavings;
  } else if (Array.isArray(metadata.quantityOffers)) {
    rawDiscounts = metadata.quantityOffers
      .filter((offer) => isRecord(offer) && toFiniteNumber(offer.quantity, 0) > 1)
      .map((offer) => quantityOfferToVolumeDiscount(offer, basePrice))
      .filter(Boolean);
  } else {
    rawDiscounts = [];
  }

  return sortVolumeDiscounts(
    rawDiscounts
      .map((discount, index) => (isRecord(discount) ? normalizeVolumeDiscount(discount, index) : null))
      .filter(Boolean)
      .filter((discount) => (activeOnly ? discount.isActive !== false : true)),
  );
};

const buildMetadataWithVolumeDiscounts = (rawMetadata, discounts) => {
  const metadata = parseMetadataObject(rawMetadata);
  return JSON.stringify({
    ...metadata,
    volumeDiscounts: sortVolumeDiscounts(
      (discounts || [])
        .map((discount, index) => normalizeVolumeDiscount(discount, index))
        .filter(Boolean),
    ),
  });
};

const getApplicableVolumeDiscount = (discounts, quantity) => {
  const normalizedQuantity = Math.max(1, Math.floor(toFiniteNumber(quantity, 1)));
  const candidates = (discounts || []).filter((discount) => {
    const maxQuantity = discount.maxQuantity ?? Number.MAX_SAFE_INTEGER;
    return normalizedQuantity >= discount.minQuantity && normalizedQuantity <= maxQuantity;
  });

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => right.minQuantity - left.minQuantity)[0];
};

const applyVolumeDiscount = ({ unitPrice, quantity, discounts }) => {
  const normalizedUnitPrice = Math.max(0, toFiniteNumber(unitPrice, 0));
  const normalizedQuantity = Math.max(1, Math.floor(toFiniteNumber(quantity, 1)));
  const applicableDiscount = getApplicableVolumeDiscount(discounts, normalizedQuantity);
  const baseSubtotal = Number((normalizedUnitPrice * normalizedQuantity).toFixed(2));

  if (!applicableDiscount || normalizedUnitPrice <= 0) {
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
    applicableDiscount.discountType === 'percentage'
      ? (normalizedUnitPrice * applicableDiscount.discountValue) / 100
      : applicableDiscount.discountValue;
  const discountPerUnit = Math.min(normalizedUnitPrice, Math.max(0, rawDiscountPerUnit));
  const effectiveUnitPrice = Number((normalizedUnitPrice - discountPerUnit).toFixed(2));
  const lineSubtotal = Number((effectiveUnitPrice * normalizedQuantity).toFixed(2));
  const totalDiscount = Number((baseSubtotal - lineSubtotal).toFixed(2));

  return {
    appliedDiscount: applicableDiscount,
    baseUnitPrice: normalizedUnitPrice,
    effectiveUnitPrice,
    baseSubtotal,
    lineSubtotal,
    totalDiscount,
  };
};

module.exports = {
  applyVolumeDiscount,
  buildMetadataWithVolumeDiscounts,
  getApplicableVolumeDiscount,
  getVolumeDiscountsFromMetadata,
  normalizeVolumeDiscount,
  parseMetadataObject,
  sortVolumeDiscounts,
};
