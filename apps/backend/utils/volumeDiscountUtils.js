const { isRecord, parseProductMetadata } = require('./productMetadataUtils');

const toFiniteNumber = (value, fallback = 0) => {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    typeof value === 'boolean'
  ) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalFiniteNumber = (value) => {
  const parsed = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
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
  const quantity = Math.floor(toFiniteNumber(offer.quantity ?? offer.minQuantity, 0));
  if (quantity <= 0) return null;

  const id =
    typeof offer.id === 'string' && offer.id.trim()
      ? offer.id.trim()
      : `volume-discount-${quantity}`;
  const isActive = offer.isActive !== false;

  const pctCandidate =
    toOptionalFiniteNumber(offer.discountPercent) ??
    toOptionalFiniteNumber(offer.discountPercentage);
  if (
    pctCandidate !== null ||
    String(offer.discountType || '').trim().toLowerCase() === 'percentage'
  ) {
    const pctValue = pctCandidate ?? toFiniteNumber(offer.discountValue, 0);
    return {
      id,
      minQuantity: quantity,
      maxQuantity: null,
      discountType: 'percentage',
      discountValue: Math.min(100, Math.max(0, pctValue)),
      isActive,
    };
  }

  const directUnitPrice =
    toOptionalFiniteNumber(offer.unitPrice) ??
    toOptionalFiniteNumber(offer.price) ??
    toOptionalFiniteNumber(offer.offerUnitPrice);
  const totalPrice =
    toOptionalFiniteNumber(offer.totalPrice) ??
    toOptionalFiniteNumber(offer.offerTotal);
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
      : Math.max(0, toFiniteNumber(offer.discountValue, 0));

  return {
    id,
    minQuantity: quantity,
    maxQuantity: null,
    discountType: 'fixed',
    discountValue,
    isActive,
  };
};

const normalizeAndFilterDiscounts = (rawDiscounts, activeOnly = true) =>
  sortVolumeDiscounts(
    (rawDiscounts || [])
      .map((discount, index) => (isRecord(discount) ? normalizeVolumeDiscount(discount, index) : null))
      .filter(Boolean)
      .filter((discount) => (activeOnly ? discount.isActive !== false : true)),
  );

const getVolumeDiscountsFromMetadata = (rawMetadata, options = {}) => {
  const { activeOnly = true, basePrice } = options;
  const metadata = parseMetadataObject(rawMetadata);

  // Single Source of Truth: if active >1-quantity quantityOffers exist, they take precedence.
  if (Array.isArray(metadata.quantityOffers) && metadata.quantityOffers.length > 0) {
    const offerDiscounts = normalizeAndFilterDiscounts(
      metadata.quantityOffers
        .filter((offer) => isRecord(offer) && toFiniteNumber(offer.quantity ?? offer.minQuantity, 0) > 1)
        .map((offer) => quantityOfferToVolumeDiscount(offer, basePrice))
        .filter(Boolean),
      activeOnly,
    );
    if (offerDiscounts.length > 0) {
      return offerDiscounts;
    }
  }

  if (Array.isArray(metadata.volumeDiscounts) && metadata.volumeDiscounts.length > 0) {
    return normalizeAndFilterDiscounts(metadata.volumeDiscounts, activeOnly);
  }

  if (Array.isArray(metadata.bulkSavings) && metadata.bulkSavings.length > 0) {
    return normalizeAndFilterDiscounts(metadata.bulkSavings, activeOnly);
  }

  return [];
};

