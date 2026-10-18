/**
 * 🚚 Central Backend Status Normalizer (Single Source of Truth)
 * Maps all raw statuses, webhook payloads, and API filters to canonical Turbo codes 1..13
 * and valid system OrderStatus & PaymentStatus enums.
 */

const CANONICAL_TURBO_MAP = {
  // Saved locally / Created (تجهيز التاجر) — لم يُسلَّم لتربو بعد
  'created': 'turbo_saved',
  'turbo_saved': 'turbo_saved',
  'booked': 'turbo_sent',

  // Turbo status_code 1 = "قيد الانتظار" (البوليصة حُجِزت وبانتظار استلام المندوب).
  // PRODUCTION-FIX (turbo-code1-unify): كان بين,map لـ turbo_saved بينما النص العربي
  // "قيد الانتظار" بين,map لـ turbo_sent — نفس الحالة بقع في تصنيفين مختلفين حسب
  // مصدر التحديث (رقم من الويب هوك / نص من الـ API). وحّدناها على turbo_sent.
  'status_1': 'turbo_sent',
  '1': 'turbo_sent',

  // Code 2: Sent / Waiting Pickup (قيد الانتظار / مرسلة لتربو)
  'turbo_sent': 'turbo_sent',
  'sent': 'turbo_sent',
  'waiting': 'turbo_sent',
  'pending': 'turbo_sent',
  'قيد الانتظار': 'turbo_sent',
  'قيد الإنتظار': 'turbo_sent',
  'انتظار': 'turbo_sent',
  'بانتظار الاستلام': 'turbo_sent',
  'بانتظار المندوب': 'turbo_sent',
  'في انتظاري التسليم لتربو': 'turbo_sent',
  'في انتظار التسليم لتربو': 'turbo_sent',
  'في انتظار التسليم': 'turbo_sent',
  'في انتظار استلام مندوب تربو': 'turbo_sent',
  'تسليم لتربو': 'turbo_sent',
  'status_2': 'turbo_sent',
  '2': 'turbo_sent',

  // Code 3: Branch Processing (قيد التنفيذ بالفرع)
  'processing': 'processing',
  'preparing': 'processing',
  'underway': 'processing',
  'accepted': 'processing',
  'قيد التنفيذ': 'processing',
  'قيد التنفيذ بالفرع': 'processing',
  'تنفيذ': 'processing',
  'المقبوله': 'processing',
  'status_3': 'processing',
  '3': 'processing',

  // Code 4: Out for delivery / Captain (مسلمة للمندوب)
  'out_for_delivery': 'out_for_delivery',
  'under delivery': 'out_for_delivery',
  'with captain': 'out_for_delivery',
  'in transit': 'out_for_delivery',
  'shipped': 'out_for_delivery',
  'مسلمة للمندوب': 'out_for_delivery',
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
  'مرتجعة': 'returned_to_customer',

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

  // Code 20: Returned Received (مرتجعات وصلتني)
  'returned_received': 'returned_received',
  'مرتجعات وصلتني': 'returned_received',
  'status_20': 'returned_received',
  '20': 'returned_received',

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
  '13': 'delayed',

  // Code 18: Incomplete (غير مكتملة)
  'incomplete': 'incomplete',
  'غير مكتملة': 'incomplete',
  'status_18': 'incomplete',
  '18': 'incomplete',
  // كود 99 من /search-order = "غير مكتملة" في تربو (لايف 2026-10-17)
  '99': 'incomplete',
};

const SYSTEM_STATUS_MAPPING = {
  'turbo_saved': { orderStatus: null, paymentStatus: null },
  'turbo_sent': { orderStatus: null, paymentStatus: null },
  'processing': { orderStatus: 'PROCESSING', paymentStatus: null },
  'out_for_delivery': { orderStatus: 'SHIPPED', paymentStatus: null },
  'delivered': { orderStatus: 'DELIVERED', paymentStatus: 'COMPLETED' },
  'remitted': { orderStatus: 'DELIVERED', paymentStatus: 'COMPLETED' },
  'returned_to_company': { orderStatus: 'RETURNED', paymentStatus: null },
  'returned_received': { orderStatus: 'RETURNED', paymentStatus: null },
  'returned_to_customer': { orderStatus: 'RETURNED', paymentStatus: null },
  'returned_resent': { orderStatus: 'SHIPPED', paymentStatus: null },
  'returned_missing': { orderStatus: 'RETURNED', paymentStatus: null },
  'returned_destroyed': { orderStatus: 'RETURNED', paymentStatus: null },
  'cancelled': { orderStatus: 'CANCELLED', paymentStatus: null },
  'delayed': { orderStatus: 'SHIPPED', paymentStatus: null },
  'incomplete': { orderStatus: null, paymentStatus: null },
  'archived': { orderStatus: null, paymentStatus: null }
};

