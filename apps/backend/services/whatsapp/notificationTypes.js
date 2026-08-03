// 🚨 PRODUCTION-FIX (notifications-fix-plan §5.1):
// نواة أنواع الإشعارات (persistence mapping + isOrderCategory) — دوال نقية بلا DB/جلسات.
// مستخرجة من WhatsAppNotificationService.js؛ تُستخدم من الخدمة والـ dedup معاً.

const PERSISTED_EVENT_TYPE_FALLBACKS = {
  TASK_CREATED: 'ANNOUNCEMENT',
  TASK_COMMENTED: 'ANNOUNCEMENT',
  TASK_STATUS_CHANGED: 'ANNOUNCEMENT',
  TASK_DEADLINE_REMINDER: 'ANNOUNCEMENT'
};

// 🚨 PRODUCTION-FIX (notifications-fix-plan §2.1-pre + §3.1):
// حوّل raw order status codes إلى قيم enum صالحة لـ whatsAppNotificationLog /
// whatsAppNotificationQueue — وهذه القيم نفسها هي ما يخزّنه sendOrderStatusNotification
// فعلاً (statusEventMap → 'ORDER_*' للحالات الست القياسية، وORDER_RETURNED/... للـ returns).
// لذلك تُستخدم نفس الخريطة كمفتاح الـ dedup الموحّد (حتى يطابق الـ log).
const ORDER_STATUS_TO_EVENT_TYPE = {
  RETURNED: 'ORDER_RETURNED',
  PARTIALLY_RETURNED: 'ORDER_RETURNED',
  REFUNDED: 'ORDER_REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIAL_REFUND',
  EXCHANGED: 'ORDER_RETURNED',
  // الحالات القياسية الست — تطابق statusEventMap في sendOrderStatusNotification
  CONFIRMED: 'ORDER_CONFIRMED',
  PROCESSING: 'ORDER_PROCESSING',
  SHIPPED: 'ORDER_SHIPPED',
  OUT_FOR_DELIVERY: 'ORDER_OUT_FOR_DELIVERY',
  DELIVERED: 'ORDER_DELIVERED',
  CANCELLED: 'ORDER_CANCELLED'
};

/**
 * هل هذا الحدث خاص بالطلبات؟
 * القوالب المرتبطة بالطلبات تُدار من صفحة /orders/status-templates فقط،
 * ولا يجوز أن نقع على القوالب المثبتة في الكود أو النص الحر عند غيابها.
 */
function isOrderCategory(category, eventType) {
  const cat = String(category || '').toUpperCase();
  const evt = String(eventType || '').toUpperCase();
  return (
    cat === 'ORDER' ||
    cat === 'ORDERS' ||
    evt.startsWith('ORDER_') ||
    evt === 'PAYMENT_REMINDER' ||
    evt.startsWith('PAYMENT_')
  );
}
const PERSISTED_CATEGORY_FALLBACKS = {
  TASKS: 'HR'
};
const VALID_PERSISTED_RECIPIENT_TYPES = new Set(['CUSTOMER', 'EMPLOYEE', 'ADMIN']);

function getPersistedNotificationEventType(eventType) {
  const upper = String(eventType || '').toUpperCase();
  if (upper.startsWith('TASK_')) {
    return 'ANNOUNCEMENT';
  }

  // 🚨 PRODUCTION-FIX (notifications-fix-plan §2.1-pre):
  // raw order status codes (RETURNED/REFUNDED/EXCHANGED...) → قيم enum صالحة
  if (ORDER_STATUS_TO_EVENT_TYPE[upper]) {
    return ORDER_STATUS_TO_EVENT_TYPE[upper];
  }

  return PERSISTED_EVENT_TYPE_FALLBACKS[eventType] || eventType;
}

function getPersistedNotificationCategory(category, eventType) {
  const normalizedCategory = String(category || '').toUpperCase();
  if (PERSISTED_CATEGORY_FALLBACKS[normalizedCategory]) {
    return PERSISTED_CATEGORY_FALLBACKS[normalizedCategory];
  }

  if (normalizedCategory) {
    return normalizedCategory;
  }

  if (String(eventType || '').toUpperCase().startsWith('TASK_')) {
    return 'HR';
  }

  return 'GENERAL';
}

function getPersistedNotificationRecipientType(recipientType) {
  const normalizedRecipientType = String(recipientType || 'CUSTOMER').toUpperCase();
  return VALID_PERSISTED_RECIPIENT_TYPES.has(normalizedRecipientType)
    ? normalizedRecipientType
    : 'CUSTOMER';
}

module.exports = {
  isOrderCategory,
  getPersistedNotificationEventType,
  getPersistedNotificationCategory,
  getPersistedNotificationRecipientType,
};
