import type {
  PreparationQueueSettings,
  ShortageHoldDetails,
  ShortageReason,
  StageKey,
} from "./types";

export const FETCH_LIMIT = 200;
export const PAGE_SIZE = 12;
export const PAGE_SIZE_OPTIONS = [12, 24, 48, 96] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PREPARATION_QUEUE_SETTINGS: PreparationQueueSettings = {
  enabled: true,
  defaultWarehouseId: "",
  startingStatus: "PENDING_PREPARATION",
  handoffStatus: "READY_TO_SHIP",
  requireStockBeforePreparing: true,
  allowPartialPreparation: false,
  allowCrossWarehouseTransfer: true,
  enableQcChecklist: true,
  qcChecks: {
    quantity: true,
    variant: true,
    packaging: true,
    accessories: false,
    invoiceSlip: true,
  },
  enableBulkStatusUpdate: true,
  prioritizeShortageOrders: true,
};

export const SHORTAGE_HOLD_STATUS = "STOCK_SHORTAGE";
export const SHORTAGE_HOLD_METADATA_KEY = "preparationShortageHold";
export const PREPARATION_STATUS_METADATA_KEY = "preparationStatus";

export const TERMINAL_NON_PREPARATION_STATUSES = new Set([
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "DUPLICATE_ORDER",
  "TRASH",
]);

export const SHORTAGE_REASON_OPTIONS: Array<{
  value: ShortageReason;
  label: string;
}> = [
  { value: "stock_shortage", label: "نقص مخزون" },
  { value: "waiting_transfer", label: "في انتظار تحويل" },
  { value: "waiting_restock", label: "في انتظار توريد" },
  { value: "other", label: "سبب آخر" },
];

export const DEFAULT_SHORTAGE_HOLD_DETAILS: ShortageHoldDetails = {
  reason: "stock_shortage",
  owner: "",
  followUpDate: "",
  customerNotified: false,
  note: "",
  heldAt: "",
  releasedAt: "",
  state: "held",
};

export const FALLBACK_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "مؤكد",
  PENDING_PREPARATION: "في انتظار التجهيز",
  PREPARING: "قيد التجهيز",
  PROCESSING: "قيد التجهيز",
  QUALITY_CHECK: "فحص الجودة",
  PACKAGED: "تم التغليف",
  READY: "جاهز",
  READY_TO_SHIP: "جاهز للشحن",
  STOCK_SHORTAGE: "مؤجل بسبب العجز",
};

export const STAGE_DEFINITIONS: Array<{
  key: StageKey;
  label: string;
  colorClass: string;
  description: string;
}> = [
  {
    key: "WAITING",
    label: "طلبات مؤكده",
    colorClass: "bg-amber-100 text-amber-800 border-amber-200",
    description: "طلبات مؤكدة لم يبدأ تجهيزها بعد",
  },
  {
    key: "PREPARING",
    label: "جاري التجهيز",
    colorClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "التقاط وتجهيز المنتجات من المخزن",
  },
  {
    key: "QUALITY_CHECK",
    label: "فحص الجودة",
    colorClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    description: "مراجعة الكمية والحالة قبل التغليف",
  },
  {
    key: "PACKAGED",
    label: "تم التغليف",
    colorClass: "bg-violet-100 text-violet-800 border-violet-200",
    description: "الطلب مغلف وينتظر التسليم للشحن",
  },
  {
    key: "READY_TO_SHIP",
    label: "جاهز للشحن",
    colorClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "جاهز لتسليم شركة الشحن أو إنشاء الشحنة",
  },
  {
    key: "STOCK_SHORTAGE",
    label: "مؤجل للعجز",
    colorClass: "bg-rose-100 text-rose-800 border-rose-200",
    description: "طلبات متوقفة بسبب نقص المخزون أو انتظار تحويل",
  },
  {
    key: "PENDING_CANCELLATION",
    label: "إلغاء قيد التنفيذ",
    colorClass: "bg-red-100 text-red-800 border-red-300 shadow-sm shadow-red-200 animate-pulse",
    description: "طلبات طلب العميل إلغاءها أثناء فترة التجهيز - يجب إيقافها فوراً",
  },
];

export const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "الأحدث أولاً" },
  { value: "createdAt_asc", label: "الأقدم أولاً" },
  { value: "totalUnits_desc", label: "عدد القطع - الأكثر أولاً" },
  { value: "totalUnits_asc", label: "عدد القطع - الأقل أولاً" },
  { value: "totalValue_desc", label: "القيمة - الأعلى أولاً" },
  { value: "totalValue_asc", label: "القيمة - الأقل أولاً" },
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  ai_conversation: "محادثة تلقائية",
  storefront: "المتجر",
  woocommerce: "WooCommerce",
  manual: "يدوي",
  api: "API",
  import: "استيراد",
  pos: "POS",
  unknown: "غير معروف",
};
