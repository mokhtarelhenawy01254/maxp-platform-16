// 🚨 PRODUCTION-FIX (notifications-fix-plan §5.1):
// نواة أنواع الإشعارات (persistence mapping + isOrderCategory) — دوال نقية بلا DB/جلسات.
// مستخرجة من WhatsAppNotificationService.js؛ تُستخدم من الخدمة والـ dedup معاً.

const PERSISTED_EVENT_TYPE_FALLBACKS = {
  TASK_CREATED: 'ANNOUNCEMENT',
  TASK_COMMENTED: 'ANNOUNCEMENT',
  TASK_STATUS_CHANGED: 'ANNOUNCEMENT',
  TASK_DEADLINE_REMINDER: 'ANNOUNCEMENT',
  AUTO_DISCOUNT_COUPON_GRANTED: 'COUPON_SENT',
  AUTO_DISCOUNT_COUPON_EXPIRING: 'COUPON_SENT',
  AUTO_DISCOUNT_CASHBACK_CONVERTED: 'CASHBACK_CREDITED'
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
  // 🛡️ PRODUCTION-FIX (prep-stage-alias): أكواد خط التجهيز بتتخزّن في الـ enum
  // بأسماء مختلفة (normalizeWhatsAppOrderStatus) — من غير المapping ده كان
  // getPersistedNotificationEventType بيرجّع ANNOUNCEMENT ويبوّظ الـ dedup الموحّد.
  PREPARING: 'PICKING',
  PACKAGED: 'PACKED',
  // الحالات القياسية الست — تطابق statusEventMap في sendOrderStatusNotification
  CONFIRMED: 'ORDER_CONFIRMED',
  PROCESSING: 'ORDER_PROCESSING',
  SHIPPED: 'ORDER_SHIPPED',
  OUT_FOR_DELIVERY: 'ORDER_OUT_FOR_DELIVERY',
  DELIVERED: 'ORDER_DELIVERED',
  CANCELLED: 'ORDER_CANCELLED',
  // 🛡️ حالات العجز (المخزون والنهائي) — تربط بحالات الطلبات لضمان التصنيف كـ ORDER
  STOCK_SHORTAGE: 'LOW_STOCK_ALERT',
  SHORTAGE_FAILED: 'ORDER_CANCELLED'
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
    evt.startsWith('PAYMENT_') ||
    // 🚨 PRODUCTION-FIX: الكودات الخام لحالات الطلبات (DELIVERED/confirmed/returned...)
    // بتتخزّن كـ eventType من sendOrderStatusNotification مش بتبدأ بـ ORDER_،
    // فكانت بتقع في الـ default وبيتخلق منها قالب ميتا MARKETING بدل UTILITY
    // (مثال حقيقي: حالة "delivered" → قالب deliveredmsj72rwc).
    ORDER_STATUS_TO_EVENT_TYPE[evt] !== undefined
  );
}
const PERSISTED_CATEGORY_FALLBACKS = {
  TASKS: 'HR'
};
const VALID_PERSISTED_RECIPIENT_TYPES = new Set(['CUSTOMER', 'EMPLOYEE', 'ADMIN']);