const normalizeTurboStatus = (rawStatus) => {
  if (!rawStatus) return 'turbo_saved';
  const key = String(rawStatus).toLowerCase().trim();
  if (CANONICAL_TURBO_MAP[key]) return CANONICAL_TURBO_MAP[key];

  // Specific substring checks first (avoid generic substring hijacking)
  if (key.includes('مرتجعة للعميل') || key.includes('للعميل')) return 'returned_to_customer';
  if (key.includes('وصلتني') || key.includes('وصلت الشحنة للمرسل')) return 'returned_received';
  if (key.includes('معاد إرسال') || key.includes('معاد ارسال') || key.includes('اعادة ارسال') || key.includes('إعادة إرسال')) return 'returned_resent';
  if (key.includes('مفقود') || key.includes('ضائع')) return 'returned_missing';
  if (key.includes('معدوم') || key.includes('تالف') || key.includes('إعدام') || key.includes('تلف')) return 'returned_destroyed';
  if (key.includes('تسليم') || key.includes('استلام')) return 'delivered';
  if (key.includes('موردة') || key.includes('توريد') || key.includes('تحصيل')) return 'remitted';
  if (key.includes('غير مكتمل')) return 'incomplete';
  if (key.includes('مؤجل') || key.includes('تأجيل')) return 'delayed';
  if (key.includes('ملغي') || key.includes('إلغاء')) return 'cancelled';
  if (key.includes('تنفيذ')) return 'processing';
  if (key.includes('مندوب') || key.includes('كابتن') || key.includes('توزيع') || key.includes('في الطريق')) return 'out_for_delivery';
  if (key.includes('انتظار') || key.includes('بانتظار') || key.includes('التسليم لتربو')) return 'turbo_sent';

  // Generic fallback checks last
  if (key.includes('مرتجع') || key.includes('مسترجع') || key.includes('راجع')) return 'returned_to_company';

  return key;
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

/**
 * Maps a raw Turbo status using per-company custom mapping, falling back to the hard-coded defaults.
 * @param {string} rawStatus - Raw status from Turbo API/webhook
 * @param {Object|null} customMapping - Per-company mapping { turboStatus: { orderStatus: 'STATUS' } }
 */
const getSystemStatusFromTurboWithCustomMapping = (rawStatus, customMapping) => {
  const canonical = normalizeTurboStatus(rawStatus);
  const defaultResult = getSystemStatusFromTurbo(rawStatus);

  if (customMapping && customMapping[canonical] && customMapping[canonical].orderStatus) {
    const mappedOrderStatus = customMapping[canonical].orderStatus;
    return {
      canonicalTurboStatus: canonical,
      orderStatus: mappedOrderStatus,
      paymentStatus: mappedOrderStatus === 'DELIVERED' ? 'COMPLETED' : null
    };
  }

  return defaultResult;
};

/**
 * Returns the list of canonical Turbo statuses with Arabic labels for the UI.
 */
const TURBO_STATUS_DEFINITIONS = {
  turbo_saved: { labelAr: 'تم الحفظ (بانتظار الإرسال)', labelEn: 'Saved (Pending Send)' },
  turbo_sent: { labelAr: 'مرسلة لتربو', labelEn: 'Sent to Turbo' },
  processing: { labelAr: 'قيد التنفيذ بالفرع', labelEn: 'Branch Processing' },
  out_for_delivery: { labelAr: 'مسلمة للمندوب', labelEn: 'Out for Delivery' },
  delivered: { labelAr: 'تم التسليم', labelEn: 'Delivered' },
  remitted: { labelAr: 'تم التوريد والتحصيل', labelEn: 'Remitted' },
  returned_to_company: { labelAr: 'مرتجعات بالشركة', labelEn: 'Returned to Company' },
  returned_received: { labelAr: 'مرتجعات وصلتني', labelEn: 'Returned Received' },
  returned_to_customer: { labelAr: 'مرتجعة للعميل', labelEn: 'Returned to Customer' },
  returned_resent: { labelAr: 'معاد إرسالها', labelEn: 'Returned Resent' },
  returned_missing: { labelAr: 'مرتجع مفقود', labelEn: 'Returned Missing' },
  returned_destroyed: { labelAr: 'مرتجع معدوم', labelEn: 'Returned Destroyed' },
  cancelled: { labelAr: 'ملغي', labelEn: 'Cancelled' },
  delayed: { labelAr: 'مؤجلة', labelEn: 'Delayed' },
  incomplete: { labelAr: 'غير مكتملة', labelEn: 'Incomplete' },
  archived: { labelAr: 'مؤرشفة', labelEn: 'Archived' }
};

/**
 * 🎯 Unified Carrier Shipment Stage Classifier
 * Classifies any shipment status string or Turbo status into one of the 13 canonical operational carrier stages.
 * Guaranteed consistent across UI filters, shipment statements, and stage metrics cards.
 *
 * @param {string|null} rawStatus - Shipment status (e.g. from prisma.shipment.status)
 * @param {string|null} [turboStatus] - Order Turbo shipment status (from order.turboShipmentStatus)
 * @returns {string} One of: incomplete, turbo_sent, processing, out_for_delivery, delayed,
 *                   delivered, returned_to_company, returned_destroyed, returned_missing,
 *                   returned_resent, remitted, returned_received, cancelled
 */
const classifyCarrierShipmentStage = (rawStatus, turboStatus = null) => {
  const s = String(turboStatus || rawStatus || '').toLowerCase().trim();
  if (!s) return 'incomplete';

  // Specific incomplete codes
  if (['incomplete', 'status_18', 'status_99', '18', '99'].includes(s) || s.includes('غير مكتمل')) {
    return 'incomplete';
  }

  // Waiting / Sent to carrier (Code 1, Code 2, turbo_sent, booked)
  if (
    ['turbo_sent', 'sent', 'waiting', 'pending', 'status_1', 'status_2', '1', '2', 'booked'].includes(s) ||
    s.includes('انتظار') || s.includes('بانتظار') || s.includes('التسليم لتربو')
  ) {
    return 'turbo_sent';
  }

  // Branch Processing (Code 3)
  if (
    ['processing', 'underway', 'accepted', 'status_3', '3', 'preparing'].includes(s) ||
    s.includes('تنفيذ') || s.includes('المقبوله')
  ) {
    return 'processing';
  }

  // Out for delivery / With Courier (Code 4)
  if (
    ['out_for_delivery', 'under delivery', 'with captain', 'in transit', 'shipped', 'delivering', 'status_4', '4'].includes(s) ||
    s.includes('مسلمة للمندوب') || s.includes('توصيل') || s.includes('في الطريق')
  ) {
    return 'out_for_delivery';
  }

  // Delayed / On Hold (Code 13)
  if (
    ['delayed', 'on hold', 'on_hold', 'status_13', '13'].includes(s) ||
    s.includes('مؤجل') || s.includes('تأجيل') || s.includes('معلق')
  ) {
    return 'delayed';
  }

  // Delivered (Code 7)
  if (
    ['delivered', 'completed', 'status_7', '7'].includes(s) ||
    s.includes('تسليم') || s.includes('استلام')
  ) {
    return 'delivered';
  }

  // Returned - Subtypes
  if (['returned_destroyed', 'status_12', 'status_17', '12', '17'].includes(s) || s.includes('معدوم') || s.includes('تالف')) {
    return 'returned_destroyed';
  }
  if (['returned_missing', 'lost', 'status_11', 'status_16', '11', '16'].includes(s) || s.includes('مفقود') || s.includes('ضائع')) {
    return 'returned_missing';
  }
  if (['returned_resent', 'status_10', 'status_15', '10', '15'].includes(s) || s.includes('ارسال') || s.includes('إرسال')) {
    return 'returned_resent';
  }
  if (['remitted', 'supplied', 'status_8', 'status_19', '8', '19'].includes(s) || s.includes('توريد') || s.includes('تحصيل')) {
    return 'remitted';
  }
  if (['returned_received', 'status_20', '20'].includes(s) || s.includes('وصلتني')) {
    return 'returned_received';
  }
  if (
    ['returned_to_company', 'returned with company', 'returned', 'status_5', 'status_14', '5', '14', 'returned_to_customer'].includes(s) ||
    s.includes('مرتجع') || s.includes('راجع')
  ) {
    return 'returned_to_company';
  }

  // Cancelled (Code 6)
  if (['cancelled', 'canceled', 'status_6', '6'].includes(s) || s.includes('ملغي') || s.includes('إلغاء')) {
    return 'cancelled';
  }

  // Local drafts (created / turbo_saved) with tracking are waiting pickup
  if (['turbo_saved', 'created', 'draft'].includes(s)) {
    return 'turbo_sent';
  }

  return 'turbo_sent';
};

module.exports = {
  CANONICAL_TURBO_MAP,
  SYSTEM_STATUS_MAPPING,
  TURBO_STATUS_DEFINITIONS,
  normalizeTurboStatus,
  getSystemStatusFromTurbo,
  getSystemStatusFromTurboWithCustomMapping,
  classifyCarrierShipmentStage
};
