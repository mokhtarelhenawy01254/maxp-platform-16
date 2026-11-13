'use strict';

/**
 * حساب نافذة الـ24 ساعة للرد على فيسبوك (Task f508775c).
 *
 * النافذة بتبدأ من آخر رسالة واردة من العميل (isFromCustomer=true) وبتقفل بعد 24 ساعة.
 * الدالة خالصة (بدون Prisma) عشان تتست لوحدها، والسيرفر بيستخدمها قبل أي استدعاء لميتا.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * @param {object} input
 * @param {Date|string|number|null} input.lastInboundAt آخر رسالة واردة من العميل
 * @param {Date|string|number} [input.now] للحقن في التيستات
 * @returns {{windowExpiresAt: Date|null, isWindowExpired: boolean, hoursSinceExpiration: number, msRemaining: number}}
 */
function computeFacebookWindow({ lastInboundAt, now } = {}) {
  const nowMs = now === undefined ? Date.now() : new Date(now).getTime();

  if (!lastInboundAt) {
    // مفيش رسالة واردة أصلًا => النافذة مقفولة
    return {
      windowExpiresAt: null,
      isWindowExpired: true,
      hoursSinceExpiration: 24,
      msRemaining: 0,
    };
  }

  const inboundMs = new Date(lastInboundAt).getTime();
  if (!Number.isFinite(inboundMs)) {
    return {
      windowExpiresAt: null,
      isWindowExpired: true,
      hoursSinceExpiration: 24,
      msRemaining: 0,
    };
  }

  const expiresMs = inboundMs + WINDOW_MS;
  const isWindowExpired = nowMs > expiresMs;
  const msRemaining = Math.max(0, expiresMs - nowMs);

  return {
    windowExpiresAt: new Date(expiresMs),
    isWindowExpired,
    hoursSinceExpiration: isWindowExpired
      ? Math.max(0, Math.floor((nowMs - expiresMs) / (1000 * 60 * 60)))
      : 0,
    msRemaining,
  };
}

function resolveFacebookLastInboundAt(conversation, lastInboundMsg) {
  if (lastInboundMsg?.createdAt) {
    const d = new Date(lastInboundMsg.createdAt);
    if (!isNaN(d.getTime())) return d;
  }

  // إذا كانت آخر رسالة مسجلة في المحادثة من العميل، نعتمد تاريخ آخر رسالة
  if (conversation?.lastMessageIsFromCustomer) {
    const fallbackDate = conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt;
    if (fallbackDate) {
      const d = new Date(fallbackDate);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // إذا كانت المحادثة نفسها أنشئت خلال الـ 24 ساعة الماضية، تعتبر النافذة مفتوحة
  if (conversation?.createdAt) {
    const createdDate = new Date(conversation.createdAt);
    if (!isNaN(createdDate.getTime())) {
      const msSinceCreation = Date.now() - createdDate.getTime();
      if (msSinceCreation >= 0 && msSinceCreation < WINDOW_MS) {
        return createdDate;
      }
    }
  }

  return null;
}

module.exports = { computeFacebookWindow, resolveFacebookLastInboundAt, WINDOW_MS };
