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
    return { ok: false, message: '┘é┘è┘à╪⌐ ╪º┘ä┘à╪«╪▓┘ê┘å ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐' };
  }

  if (num < 0) {
    return { ok: false, message: '┘é┘è┘à╪⌐ ╪º┘ä┘à╪«╪▓┘ê┘å ┘ä╪º ┘è┘à┘â┘å ╪ú┘å ╪¬┘â┘ê┘å ╪│╪º┘ä╪¿╪⌐' };
  }

  if (num > MAX_PRODUCT_STOCK) {
    return {
      ok: false,
      message: `┘é┘è┘à╪⌐ ╪º┘ä┘à╪«╪▓┘ê┘å ╪║┘è╪▒ ┘à┘å╪╖┘é┘è╪⌐ ΓÇö ╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë ╪º┘ä┘à╪│┘à┘ê╪¡ ┘ç┘ê ${MAX_PRODUCT_STOCK} ┘é╪╖╪╣╪⌐`,
    };
  }

  return { ok: true };
}

module.exports = {
  MAX_PRODUCT_STOCK,
  validateStock,
};