// 🛡️ PRODUCTION-FIX (custom-status-enum): قيم enum `whatsapp_notification_logs_eventType` الصالحة.
// الحالات المخصصة من التاجر (مثل DELAYED-WITH-CAPTAIN) مش جزء من الـ enum — لو وصلت هنا
// بيكسر الـ whatsAppNotificationLog.create (والـ raw SQL CAST) قبل الإرسال. أي قيمة مش في
// المجموعة دي بنرميها على قيمة آمنة (ANNOUNCEMENT) عشان الإشعار يكمّل بدل ما يفشل.
// ⚠️ حافظ على القايمة متزامنة مع `enum WhatsAppNotificationLogsEventType` في prisma/schema/enums.prisma
const VALID_WHATSAPP_EVENT_TYPES = new Set([
  'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_SHIPPED',
  'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'PAYMENT_REMINDER',
  'BACK_IN_STOCK', 'PROMOTIONAL', 'ORDER_REFUNDED', 'PAYMENT_RECEIVED', 'PRICE_DROP',
  'NEW_PRODUCT', 'LOW_STOCK_ALERT', 'CART_ABANDONED_1H', 'CART_ABANDONED_24H',
  'CART_ABANDONED_72H', 'CART_ABANDONED_WITH_DISCOUNT', 'INCOMPLETE_CART_FIRST_APPEARANCE',
  'COUPON_SENT', 'BIRTHDAY_WISH', 'LOYALTY_POINTS', 'LOYALTY_POINTS_AWARDED',
  'LOYALTY_REWARD', 'LOYALTY_TIER_UPGRADED', 'LOYALTY_TIER_DOWNGRADED',
  'LOYALTY_POINTS_EXPIRY_WARNING', 'LOYALTY_POINTS_EXPIRED', 'LOYALTY_POINTS_REDEEMED',
  'CASHBACK_CREDITED', 'CASHBACK_REVERSED', 'CUSTOMER_QUALITY_UPGRADED',
  'CUSTOMER_QUALITY_DOWNGRADED', 'REVIEW_REQUEST', 'ATTENDANCE_REMINDER',
  'ATTENDANCE_CONFIRMED', 'ATTENDANCE_LATE', 'ATTENDANCE_LATE_WITH_DEDUCTION',
  'CHECKOUT_CONFIRMED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'PAYROLL_READY',
  'BIRTHDAY_EMPLOYEE', 'WARNING_ISSUED', 'CONTRACT_EXPIRY', 'TRAINING_REMINDER',
  'ANNOUNCEMENT', 'OTP', 'ASSET_REQUEST_APPROVED', 'ASSET_REQUEST_REJECTED',
  'ASSET_REQUEST_FULFILLED', 'MANUAL_DEDUCTION', 'NEW_SIGNUP_WELCOME',
  'NEW_SIGNUP_ADMIN_ALERT', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_RENEWED',
  'SUBSCRIPTION_CANCELLED', 'NEWSLETTER_SUBSCRIBED', 'BENEFIT_GRANTED',
  'DRAFT', 'PENDING', 'AWAITING_CUSTOMER_INFO', 'AWAITING_VERIFICATION',
  'AWAITING_APPROVAL', 'QUOTE_SENT', 'QUOTE_APPROVED', 'PENDING_PAYMENT',
  'PAYMENT_INITIATED', 'PAYMENT_PROCESSING', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED',
  'PAYMENT_PARTIALLY_CAPTURED', 'PAYMENT_DECLINED', 'PAYMENT_EXPIRED', 'PARTIAL_REFUND',
  'CHARGEBACK', 'CHARGEBACK_RESOLVED', 'COD_PENDING', 'COD_CONFIRMED', 'UNDER_REVIEW',
  'AWAITING_STOCK', 'BACKORDERED', 'PRE_ORDER', 'ALLOCATED', 'PICKING', 'QUALITY_CHECK',
  'PACKED', 'LABEL_CREATED', 'READY_FOR_PICKUP', 'READY_TO_SHIP', 'CANCEL_REQUESTED',
  'CANCELLATION_UNDER_REVIEW', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN',
  'CANCELLED_BY_SYSTEM', 'ORDER_EXPIRED', 'RETURN_REQUESTED', 'RETURN_UNDER_REVIEW',
  'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKUP_SCHEDULED', 'RETURN_IN_TRANSIT',
  'RETURN_RECEIVED', 'RETURN_INSPECTED', 'REFUND_PROCESSING', 'EXCHANGE_REQUESTED',
  'EXCHANGE_APPROVED', 'EXCHANGE_SHIPPED', 'EXCHANGE_COMPLETED', 'FRAUD_SUSPECTED',
  'BLACKLISTED_CUSTOMER', 'MANUAL_REVIEW_REQUIRED', 'SPLIT_SHIPMENT', 'MERGED_ORDER',
  'DUPLICATE_ORDER', 'ON_HOLD', 'ESCALATED', 'DISPUTED', 'AWAITING_DOCUMENTS',
  'SHIPMENT_CREATED', 'IN_TRANSIT', 'AT_SORTING_FACILITY', 'AT_LOCAL_HUB',
  'CUSTOMS_CLEARANCE', 'CUSTOMS_HOLD', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED',
  'DELIVERY_FAILED', 'RESCHEDULED_DELIVERY', 'AWAITING_PICKUP_BRANCH',
  'PARTIALLY_DELIVERED', 'LOST_IN_TRANSIT', 'DAMAGED_IN_TRANSIT', 'RETURNED_TO_SENDER',
  'ORDER_RETURNED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'WELCOME_MESSAGE',
  'ABANDONED_CART', 'PRODUCT_REVIEW_REQUEST', 'BIRTHDAY_GREETING',
]);

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

  const fallback = PERSISTED_EVENT_TYPE_FALLBACKS[eventType];
  if (fallback) return fallback;

  // 🛡️ PRODUCTION-FIX (custom-status-enum): لو القيمة مش enum صالح للسجل — نرجّع قيمة آمنة
  // عشان السجل مايكسرش الإرسال. القوالب بتتلقط بـ eventType/fallbackEventType مش بالـ persisted.
  if (VALID_WHATSAPP_EVENT_TYPES.has(upper)) {
    return upper;
  }

  console.warn(`⚠️ [NOTIFY-TYPES] Unknown event type "${eventType}" → falling back to ANNOUNCEMENT for log persistence.`);
  return 'ANNOUNCEMENT';
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
  VALID_WHATSAPP_EVENT_TYPES,
};
