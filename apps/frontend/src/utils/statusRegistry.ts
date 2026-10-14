export interface StatusDisplayInfo {
  code: string;
  label: string;
  labelKey: string;
  colorClass: string;
  source: 'turbo' | 'system';
}

export interface OrderStatusDisplay {
  primary: StatusDisplayInfo;
  secondary?: StatusDisplayInfo;
}

/** All known system order statuses with display info */
const SYSTEM_STATUS_DEFS: Record<string, { label: string; labelKey: string; colorClass: string }> = {
  NEW:                  { label: 'طلب جديد',             labelKey: 'orders.new',               colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  IN_PROGRESS:          { label: 'قيد التنفيذ',           labelKey: 'orders.inProgress',        colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  PENDING:              { label: 'قيد الانتظار',         labelKey: 'orders.pending',           colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  DRAFT:                { label: 'مسودة',                labelKey: 'orders.draft',             colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  CONFIRMED:            { label: 'مؤكد',                 labelKey: 'orders.confirmed',         colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  SCHEDULED:            { label: 'طلب مجدول',            labelKey: 'orders.scheduled',         colorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  ON_HOLD:              { label: 'معلق',                 labelKey: 'orders.onHold',            colorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  PROCESSING:           { label: 'قيد التنفيذ',           labelKey: 'orders.processing',        colorClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400' },
  SHIPPED:              { label: 'تم الشحن',             labelKey: 'orders.shipped',           colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
  DELIVERED:            { label: 'تم التسليم',           labelKey: 'orders.delivered',         colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  CANCELLED:            { label: 'ملغي',                 labelKey: 'orders.cancelled',         colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  DUPLICATE_ORDER:      { label: 'طلب مكرر',             labelKey: 'orders.duplicate',         colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' },
  REFUNDED:             { label: 'مسترد',                labelKey: 'orders.refunded',          colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  PARTIALLY_REFUNDED:   { label: 'مسترد جزئياً',         labelKey: 'orders.partiallyRefunded', colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  RETURNED:             { label: 'مرتجع',                labelKey: 'orders.returned',          colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  PARTIALLY_RETURNED:   { label: 'مرتجع جزئي',           labelKey: 'orders.partiallyReturned', colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  PARTIALLY_DELIVERED:  { label: 'تسليم جزئي',           labelKey: 'orders.partiallyDelivered',colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  EXCHANGED:            { label: 'استبدال',              labelKey: 'orders.exchanged',         colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
  TRASH:                { label: 'سلة المحذوفات',        labelKey: 'orders.trash',             colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  TRASH_ORDER:          { label: 'سلة المحذوفات',        labelKey: 'orders.trash',             colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  READY_TO_SHIP:        { label: 'جاهز للشحن',           labelKey: 'orders.readyToShip',       colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  OUT_FOR_DELIVERY:     { label: 'خرج للتسليم',          labelKey: 'orders.outForDelivery',    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
  LOST:                 { label: 'مفقود',                labelKey: 'orders.lost',              colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  INCOMPLETE:           { label: 'غير مكتمل',            labelKey: 'orders.incomplete',        colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' },
  PENDING_PREPARATION:  { label: 'بانتظار التجهيز',      labelKey: 'orders.pendingPreparation',colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  PREPARING:            { label: 'قيد التجهيز',          labelKey: 'orders.preparing',         colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  READY:                { label: 'جاهز للشحن',           labelKey: 'orders.ready',              colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  QUALITY_CHECK:        { label: 'فحص الجودة',           labelKey: 'orders.qualityCheck',      colorClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400' },
  PACKAGED:             { label: 'تم التعبئة',           labelKey: 'orders.packaged',          colorClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400' },
  ON_HOLD_PREP:         { label: 'تجهيز معلق',           labelKey: 'orders.onHoldPrep',        colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  NOT_SHIPPED:          { label: 'لم يتم الشحن',         labelKey: 'orders.notShipped',        colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  REFUNDED_PARTIALLY:   { label: 'مسترد جزئياً',          labelKey: 'orders.partiallyRefunded', colorClass: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  COMPLETED:            { label: 'مدفوع',                labelKey: 'orders.completed',         colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  FAILED:               { label: 'فشل الدفع',             labelKey: 'orders.failed',            colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  STOCK_SHORTAGE:       { label: 'عجز مخزون',            labelKey: 'orders.stockShortage',     colorClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400' },
  SHORTAGE_FAILED:      { label: 'عجز نهائي',            labelKey: 'orders.shortageFailed',    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
  WOO_TAGHEZ:           { label: 'Woo Taghez',           labelKey: 'orders.wooTaghez',         colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  PENDING_CANCELLATION: { label: 'بانتظار الإلغاء',      labelKey: 'orders.pendingCancellation',colorClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400' },
  BDONKODTERBO:         { label: 'بدون كود تيربو',       labelKey: 'orders.bdonkodterbo',      colorClass: 'bg-zinc-100 text-zinc-800 border border-zinc-300 dark:bg-zinc-800/40 dark:text-zinc-300 dark:border-zinc-700' },
};

/** Canonical turbo statuses with display info */
const TURBO_STATUS_DEFS: Record<string, { label: string; labelKey: string; colorClass: string }> = {
  turbo_saved:           { label: 'محفوظة قبل الشحن',       labelKey: 'orders.turboSaved',          colorClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300' },
  turbo_sent:            { label: 'قيد الانتظار (تربو)',     labelKey: 'orders.turboSent',           colorClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300' },
  processing:            { label: 'قيد التنفيذ (بالفرع)',    labelKey: 'orders.turboProcessing',     colorClass: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300' },
  out_for_delivery:      { label: 'مسلمة للمندوب',          labelKey: 'orders.turboOutForDelivery', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300' },
  returned_to_company:   { label: 'مرتجعات بالشركة',        labelKey: 'orders.turboReturnedToCompany', colorClass: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300' },
  cancelled:             { label: 'ملغي من الشحن',          labelKey: 'orders.turboCancelled',      colorClass: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300' },
  delivered:             { label: 'تم التسليم',             labelKey: 'orders.turboDelivered',      colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' },
  remitted:              { label: 'تم التوريد والتحصيل',    labelKey: 'orders.turboRemitted',       colorClass: 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/40 dark:text-green-200' },
  archived:              { label: 'شحنة محذوفة',            labelKey: 'orders.turboArchived',       colorClass: 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300' },
  returned_resent:       { label: 'معاد إرسالها',           labelKey: 'orders.turboReturnedResent', colorClass: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300' },
  returned_missing:      { label: 'مرتجع مفقود',            labelKey: 'orders.turboReturnedMissing',colorClass: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300' },
  returned_destroyed:    { label: 'مرتجع معدوم',            labelKey: 'orders.turboReturnedDestroyed',colorClass: 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/40 dark:text-rose-200' },
  returned_received:     { label: 'مرتجعات وصلتني',          labelKey: 'orders.turboReturnedReceived', colorClass: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300' },
  returned_to_customer:  { label: 'مرتجعة للعميل',            labelKey: 'orders.turboReturnedToCustomer', colorClass: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300' },
  delayed:               { label: 'مؤجلة مع المندوب',       labelKey: 'orders.turboDelayed',        colorClass: 'bg-yellow-50 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300' },
  incomplete:            { label: 'غير مكتملة',            labelKey: 'orders.turboIncomplete',     colorClass: 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300' },
  turbo_syncing:         { label: 'شحنة مرتبطة — قيد المزامنة', labelKey: 'orders.turboSyncing', colorClass: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300' },
};

/** Map any raw turbo alias → canonical code */
const TURBO_ALIASES: Record<string, string> = {
  '1': 'turbo_saved', 'created': 'turbo_saved', 'turbo_saved': 'turbo_saved', 'status_1': 'turbo_saved',
  '2': 'turbo_sent', 'sent': 'turbo_sent', 'turbo_sent': 'turbo_sent', 'status_2': 'turbo_sent', 'waiting': 'turbo_sent', 'pending': 'turbo_sent', 'قيد الانتظار': 'turbo_sent', 'انتظار': 'turbo_sent', 'بانتظار الاستلام': 'turbo_sent',
  '3': 'processing', 'processing': 'processing', 'underway': 'processing', 'accepted': 'processing', 'status_3': 'processing', 'preparing': 'processing', 'قيد التنفيذ': 'processing', 'تنفيذ': 'processing', 'قيد التنفيذ بالفرع': 'processing',
  '4': 'out_for_delivery', 'out_for_delivery': 'out_for_delivery', 'under delivery': 'out_for_delivery',
  'with captain': 'out_for_delivery', 'in transit': 'out_for_delivery', 'shipped': 'out_for_delivery', 'status_4': 'out_for_delivery',
  '5': 'returned_to_company', 'returned_to_company': 'returned_to_company', 'returned with company': 'returned_to_company', 'status_5': 'returned_to_company',
  '6': 'cancelled', 'cancelled': 'cancelled', 'status_6': 'cancelled',
  '7': 'delivered', 'delivered': 'delivered', 'status_7': 'delivered',
  '8': 'remitted', 'remitted': 'remitted', 'supplied': 'remitted', 'status_8': 'remitted',
  '9': 'archived', 'archived': 'archived', 'status_9': 'archived',
  '10': 'returned_resent', 'returned_resent': 'returned_resent', 'status_10': 'returned_resent',
  '11': 'returned_missing', 'returned_missing': 'returned_missing', 'lost': 'returned_missing', 'status_11': 'returned_missing',
  '12': 'returned_destroyed', 'returned_destroyed': 'returned_destroyed', 'status_12': 'returned_destroyed',
  '13': 'delayed', 'delayed': 'delayed', 'on hold': 'delayed', 'failed delivery': 'delayed', 'rescheduled': 'delayed', 'status_13': 'delayed',
  '14': 'returned_to_company', 'status_14': 'returned_to_company',
  '15': 'returned_resent', 'status_15': 'returned_resent',
  '16': 'returned_missing', 'status_16': 'returned_missing',
  '17': 'returned_destroyed', 'status_17': 'returned_destroyed',
  '18': 'incomplete', 'status_18': 'incomplete', 'incomplete': 'incomplete', 'غير مكتملة': 'incomplete',
  '19': 'remitted', 'status_19': 'remitted',
  'مؤجلة': 'delayed', 'مؤجله': 'delayed', 'مؤجل': 'delayed', 'تأجيل': 'delayed', 'مؤجلة مع المندوب': 'delayed', 'قيد الانتظار مع المندوب': 'delayed',
  'تم التسليم': 'delivered', 'مرتجع مع الشركة': 'returned_to_company', 'مرتجعات بالشركة': 'returned_to_company',
  '20': 'returned_received', 'returned_received': 'returned_received', 'status_20': 'returned_received', 'مرتجعات وصلتني': 'returned_received',
  'returned_to_customer': 'returned_to_customer', 'مرتجعة': 'returned_to_customer',
};

export interface OrderLike {
  status?: string | null;
  effectiveStatus?: string | null;
  turboShipmentStatus?: string | null;
  turboTrackingNumber?: string | null;
  turboShipmentId?: string | null;
}

const CUSTOM_STATUS_DEFS: Record<string, { label: string; labelKey: string; colorClass: string }> = {};

export function registerCustomStatuses(configs: Array<{ code?: string; name?: string; color?: string }>) {
  if (!Array.isArray(configs)) return;
  configs.forEach((cfg) => {
    if (!cfg || !cfg.code) return;
    const key = cfg.code.toUpperCase().trim().replace(/\s+/g, '_');
    CUSTOM_STATUS_DEFS[key] = {
      label: cfg.name || key.replace(/_/g, ' '),
      labelKey: '',
      colorClass: 'bg-zinc-100 text-zinc-800 border border-zinc-300 dark:bg-zinc-800/40 dark:text-zinc-300 dark:border-zinc-700',
    };
  });
}

function getSystemDef(code: string): { label: string; labelKey: string; colorClass: string } {
  let key = (code || 'PENDING').toUpperCase().trim();
  // Normalize: spaces → underscores, lowercase → uppercase (e.g. "Stock Shortage" → "STOCK_SHORTAGE")
  key = key.replace(/\s+/g, '_');
  return SYSTEM_STATUS_DEFS[key] || CUSTOM_STATUS_DEFS[key] || {
    label: key.replace(/_/g, ' '),
    labelKey: '',
    colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  };
}

function getTurboCanonical(raw: string): string | undefined {
  const key = raw.toLowerCase().trim();
  return TURBO_ALIASES[key];
}

function getTurboDef(canonical: string): { label: string; labelKey: string; colorClass: string } | undefined {
  return TURBO_STATUS_DEFS[canonical];
}

/**
 * Returns primary system status + secondary turbo status (if exists).
 * This is the main function for all pages to use.
 */
export function getOrderStatusDisplay(order: OrderLike): OrderStatusDisplay {
  const effectiveStatus = order.effectiveStatus || order.status || 'PENDING';
  const systemDef = getSystemDef(effectiveStatus);
  const primary: StatusDisplayInfo = {
    code: effectiveStatus.toUpperCase().trim(),
    label: systemDef.label,
    labelKey: systemDef.labelKey,
    colorClass: systemDef.colorClass,
    source: 'system',
  };

  let secondary: StatusDisplayInfo | undefined;
  const rawTurbo = order.turboShipmentStatus;
  if (rawTurbo) {
    const canonical = getTurboCanonical(rawTurbo);
    if (canonical) {
      const turboDef = getTurboDef(canonical);
      if (turboDef) {
        secondary = {
          code: canonical,
          label: `🚚 ${turboDef.label}`,
          labelKey: turboDef.labelKey,
          colorClass: turboDef.colorClass,
          source: 'turbo',
        };
      }
    }
  }

  if (!secondary && (order.turboTrackingNumber || order.turboShipmentId)) {
    const neutralDef = getTurboDef('turbo_syncing') || {
      label: 'شحنة مرتبطة — قيد المزامنة',
      labelKey: 'orders.turboSyncing',
      colorClass: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    };
    secondary = {
      code: 'turbo_syncing',
      label: `🚚 ${neutralDef.label}`,
      labelKey: neutralDef.labelKey,
      colorClass: neutralDef.colorClass,
      source: 'turbo',
    };
  }

  return { primary, secondary };
}

/**
 * Returns the system status display for an order (backward compatible).
 * Now shows SYSTEM status (not turbo) as primary.
 */
export const getUnifiedOrderStatus = (order: OrderLike): StatusDisplayInfo => {
  return getOrderStatusDisplay(order).primary;
};

/**
 * Returns display info for any system status code.
 */
export function getStatusDisplay(statusCode: string): StatusDisplayInfo {
  const def = getSystemDef(statusCode);
  return {
    code: statusCode.toUpperCase().trim(),
    label: def.label,
    labelKey: def.labelKey,
    colorClass: def.colorClass,
    source: 'system',
  };
}

/**
 * Returns display info for any turbo status string.
 */
export function getTurboStatusDisplay(statusCode: string): StatusDisplayInfo {
  const canonical = getTurboCanonical(statusCode) || statusCode;
  const def = getTurboDef(canonical) || {
    label: statusCode,
    labelKey: '',
    colorClass: 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300',
  };
  return {
    code: canonical,
    label: def.label,
    labelKey: def.labelKey,
    colorClass: def.colorClass,
    source: 'turbo',
  };
}

/**
 * All system status codes with their display info (for dropdowns, filters).
 */
export function getSystemStatusOptions(): { code: string; label: string }[] {
  return Object.entries(SYSTEM_STATUS_DEFS).map(([code, def]) => ({
    code,
    label: def.label,
  }));
}

/**
 * All turbo canonical codes with their display info (for dropdowns, filters).
 */
export function getTurboStatusOptions(): { code: string; label: string }[] {
  return Object.entries(TURBO_STATUS_DEFS).map(([code, def]) => ({
    code,
    label: def.label,
  }));
}

/**
 * Get the canonical turbo code for a raw status.
 */
export function normalizeTurboStatus(raw: string): string {
  return getTurboCanonical(raw) || raw.toLowerCase().trim();
}

export {
  SYSTEM_STATUS_DEFS,
  TURBO_STATUS_DEFS,
  TURBO_ALIASES,
};
