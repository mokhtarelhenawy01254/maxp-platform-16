/**
 * 🚚 Central Backend Status Normalizer (Single Source of Truth)
 * Maps all raw statuses, webhook payloads, and API filters to canonical Turbo codes 1..13
 * and valid system OrderStatus & PaymentStatus enums.
 */

const CANONICAL_TURBO_MAP = {
  // Code 1: Saved / Created (تجهيز التاجر)
  'created': 'turbo_saved',
  'turbo_saved': 'turbo_saved',
  'status_1': 'turbo_saved',
  '1': 'turbo_saved',

  // Code 2: Sent to Turbo (مرسلة لتربو)
  'turbo_sent': 'turbo_sent',
  'sent': 'turbo_sent',
  'status_2': 'turbo_sent',
  '2': 'turbo_sent',

  // Code 3: Branch Processing / Pending (قيد التنفيذ بالفرع / قيد الانتظار)
  'processing': 'processing',
  'underway': 'processing',
  'accepted': 'processing',
  'قيد الانتظار': 'processing',
  'انتظار': 'processing',
  'قيد التنفيذ بالفرع': 'processing',
  'status_3': 'processing',
  '3': 'processing',

  // Code 4: Out for delivery / Captain (مسلمة للمندوب)
  'out_for_delivery': 'out_for_delivery',
  'under delivery': 'out_for_delivery',
  'with captain': 'out_for_delivery',
  'in transit': 'out_for_delivery',
  'shipped': 'out_for_delivery',
  'status_4': 'out_for_delivery',
  '4': 'out_for_delivery',

  // Code 5: Returned to Company (مرتجعات بالشركة)
  'returned_to_company': 'returned_to_company',
  'returned with company': 'returned_to_company',
  'مرتجع مع الشركة': 'returned_to_company',
  'مرتجعات بالشركة': 'returned_to_company',
  'راجع بالشركة': 'returned_to_company',
  'status_5': 'returned_to_company',
  'status_14': 'returned_to_company',
  '5': 'returned_to_company',
  '14': 'returned_to_company',

  // Code 6: Cancelled (ملغي من الشحن)
  'cancelled': 'cancelled',
  'ملغي من الشحن': 'cancelled',
  'ملغي': 'cancelled',
  'ملغية': 'cancelled',
  'status_6': 'cancelled',
  '6': 'cancelled',

  // Code 7: Delivered (تم التسليم)
  'delivered': 'delivered',
  'تم التسليم': 'delivered',
  'تسليم': 'delivered',
  'تم الاستلام': 'delivered',
  'status_7': 'delivered',
  '7': 'delivered',

  // Code 8: Remitted (تم التوريد والتحصيل)
  'remitted': 'remitted',
  'supplied': 'remitted',
  'تم التوريد والتحصيل': 'remitted',
  'موردة': 'remitted',
  'status_8': 'remitted',
  'status_19': 'remitted',
  '8': 'remitted',
  '19': 'remitted',

  // Code 9: Archived (شحنة محذوفة)
  'archived': 'archived',
  'status_9': 'archived',
  '9': 'archived',

  // Code 10: Returned Resent (معاد إرسالها)
  'returned_resent': 'returned_resent',
  'معاد إرسالها': 'returned_resent',
  'status_10': 'returned_resent',
  'status_15': 'returned_resent',
  '10': 'returned_resent',
  '15': 'returned_resent',

  // Code 11: Returned Missing (مرتجع مفقود)
  'returned_missing': 'returned_missing',
  'lost': 'returned_missing',
  'مرتجع مفقود': 'returned_missing',
  'status_11': 'returned_missing',
  'status_16': 'returned_missing',
  '11': 'returned_missing',
  '16': 'returned_missing',

  // Code 12: Returned Destroyed (مرتجع معدوم)
  'returned_destroyed': 'returned_destroyed',
  'مرتجع معدوم': 'returned_destroyed',
  'status_12': 'returned_destroyed',
  'status_17': 'returned_destroyed',
  '12': 'returned_destroyed',
  '17': 'returned_destroyed',

  // Code 13: Delayed (مؤجلة مع المندوب)
  'delayed': 'delayed',
  'on hold': 'delayed',
  'failed delivery': 'delayed',
  'rescheduled': 'delayed',
  'مؤجلة': 'delayed',
  'مؤجله': 'delayed',
  'مؤجل': 'delayed',
  'تأجيل': 'delayed',
  'مؤجلة مع المندوب': 'delayed',
  'قيد الانتظار مع المندوب': 'delayed',
  'status_13': 'delayed',
  '13': 'delayed'
};

const SYSTEM_STATUS_MAPPING = {
  'turbo_saved': { orderStatus: null, paymentStatus: null },
  'turbo_sent': { orderStatus: null, paymentStatus: null },
  'processing': { orderStatus: 'PROCESSING', paymentStatus: null },
  'out_for_delivery': { orderStatus: 'SHIPPED', paymentStatus: null },
  'delivered': { orderStatus: 'DELIVERED', paymentStatus: 'COMPLETED' },
  'remitted': { orderStatus: 'DELIVERED', paymentStatus: 'COMPLETED' },
  'returned_to_company': { orderStatus: 'RETURNED', paymentStatus: null },
  'returned_resent': { orderStatus: 'PROCESSING', paymentStatus: null },
  'returned_missing': { orderStatus: 'RETURNED', paymentStatus: null },
  'returned_destroyed': { orderStatus: 'RETURNED', paymentStatus: null },
  'cancelled': { orderStatus: 'CANCELLED', paymentStatus: null },
  'delayed': { orderStatus: 'ON_HOLD', paymentStatus: null },
  'archived': { orderStatus: null, paymentStatus: null }
};

const normalizeTurboStatus = (rawStatus) => {
  if (!rawStatus) return 'turbo_saved';
  const key = String(rawStatus).toLowerCase().trim();
  return CANONICAL_TURBO_MAP[key] || key;
};

/**
 * Maps any raw Turbo status code/string to the canonical Turbo status string
 * and valid system OrderStatus & PaymentStatus enums.
 */
const getSystemStatusFromTurbo = (rawStatus) => {
  const canonical = normalizeTurboStatus(rawStatus);
  const mapped = SYSTEM_STATUS_MAPPING[canonical] || { orderStatus: null, paymentStatus: null };
  return {
    canonicalTurboStatus: canonical,
    orderStatus: mapped.orderStatus,
    paymentStatus: mapped.paymentStatus
  };
};

module.exports = {
  CANONICAL_TURBO_MAP,
  SYSTEM_STATUS_MAPPING,
  normalizeTurboStatus,
  getSystemStatusFromTurbo
};
