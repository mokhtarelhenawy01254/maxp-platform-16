const { isPreOrderEligible } = require('./preOrderUtils');

/**
 * Parses metadata safely (handles object or JSON string)
 */
function parseMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch (e) {
    return {};
  }
}

/**
 * Determines whether backorder (ordering when stock <= 0 or insufficient) is permitted for a product and/or variant.
 *
 * Backorder is permitted if:
 * 1. Product does not track inventory (trackInventory === false)
 * 2. Product is marked as pre-order eligible (isPreOrder === true with valid future or null date)
 * 3. Variant explicitly allows backorders (variant.allowBackorders === true or in variant.metadata)
 * 4. Product explicitly allows backorders (product.allowBackorders === true or in product.metadata)
 * 5. Company-wide or Store-wide policy allows backorders (e.g. companySettings.allowOutOfStockOrders === true)
 */
function isBackorderPermitted(product, selectedVariant = null, companySettings = {}) {
  if (!product) return false;

  // 1. Inventory tracking disabled on product -> unlimited
  if (product.trackInventory === false) {
    return true;
  }

  // 2. Pre-order eligibility
  if (isPreOrderEligible(product)) {
    return true;
  }

  // 3. Variant allows backorders or variant tracking disabled
  if (selectedVariant) {
    if (selectedVariant.trackInventory === false) {
      return true;
    }
    if (selectedVariant.allowBackorders === true) {
      return true;
    }
    const variantMeta = parseMetadata(selectedVariant.metadata);
    if (variantMeta.allowBackorders === true) {
      return true;
    }
  }

  // 4. Product allows backorders
  if (product.allowBackorders === true) {
    return true;
  }
  const productMeta = parseMetadata(product.metadata);
  if (productMeta.allowBackorders === true) {
    return true;
  }

  // 5. Store-wide / Company-wide policy
  if (
    companySettings.allowOutOfStockOrders === true ||
    companySettings.allowBackorders === true ||
    companySettings.continueSellingOutOfStock === true
  ) {
    return true;
  }

  return false;
}

/**
 * Returns whether a product or variant is currently in stock or purchasable.
 */
function getStockAvailability(product, selectedVariant = null, companySettings = {}) {
  const isBackorder = isBackorderPermitted(product, selectedVariant, companySettings);
  const track = (selectedVariant ? selectedVariant.trackInventory !== false : true) && (product ? product.trackInventory !== false : true);

  const currentStock = selectedVariant
    ? (typeof selectedVariant.stock === 'number' ? selectedVariant.stock : 0)
    : (typeof product?.stock === 'number' ? product.stock : 0);

  const hasPhysicalStock = !track || currentStock > 0;
  const isPurchasable = hasPhysicalStock || isBackorder;

  return {
    stock: currentStock,
    trackInventory: track,
    hasPhysicalStock,
    isBackorderPermitted: isBackorder,
    isPurchasable,
  };
}

module.exports = {
  isBackorderPermitted,
  getStockAvailability,
  parseMetadata,
};
