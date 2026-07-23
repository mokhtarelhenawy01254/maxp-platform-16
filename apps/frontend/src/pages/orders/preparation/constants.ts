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
  allowPartialPreparation: true,
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
  labelKey: string;
}> = [
  { value: "stock_shortage", label: "Stock Shortage", labelKey: "preparation.shortageReasons.stock_shortage" },
  { value: "waiting_transfer", label: "Awaiting Transfer", labelKey: "preparation.shortageReasons.waiting_transfer" },
  { value: "waiting_restock", label: "Awaiting Restock", labelKey: "preparation.shortageReasons.waiting_restock" },
  { value: "other", label: "Other Reason", labelKey: "preparation.shortageReasons.other" },
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
  CONFIRMED: "Confirmed",
  PENDING_PREPARATION: "Pending Preparation",
  PENDING: "Pending",
  PREPARING: "Preparing",
  PROCESSING: "Processing",
  QUALITY_CHECK: "Quality Check",
  PACKAGED: "Packaged",
  READY: "Ready",
  READY_TO_SHIP: "Ready to Ship",
  STOCK_SHORTAGE: "Stock Shortage",
};

export const FALLBACK_STATUS_LABEL_KEYS: Record<string, string> = {
  CONFIRMED: "preparation.fallbackStatusLabels.CONFIRMED",
  PENDING_PREPARATION: "preparation.fallbackStatusLabels.PENDING_PREPARATION",
  PREPARING: "preparation.fallbackStatusLabels.PREPARING",
  PROCESSING: "preparation.fallbackStatusLabels.PROCESSING",
  QUALITY_CHECK: "preparation.fallbackStatusLabels.QUALITY_CHECK",
  PACKAGED: "preparation.fallbackStatusLabels.PACKAGED",
  READY: "preparation.fallbackStatusLabels.READY",
  READY_TO_SHIP: "preparation.fallbackStatusLabels.READY_TO_SHIP",
  STOCK_SHORTAGE: "preparation.fallbackStatusLabels.STOCK_SHORTAGE",
};

/** Order statuses that belong in the preparation pipeline */
export const PREPARATION_STATUSES = new Set([
  'CONFIRMED', 'PENDING_PREPARATION',
  'PROCESSING', 'PREPARING',
  'QUALITY_CHECK',
  'PACKAGED', 'PACKED',
  'READY', 'READY_TO_SHIP',
  'STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK',
]);

export const STAGE_DEFINITIONS: Array<{
  key: StageKey;
  label: string;
  labelKey: string;
  colorClass: string;
  description: string;
  descriptionKey: string;
}> = [
  {
    key: "WAITING",
    label: "Confirmed Orders",
    labelKey: "preparation.stages.WAITING",
    colorClass: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Confirmed orders not yet prepared",
    descriptionKey: "preparation.stageDescriptions.WAITING",
  },
  {
    key: "PREPARING",
    label: "Preparing",
    labelKey: "preparation.stages.PREPARING",
    colorClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "Picking and preparing products from warehouse",
    descriptionKey: "preparation.stageDescriptions.PREPARING",
  },
  {
    key: "QUALITY_CHECK",
    label: "Quality Check",
    labelKey: "preparation.stages.QUALITY_CHECK",
    colorClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    description: "Reviewing quantity and condition before packaging",
    descriptionKey: "preparation.stageDescriptions.QUALITY_CHECK",
  },
  {
    key: "PACKAGED",
    label: "Packaged",
    labelKey: "preparation.stages.PACKAGED",
    colorClass: "bg-violet-100 text-violet-800 border-violet-200",
    description: "Order is packaged and awaiting delivery to shipping",
    descriptionKey: "preparation.stageDescriptions.PACKAGED",
  },
  {
    key: "READY_TO_SHIP",
    label: "Ready to Ship",
    labelKey: "preparation.stages.READY_TO_SHIP",
    colorClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Ready to hand over to shipping company or create shipment",
    descriptionKey: "preparation.stageDescriptions.READY_TO_SHIP",
  },
  {
    key: "STOCK_SHORTAGE",
    label: "Stock Shortage",
    labelKey: "preparation.stages.STOCK_SHORTAGE",
    colorClass: "bg-rose-100 text-rose-800 border-rose-200",
    description: "Orders on hold due to stock shortage or awaiting transfer",
    descriptionKey: "preparation.stageDescriptions.STOCK_SHORTAGE",
  },
  {
    key: "PENDING_CANCELLATION",
    label: "Pending Cancellation",
    labelKey: "preparation.stages.PENDING_CANCELLATION",
    colorClass: "bg-red-100 text-red-800 border-red-300 shadow-sm shadow-red-200 animate-pulse",
    description: "Orders the customer requested cancellation during preparation — must stop immediately",
    descriptionKey: "preparation.stageDescriptions.PENDING_CANCELLATION",
  },
];

export const DYNAMIC_STAGE_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-gray-100 text-gray-800 border-gray-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-lime-100 text-lime-800 border-lime-200",
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "bg-rose-100 text-rose-800 border-rose-200",
] as const;

export const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest First", labelKey: "preparation.sortOptions.createdAt_desc" },
  { value: "createdAt_asc", label: "Oldest First", labelKey: "preparation.sortOptions.createdAt_asc" },
  { value: "totalUnits_desc", label: "Most Items First", labelKey: "preparation.sortOptions.totalUnits_desc" },
  { value: "totalUnits_asc", label: "Fewest Items First", labelKey: "preparation.sortOptions.totalUnits_asc" },
  { value: "totalValue_desc", label: "Highest Value First", labelKey: "preparation.sortOptions.totalValue_desc" },
  { value: "totalValue_asc", label: "Lowest Value First", labelKey: "preparation.sortOptions.totalValue_asc" },
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  ai_conversation: "AI Conversation",
  storefront: "Storefront",
  woocommerce: "WooCommerce",
  manual: "Manual",
  api: "API",
  import: "Import",
  pos: "POS",
  unknown: "Unknown",
};

export const SOURCE_LABEL_KEYS: Record<string, string> = {
  ai_conversation: "preparation.sourceLabels.ai_conversation",
  storefront: "preparation.sourceLabels.storefront",
  woocommerce: "preparation.sourceLabels.woocommerce",
  manual: "preparation.sourceLabels.manual",
  api: "preparation.sourceLabels.api",
  import: "preparation.sourceLabels.import",
  pos: "preparation.sourceLabels.pos",
  unknown: "preparation.sourceLabels.unknown",
};
