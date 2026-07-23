import type {
  PreparationQueueSettings,
  ShortageHoldDetails,
  ShortageReason,
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
  "PENDING", "DRAFT", "SCHEDULED",
  "SHIPPED", "DELIVERED",
  "CANCELLED", "RETURNED",
  "REFUNDED", "PARTIALLY_REFUNDED",
  "DUPLICATE_ORDER", "TRASH", "TRASH_ORDER",
  "EXCHANGED", "PARTIALLY_DELIVERED",
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
