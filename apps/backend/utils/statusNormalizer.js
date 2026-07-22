/**
 * 🚚 Central Backend Status Normalizer (Single Source of Truth)
 * Maps all raw statuses, webhook payloads, and API filters to canonical Turbo codes 1..13
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

  // Code 3: Branch Processing (قيد التنفيذ بالفرع)
  'processing': 'processing',
  'status_3': 'processing',
  '3': 'processing',

  // Code 4: Out for delivery / Captain (مسلمة للمندوب)
  'out_for_delivery': 'out_for_delivery',
  'status_4': 'out_for_delivery',
  '4': 'out_for_delivery',

  // Code 5: Returned to Company (مرتجعات بالشركة)
  'returned_to_company': 'returned_to_company',
  'status_5': 'returned_to_company',
  'status_14': 'returned_to_company',
  '5': 'returned_to_company',
  '14': 'returned_to_company',

  // Code 6: Cancelled (ملغي من الشحن)
  'cancelled': 'cancelled',
  'status_6': 'cancelled',
  '6': 'cancelled',

  // Code 7: Delivered (تم التسليم)
  'delivered': 'delivered',
  'status_7': 'delivered',
  '7': 'delivered',

  // Code 8: Remitted (تم التوريد والتحصيل)
  'remitted': 'remitted',
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
  'status_10': 'returned_resent',
  'status_15': 'returned_resent',
  '10': 'returned_resent',
  '15': 'returned_resent',

  // Code 11: Returned Missing (مرتجع مفقود)
  'returned_missing': 'returned_missing',
  'status_11': 'returned_missing',
  'status_16': 'returned_missing',
  '11': 'returned_missing',
  '16': 'returned_missing',

  // Code 12: Returned Destroyed (مرتجع معدوم)
  'returned_destroyed': 'returned_destroyed',
  'status_12': 'returned_destroyed',
  'status_17': 'returned_destroyed',
  '12': 'returned_destroyed',
  '17': 'returned_destroyed',

  // Code 13: Delayed (مؤجلة مع المندوب)
  'delayed': 'delayed',
  'status_13': 'delayed',
  '13': 'delayed'
};

const normalizeTurboStatus = (rawStatus) => {
  if (!rawStatus) return 'turbo_saved';
  const key = String(rawStatus).toLowerCase().trim();
  return CANONICAL_TURBO_MAP[key] || key;
};

module.exports = {
  CANONICAL_TURBO_MAP,
  normalizeTurboStatus
};