const buildMetadataWithVolumeDiscounts = (rawMetadata, discounts) => {
  const metadata = parseMetadataObject(rawMetadata);
  const nextMetadata = { ...metadata };
  delete nextMetadata.quantityOffers; // Enforce single source of truth
  return JSON.stringify({
    ...nextMetadata,
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

/**
 * Single source of truth for computing discounted unit price and line/group totals
 * across product pages, cart, and order creation.
 */
const applyVolumeDiscount = ({
  unitPrice,
  quantity,
  applicableQuantity,
  discounts,
  metadata,
  product,
  variant,
  activeOnly = true,
}) => {
  const normalizedUnitPrice = Math.max(0, toFiniteNumber(unitPrice, 0));
  const normalizedQuantity = Math.max(1, Math.floor(toFiniteNumber(quantity, 1)));
  const tierQuantity =
    applicableQuantity !== undefined && applicableQuantity !== null
      ? Math.max(normalizedQuantity, Math.floor(toFiniteNumber(applicableQuantity, normalizedQuantity)))
      : normalizedQuantity;

  let resolvedDiscounts;
  if (Array.isArray(discounts)) {
    resolvedDiscounts = normalizeAndFilterDiscounts(discounts, activeOnly);
  } else {
    const variantDiscounts = variant?.metadata
      ? getVolumeDiscountsFromMetadata(variant.metadata, {
          activeOnly,
          basePrice: normalizedUnitPrice,
        })
      : [];
    if (variantDiscounts.length > 0) {
      resolvedDiscounts = variantDiscounts;
    } else {
      const sourceMetadata = product?.metadata ?? metadata;
      resolvedDiscounts = sourceMetadata
        ? getVolumeDiscountsFromMetadata(sourceMetadata, {
            activeOnly,
            basePrice: normalizedUnitPrice,
          })
        : Array.isArray(product?.volumeDiscounts)
          ? normalizeAndFilterDiscounts(product.volumeDiscounts, activeOnly)
          : [];
    }
  }

  const applicableDiscount = getApplicableVolumeDiscount(resolvedDiscounts, tierQuantity);
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
    String(applicableDiscount.discountType || '').trim().toLowerCase() === 'percentage'
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

/**
 * Computes consistent volume-discount pricing for an entire cart / order item list
 * (supporting both single-line quantities and multi-variant offer groups).
 */
const calculateCartVolumeDiscounts = (items = [], options = {}) => {
  const { activeOnly = true } = options;
  const groupUnitsMap = new Map();
  const productUnitsMap = new Map();

  for (const item of items) {
    if (!item) continue;
    const qty = Math.max(1, Math.floor(toFiniteNumber(item.quantity, 1)));
    const groupId = item.quantityOffer?.groupId || item.metadata?.quantityOffer?.groupId;
    if (groupId) {
      groupUnitsMap.set(groupId, (groupUnitsMap.get(groupId) || 0) + qty);
    } else if (item.productId) {
      const pid = String(item.productId);
      productUnitsMap.set(pid, (productUnitsMap.get(pid) || 0) + qty);
    }
  }

  const pricedItems = [];
  let subtotal = 0;
  let baseSubtotal = 0;

  for (const item of items) {
    if (!item) continue;
    const qty = Math.max(1, Math.floor(toFiniteNumber(item.quantity, 1)));
    const groupId = item.quantityOffer?.groupId || item.metadata?.quantityOffer?.groupId;
    const offerQty = toFiniteNumber(
      item.quantityOffer?.offerQuantity ?? item.metadata?.quantityOffer?.offerQuantity,
      0,
    );
    let applicableQuantity = qty;
    if (groupId && groupUnitsMap.has(groupId)) {
      applicableQuantity = Math.max(applicableQuantity, groupUnitsMap.get(groupId), offerQty);
    } else if (item.productId && productUnitsMap.has(String(item.productId))) {
      applicableQuantity = Math.max(applicableQuantity, productUnitsMap.get(String(item.productId)));
    }

    const pricing = applyVolumeDiscount({
      unitPrice: item.basePrice ?? item.unitPrice ?? item.price ?? 0,
      quantity: qty,
      applicableQuantity,
      discounts: Array.isArray(item.discounts)
        ? item.discounts
        : Array.isArray(item.volumeDiscounts) && item.volumeDiscounts.length > 0
          ? item.volumeDiscounts
          : undefined,
      metadata: item.metadata,
      product: item.product,
      variant: item.variant,
      activeOnly,
    });

    subtotal = Number((subtotal + pricing.lineSubtotal).toFixed(2));
    baseSubtotal = Number((baseSubtotal + pricing.baseSubtotal).toFixed(2));
    pricedItems.push({
      ...item,
      pricing,
    });
  }

  return {
    items: pricedItems,
    subtotal,
    baseSubtotal,
    totalDiscount: Number(Math.max(0, baseSubtotal - subtotal).toFixed(2)),
  };
};

module.exports = {
  applyVolumeDiscount,
  buildMetadataWithVolumeDiscounts,
  calculateCartVolumeDiscounts,
  calculateVolumeDiscountPricing: applyVolumeDiscount,
  getApplicableVolumeDiscount,
  getVolumeDiscountsFromMetadata,
  normalizeVolumeDiscount,
  parseMetadataObject,
  sortVolumeDiscounts,
};
