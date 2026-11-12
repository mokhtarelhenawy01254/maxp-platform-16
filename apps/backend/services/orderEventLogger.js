const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Canonical order event actions written to `activity_logs` (append-only).
 */
const ORDER_EVENT_ACTIONS = Object.freeze({
  ORDER_CREATED: 'order.created',
  PAYMENT_SUCCEEDED: 'order.payment.succeeded',
  PAYMENT_FAILED: 'order.payment.failed',
  PAYMENT_REFUNDED: 'order.payment.refunded',
  DISCOUNT_APPROVED: 'order.discount.approved',
  DISCOUNT_REJECTED: 'order.discount.rejected',
  ORDER_UPDATED: 'order.updated',
});

const ACTION_DESCRIPTIONS = {
  [ORDER_EVENT_ACTIONS.ORDER_CREATED]: 'إنشاء الطلب',
  [ORDER_EVENT_ACTIONS.PAYMENT_SUCCEEDED]: 'نجاح عملية الدفع الإلكتروني',
  [ORDER_EVENT_ACTIONS.PAYMENT_FAILED]: 'فشل عملية الدفع الإلكتروني',
  [ORDER_EVENT_ACTIONS.PAYMENT_REFUNDED]: 'استرداد مبلغ الدفع الإلكتروني',
  [ORDER_EVENT_ACTIONS.DISCOUNT_APPROVED]: 'اعتماد خصم الطلب',
  [ORDER_EVENT_ACTIONS.DISCOUNT_REJECTED]: 'رفض وإلغاء خصم الطلب',
  [ORDER_EVENT_ACTIONS.ORDER_UPDATED]: 'تحديث بيانات الطلب',
};

const SYSTEM_ACTOR_TOKENS = new Set([
  'SYSTEM',
  'SYSTEM_SYNC',
  'SYSTEM_WHATSAPP',
  'KASHIER_WEBHOOK',
  'WEBHOOK',
  'CRON',
  'AUTO',
  'TURBO SYNC',
  'AI',
  'BOT',
  'STOREFRONT',
]);

function isSystemActorToken(rawUserId) {
  if (!rawUserId || typeof rawUserId !== 'string') return true;
  const trimmed = rawUserId.trim();
  if (!trimmed) return true;
  const upper = trimmed.toUpperCase();
  return SYSTEM_ACTOR_TOKENS.has(upper) || upper.startsWith('SYSTEM_') || /\s/.test(trimmed);
}

function resolveSafeUserId(rawUserId) {
  if (isSystemActorToken(rawUserId)) return null;
  return rawUserId.trim();
}

/**
 * Single append-only writer for non-status order events in `activity_logs`.
 * Always sets `targetType: 'order'`, `targetId: orderId`, `category: 'orders'`, and `companyId`.
 */
async function logOrderEvent({
  prisma: injectedPrisma = null,
  companyId,
  orderId,
  orderNumber = null,
  action,
  userId = null,
  actorId = null,
  userName = null,
  description = null,
  before = undefined,
  after = undefined,
  metadata = {},
  severity = 'INFO',
  isSuccess = true,
} = {}) {
  try {
    const resolvedCompanyId = companyId || (metadata && typeof metadata === 'object' ? metadata.companyId : null);
    if (!resolvedCompanyId || !orderId || !action) {
      console.warn('⚠️ [ORDER-EVENT-LOGGER] Missing required fields (companyId/orderId/action), skipping log');
      return null;
    }

    const prisma = injectedPrisma || getSharedPrismaClient();
    if (!prisma?.activityLog?.create) {
      return null;
    }

    const parsedMeta =
      typeof metadata === 'string'
        ? (() => {
            try {
              return JSON.parse(metadata);
            } catch {
              return { rawMetadata: metadata };
            }
          })()
        : metadata && typeof metadata === 'object'
          ? { ...metadata }
          : {};

    const rawActorInput = actorId || userId;
    const safeUserId = resolveSafeUserId(rawActorInput);
    const trimmedActorToken =
      typeof rawActorInput === 'string' && rawActorInput.trim() && !safeUserId
        ? rawActorInput.trim()
        : null;

    const metaPayload = {
      ...parsedMeta,
      companyId: resolvedCompanyId,
      orderId,
      ...(orderNumber ? { orderNumber: String(orderNumber) } : {}),
      ...(before !== undefined && parsedMeta.before === undefined ? { before } : {}),
      ...(after !== undefined && parsedMeta.after === undefined ? { after } : {}),
      ...(userName && parsedMeta.userName === undefined ? { userName } : {}),
      ...(trimmedActorToken && parsedMeta.actorToken === undefined ? { actorToken: trimmedActorToken } : {}),
    };
    const resolvedDescription =
      (description && String(description).trim()) ||
      `${ACTION_DESCRIPTIONS[action] || action}${orderNumber ? ` (${orderNumber})` : ''}`;

    return await prisma.activityLog.create({
      data: {
        userId: safeUserId,
        companyId: resolvedCompanyId,
        category: 'orders',
        action,
        description: resolvedDescription,
        targetType: 'order',
        targetId: String(orderId),
        targetName: orderNumber ? String(orderNumber) : null,
        metadata: JSON.stringify(metaPayload),
        severity,
        isSuccess: isSuccess !== false,
        isLocked: true,
      },
    });
  } catch (err) {
    console.warn('⚠️ [ORDER-EVENT-LOGGER] Failed to write activity_logs:', err.message);
    return null;
  }
}

module.exports = {
  ORDER_EVENT_ACTIONS,
  logOrderEvent,
};
