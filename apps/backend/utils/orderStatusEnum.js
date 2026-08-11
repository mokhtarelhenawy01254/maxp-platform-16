/**
 * 🛡️ Order Status Enum Helpers
 * `order.status` في الداتابيز enum مقفول (قيم ثابتة). الحالات المخصصة اللي بيعملها التاجر
 * في `orderStatusConfig` (مثل DELAYED-WITH-CAPTAIN) مش جزء من الـ enum — فلو حد حاول
 * يكتبها مباشرة على `order.status` بيفشل الـ prisma بـ "Invalid value for argument `status`.
 * Expected OrderStatus."
 *
 * الحل: أي حالة مش في الـ enum لازم يبقى ليها `mapsToSystem` (حقل موجود في orderStatusConfig)
 * يشاور على حالة نظام صالحة. بنخزّن القيمة الصالحة في `order.status`، ونحتفظ بالكود المخصص
 * للعرض والقالب والإشعار. لو الحالة مش enum ومالهاش mapsToSystem صالح → مستحيل تخزّن.
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
 * يقرّر إيه اللي يتحط فعلاً على `order.status` وإيه اللي يتبعت للعرض/الإشعار.
 * @returns {{ stored: string|null, notify: string }}
 *  - stored: القيمة الصالحة للـ enum اللي تتخزّن (أو null لو الحالة غير قابلة للتخزين)
 *  - notify: الكود اللي نستخدمه للقالب والإشعار (الكود الأصلي — المخصص أو النظامي)
 */
async function resolveOrderStatusForStorage(prisma, companyId, requestedStatus) {
  const requested = String(requestedStatus || '').trim().toUpperCase();

  if (isValidOrderStatusEnum(requested)) {
    return { stored: requested, notify: requested };
  }

  // حالة مخصصة → جرّب mapsToSystem من إعداد الشركة
  let mapped = null;
  try {
    const config = await prisma.orderStatusConfig.findFirst({
      where: { companyId, code: requested, isActive: true },
      select: { mapsToSystem: true },
    });
    mapped = String(config?.mapsToSystem || '').trim().toUpperCase();
  } catch (e) {
    console.warn(`⚠️ [ORDER-STATUS-ENUM] Failed to look up custom status "${requested}":`, e.message);
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
