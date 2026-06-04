const AFFILIATE_PRODUCT_VISIBILITY = {
  ALL: 'ALL',
  HIDDEN: 'HIDDEN',
  SELECTED: 'SELECTED',
};

const parseMetadata = (metadata) => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }

  if (typeof metadata === 'object') {
    return metadata;
  }

  return {};
};

const normalizeAffiliateVisibility = (metadata) => {
  const parsedMetadata = parseMetadata(metadata);
  const rawVisibility = String(
    parsedMetadata.affiliateVisibility ||
      parsedMetadata.marketerVisibility ||
      parsedMetadata.affiliateProductVisibility ||
      AFFILIATE_PRODUCT_VISIBILITY.ALL,
  ).toUpperCase();

  if (rawVisibility === AFFILIATE_PRODUCT_VISIBILITY.HIDDEN) {
    return AFFILIATE_PRODUCT_VISIBILITY.HIDDEN;
  }

  if (rawVisibility === AFFILIATE_PRODUCT_VISIBILITY.SELECTED) {
    return AFFILIATE_PRODUCT_VISIBILITY.SELECTED;
  }

  return AFFILIATE_PRODUCT_VISIBILITY.ALL;
};

const getAffiliateVisibilityIds = (metadata) => {
  const parsedMetadata = parseMetadata(metadata);
  const rawIds =
    parsedMetadata.affiliateVisibleAffiliateIds ||
    parsedMetadata.visibleAffiliateIds ||
    parsedMetadata.allowedAffiliateIds ||
    [];

  if (!Array.isArray(rawIds)) {
    return [];
  }

  return Array.from(
    new Set(
      rawIds
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    ),
  );
};

const isProductVisibleToAffiliate = (product, affiliateId) => {
  if (!product) {
    return false;
  }

  const visibility = normalizeAffiliateVisibility(product.metadata);

  if (visibility === AFFILIATE_PRODUCT_VISIBILITY.HIDDEN) {
    return false;
  }

  if (visibility === AFFILIATE_PRODUCT_VISIBILITY.SELECTED) {
    return getAffiliateVisibilityIds(product.metadata).includes(String(affiliateId));
  }

  return true;
};

const filterProductsVisibleToAffiliate = (products, affiliateId) =>
  (Array.isArray(products) ? products : []).filter((product) =>
    isProductVisibleToAffiliate(product, affiliateId),
  );

module.exports = {
  AFFILIATE_PRODUCT_VISIBILITY,
  filterProductsVisibleToAffiliate,
  getAffiliateVisibilityIds,
  isProductVisibleToAffiliate,
  normalizeAffiliateVisibility,
};
