/**
 * ≡ƒ¢í∩╕Å Order Status Enum Helpers
 * `order.status` ┘ü┘è ╪º┘ä╪»╪º╪¬╪º╪¿┘è╪▓ enum ┘à┘é┘ü┘ê┘ä (┘é┘è┘à ╪½╪º╪¿╪¬╪⌐). ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘à╪«╪╡╪╡╪⌐ ╪º┘ä┘ä┘è ╪¿┘è╪╣┘à┘ä┘ç╪º ╪º┘ä╪¬╪º╪¼╪▒
 * ┘ü┘è `orderStatusConfig` (┘à╪½┘ä DELAYED-WITH-CAPTAIN) ┘à╪┤ ╪¼╪▓╪í ┘à┘å ╪º┘ä┘Ç enum ΓÇö ┘ü┘ä┘ê ╪¡╪» ╪¡╪º┘ê┘ä
 * ┘è┘â╪¬╪¿┘ç╪º ┘à╪¿╪º╪┤╪▒╪⌐ ╪╣┘ä┘ë `order.status` ╪¿┘è┘ü╪┤┘ä ╪º┘ä┘Ç prisma ╪¿┘Ç "Invalid value for argument `status`.
 * Expected OrderStatus."
 *
 * ╪º┘ä╪¡┘ä: ╪ú┘è ╪¡╪º┘ä╪⌐ ┘à╪┤ ┘ü┘è ╪º┘ä┘Ç enum ┘ä╪º╪▓┘à ┘è╪¿┘é┘ë ┘ä┘è┘ç╪º `mapsToSystem` (╪¡┘é┘ä ┘à┘ê╪¼┘ê╪» ┘ü┘è orderStatusConfig)
 * ┘è╪┤╪º┘ê╪▒ ╪╣┘ä┘ë ╪¡╪º┘ä╪⌐ ┘å╪╕╪º┘à ╪╡╪º┘ä╪¡╪⌐. ╪¿┘å╪«╪▓┘æ┘å ╪º┘ä┘é┘è┘à╪⌐ ╪º┘ä╪╡╪º┘ä╪¡╪⌐ ┘ü┘è `order.status`╪î ┘ê┘å╪¡╪¬┘ü╪╕ ╪¿╪º┘ä┘â┘ê╪» ╪º┘ä┘à╪«╪╡╪╡
 * ┘ä┘ä╪╣╪▒╪╢ ┘ê╪º┘ä┘é╪º┘ä╪¿ ┘ê╪º┘ä╪Ñ╪┤╪╣╪º╪▒. ┘ä┘ê ╪º┘ä╪¡╪º┘ä╪⌐ ┘à╪┤ enum ┘ê┘à╪º┘ä┘ç╪º╪┤ mapsToSystem ╪╡╪º┘ä╪¡ ΓåÆ ┘à╪│╪¬╪¡┘è┘ä ╪¬╪«╪▓┘æ┘å.
 */

const VALID_ORDER_STATUS_ENUM = new Set([
  'PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING',
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'DUPLICATE_ORDER', 'REFUNDED',
  'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED', 'PARTIALLY_REFUNDED',
  'WOO_TAGHEZ', 'DRAFT', 'TRASH', 'READY_TO_SHIP', 'ON_HOLD',
  'NOT_SHIPPED', 'OUT_FOR_DELIVERY', 'LOST', 'PENDING_PREPARATION',
  'PREPARING', 'READY', 'QUALITY_CHECK', 'PACKAGED', 'ON_HOLD_PREP',
  'PARTIALLY_DELIVERED', 'STOCK_SHORTAGE', 'SHORTAGE_FAILED', 'PENDING_CANCELLATION',
]);

function isValidOrderStatusEnum(status) {
  return VALID_ORDER_STATUS_ENUM.has(String(status || '').toUpperCase());
}

/**
 * ┘è┘é╪▒┘æ╪▒ ╪Ñ┘è┘ç ╪º┘ä┘ä┘è ┘è╪¬╪¡╪╖ ┘ü╪╣┘ä╪º┘ï ╪╣┘ä┘ë `order.status` ┘ê╪Ñ┘è┘ç ╪º┘ä┘ä┘è ┘è╪¬╪¿╪╣╪¬ ┘ä┘ä╪╣╪▒╪╢/╪º┘ä╪Ñ╪┤╪╣╪º╪▒.
 * @returns {{ stored: string|null, notify: string }}
 *  - stored: ╪º┘ä┘é┘è┘à╪⌐ ╪º┘ä╪╡╪º┘ä╪¡╪⌐ ┘ä┘ä┘Ç enum ╪º┘ä┘ä┘è ╪¬╪¬╪«╪▓┘æ┘å (╪ú┘ê null ┘ä┘ê ╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘é╪º╪¿┘ä╪⌐ ┘ä┘ä╪¬╪«╪▓┘è┘å)
 *  - notify: ╪º┘ä┘â┘ê╪» ╪º┘ä┘ä┘è ┘å╪│╪¬╪«╪»┘à┘ç ┘ä┘ä┘é╪º┘ä╪¿ ┘ê╪º┘ä╪Ñ╪┤╪╣╪º╪▒ (╪º┘ä┘â┘ê╪» ╪º┘ä╪ú╪╡┘ä┘è ΓÇö ╪º┘ä┘à╪«╪╡╪╡ ╪ú┘ê ╪º┘ä┘å╪╕╪º┘à┘è)
 */
async function resolveOrderStatusForStorage(prisma, companyId, requestedStatus) {
  const requested = String(requestedStatus || '').trim().toUpperCase();

  if (isValidOrderStatusEnum(requested)) {
    return { stored: requested, notify: requested };
  }

  // ╪¡╪º┘ä╪⌐ ┘à╪«╪╡╪╡╪⌐ ΓåÆ ╪¼╪▒┘æ╪¿ mapsToSystem ┘à┘å ╪Ñ╪╣╪»╪º╪» ╪º┘ä╪┤╪▒┘â╪⌐
  let mapped = null;
  try {
    const config = await prisma.orderStatusConfig.findFirst({
      where: { companyId, code: { equals: requested, mode: 'insensitive' }, isActive: true },
      select: { mapsToSystem: true },
    });
    mapped = String(config?.mapsToSystem || '').trim().toUpperCase();
  } catch (e) {
    console.warn(`ΓÜá∩╕Å [ORDER-STATUS-ENUM] Failed to look up custom status "${requested}":`, e.message);
    mapped = null;
  }

  if (mapped && isValidOrderStatusEnum(mapped)) {
    return { stored: mapped, notify: requested };
  }

  return { stored: null, notify: requested };
}

module.exports = {
  VALID_ORDER_STATUS_ENUM,
  isValidOrderStatusEnum,
  resolveOrderStatusForStorage,
};
