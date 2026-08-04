/**
 * حالات داخلية مش بتتبعت للعميل (نفسها مستخدمة في WhatsAppNotificationService).
 * مصدر واحد للحقيقة عشان الـ UI والـ backend يتفقوا.
 */
const NON_NOTIFIABLE_STATUS_CODES = Object.freeze([
  'TRASH', 'TRASH_ORDER', 'DRAFT', 'DUPLICATE_ORDER', 'DELETED'
]);

function isNonNotifiableStatus(code) {
  return NON_NOTIFIABLE_STATUS_CODES.includes(String(code || '').toUpperCase());
}

module.exports = { NON_NOTIFIABLE_STATUS_CODES, isNonNotifiableStatus };
