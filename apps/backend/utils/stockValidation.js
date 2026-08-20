/**
 * Shared stock-cap helpers.
 * Used by product lifecycle, inventory and import paths so a single cap
 * is enforced consistently across the whole platform.
 */

const MAX_PRODUCT_STOCK = 10000;

/**
 * Returns { ok: true } or { ok: false, message }.
 * Rejects NaN / Infinity / negative values and any value above the cap.
 */
function validateStock(value) {
  const num = value === '' || value === null || value === undefined
    ? NaN
    : Number(value);

  if (!Number.isFinite(num)) {
    return { ok: false, message: 'قيمة المخزون غير صالحة' };
  }

  if (num < 0) {
    return { ok: false, message: 'قيمة المخزون لا يمكن أن تكون سالبة' };
  }

  if (num > MAX_PRODUCT_STOCK) {
    return {
      ok: false,
      message: `قيمة المخزون غير منطقية — الحد الأقصى المسموح هو ${MAX_PRODUCT_STOCK} قطعة`,
    };
  }

  return { ok: true };
}

module.exports = {
  MAX_PRODUCT_STOCK,
  validateStock,
};
