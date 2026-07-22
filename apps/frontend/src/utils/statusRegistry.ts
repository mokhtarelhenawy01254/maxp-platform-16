export interface StatusDisplayInfo {
  code: string;
  label: string;
  colorClass: string;
  badgeStyle?: React.CSSProperties;
  icon?: string;
  source: 'turbo' | 'system';
}

/**
 * 🚚 Official Turbo Shipping Statuses Dictionary (Codes 1..13)
 * Mapped to all possible aliases, raw strings, and statusCode formats
 */
const TURBO_ALIASES: Record<string, { label: string; colorClass: string; canonical: string }> = {
  // Code 1: Saved / Created (تجهيز التاجر)
  'created': { label: 'تربو: محفوظة قبل الشحن (كود 1)', colorClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300', canonical: 'turbo_saved' },
  'turbo_saved': { label: 'تربو: محفوظة قبل الشحن (كود 1)', colorClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300', canonical: 'turbo_saved' },
  'status_1': { label: 'تربو: محفوظة قبل الشحن (كود 1)', colorClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300', canonical: 'turbo_saved' },
  '1': { label: 'تربو: محفوظة قبل الشحن (كود 1)', colorClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300', canonical: 'turbo_saved' },

  // Code 2: Sent to Turbo (مرسلة لتربو)
  'turbo_sent': { label: 'تربو: مرسلة للشحن (كود 2)', colorClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300', canonical: 'turbo_sent' },
  'sent': { label: 'تربو: مرسلة للشحن (كود 2)', colorClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300', canonical: 'turbo_sent' },
  'status_2': { label: 'تربو: مرسلة للشحن (كود 2)', colorClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300', canonical: 'turbo_sent' },
  '2': { label: 'تربو: مرسلة للشحن (كود 2)', colorClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300', canonical: 'turbo_sent' },

  // Code 3: Branch Processing (قيد التنفيذ بالفرع)
  'processing': { label: 'تربو: قيد التنفيذ بالفرع (كود 3)', colorClass: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300', canonical: 'processing' },
  'status_3': { label: 'تربو: قيد التنفيذ بالفرع (كود 3)', colorClass: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300', canonical: 'processing' },
  '3': { label: 'تربو: قيد التنفيذ بالفرع (كود 3)', colorClass: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300', canonical: 'processing' },

  // Code 4: Out for delivery / Captain (مسلمة للمندوب)
  'out_for_delivery': { label: 'تربو: مسلمة للمندوب (كود 4)', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300', canonical: 'out_for_delivery' },
  'status_4': { label: 'تربو: مسلمة للمندوب (كود 4)', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300', canonical: 'out_for_delivery' },
  '4': { label: 'تربو: مسلمة للمندوب (كود 4)', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300', canonical: 'out_for_delivery' },

  // Code 5: Returned to Company (مرتجعات بالشركة)
  'returned_to_company': { label: 'تربو: مرتجعات بالشركة (كود 5)', colorClass: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300', canonical: 'returned_to_company' },
  'status_5': { label: 'تربو: مرتجعات بالشركة (كود 5)', colorClass: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300', canonical: 'returned_to_company' },
  '5': { label: 'تربو: مرتجعات بالشركة (كود 5)', colorClass: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300', canonical: 'returned_to_company' },

  // Code 6: Cancelled (ملغي من الشحن)
  'cancelled': { label: 'تربو: ملغي من الشحن (كود 6)', colorClass: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300', canonical: 'cancelled' },
  'status_6': { label: 'تربو: ملغي من الشحن (كود 6)', colorClass: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300', canonical: 'cancelled' },
  '6': { label: 'تربو: ملغي من الشحن (كود 6)', colorClass: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300', canonical: 'cancelled' },

  // Code 7: Delivered (تم التسليم)
  'delivered': { label: 'تربو: تم التسليم (كود 7)', colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300', canonical: 'delivered' },
  'status_7': { label: 'تربو: تم التسليم (كود 7)', colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300', canonical: 'delivered' },
  '7': { label: 'تربو: تم التسليم (كود 7)', colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300', canonical: 'delivered' },

  // Code 8: Remitted (تم التوريد والتحصيل)
  'remitted': { label: 'تربو: تم التوريد والتحصيل (كود 8)', colorClass: 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/40 dark:text-green-200', canonical: 'remitted' },
  'status_8': { label: 'تربو: تم التوريد والتحصيل (كود 8)', colorClass: 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/40 dark:text-green-200', canonical: 'remitted' },
  '8': { label: 'تربو: تم التوريد والتحصيل (كود 8)', colorClass: 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/40 dark:text-green-200', canonical: 'remitted' },

  // Code 9: Archived (شحنة محذوفة)
  'archived': { label: 'تربو: شحنة محذوفة (كود 9)', colorClass: 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300', canonical: 'archived' },
  'status_9': { label: 'تربو: شحنة محذوفة (كود 9)', colorClass: 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300', canonical: 'archived' },
  '9': { label: 'تربو: شحنة محذوفة (كود 9)', colorClass: 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300', canonical: 'archived' },

  // Code 10: Returned Resent (معاد إرسالها)
  'returned_resent': { label: 'تربو: معاد إرسالها (كود 10)', colorClass: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300', canonical: 'returned_resent' },
  'status_10': { label: 'تربو: معاد إرسالها (كود 10)', colorClass: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300', canonical: 'returned_resent' },
  '10': { label: 'تربو: معاد إرسالها (كود 10)', colorClass: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300', canonical: 'returned_resent' },

  // Code 11: Returned Missing (مرتجع مفقود)
  'returned_missing': { label: 'تربو: مرتجع مفقود (كود 11)', colorClass: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300', canonical: 'returned_missing' },
  'status_11': { label: 'تربو: مرتجع مفقود (كود 11)', colorClass: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300', canonical: 'returned_missing' },
  '11': { label: 'تربو: مرتجع مفقود (كود 11)', colorClass: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300', canonical: 'returned_missing' },

  // Code 12: Returned Destroyed (مرتجع معدوم)
  'returned_destroyed': { label: 'تربو: مرتجع معدوم (كود 12)', colorClass: 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/40 dark:text-rose-200', canonical: 'returned_destroyed' },
  'status_12': { label: 'تربو: مرتجع معدوم (كود 12)', colorClass: 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/40 dark:text-rose-200', canonical: 'returned_destroyed' },
  '12': { label: 'تربو: مرتجع معدوم (كود 12)', colorClass: 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/40 dark:text-rose-200', canonical: 'returned_destroyed' },

  // Code 13: Delayed (مؤجلة مع المندوب)
  'delayed': { label: 'تربو: مؤجلة مع المندوب (كود 13)', colorClass: 'bg-yellow-50 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300', canonical: 'delayed' },
  'status_13': { label: 'تربو: مؤجلة مع المندوب (كود 13)', colorClass: 'bg-yellow-50 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300', canonical: 'delayed' },
  '13': { label: 'تربو: مؤجلة مع المندوب (كود 13)', colorClass: 'bg-yellow-50 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300', canonical: 'delayed' }
};

/**
 * System Order Status Defaults Map
 */
const SYSTEM_STATUS_MAP: Record<string, { label: string; colorClass: string }> = {
  PENDING: { label: 'قيد الانتظار', colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  DRAFT: { label: 'مسودة', colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  CONFIRMED: { label: 'مؤكد', colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  SCHEDULED: { label: 'طلب مجدول', colorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  ON_HOLD: { label: 'معلق', colorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  PROCESSING: { label: 'قيد التجهيز', colorClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400' },
  SHIPPED: { label: 'تم الشحن', colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
  DELIVERED: { label: 'تم التسليم', colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  CANCELLED: { label: 'ملغي', colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  DUPLICATE_ORDER: { label: 'طلب مكرر', colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' },
  REFUNDED: { label: 'مسترد', colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  PARTIALLY_REFUNDED: { label: 'مسترد جزئياً', colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  RETURNED: { label: 'مرتجع', colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  PARTIALLY_RETURNED: { label: 'مرتجع جزئي', colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  PARTIALLY_DELIVERED: { label: 'تسليم جزئي', colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  EXCHANGED: { label: 'استبدال', colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
  TRASH: { label: 'سلة المحذوفات', colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
};

export interface OrderLike {
  status?: string | null;
  turboShipmentStatus?: string | null;
  turboTrackingNumber?: string | null;
  turboShipmentId?: string | null;
}

/**
 * 🌟 Central Single Source of Truth for Unified Order Status Display
 */
export const getUnifiedOrderStatus = (order: OrderLike): StatusDisplayInfo => {
  const rawTurboStatus = (order.turboShipmentStatus || '').toLowerCase().trim();
  
  // 1. Check Turbo status first if order has a Turbo status
  if (rawTurboStatus && TURBO_ALIASES[rawTurboStatus]) {
    const turboInfo = TURBO_ALIASES[rawTurboStatus];
    return {
      code: turboInfo.canonical,
      label: turboInfo.label,
      colorClass: turboInfo.colorClass,
      source: 'turbo'
    };
  }

  // If order has a Turbo tracking number but status string is 'created' or unmapped
  if ((order.turboTrackingNumber || order.turboShipmentId) && (!rawTurboStatus || rawTurboStatus === 'created')) {
    const turboInfo = TURBO_ALIASES['created'];
    return {
      code: turboInfo.canonical,
      label: turboInfo.label,
      colorClass: turboInfo.colorClass,
      source: 'turbo'
    };
  }

  // 2. Fall back to internal system order status
  const normalizedSystemCode = (order.status || 'PENDING').toUpperCase().trim();
  const systemInfo = SYSTEM_STATUS_MAP[normalizedSystemCode] || {
    label: normalizedSystemCode.replace(/_/g, ' '),
    colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  };

  return {
    code: normalizedSystemCode,
    label: systemInfo.label,
    colorClass: systemInfo.colorClass,
    source: 'system'
  };
};
