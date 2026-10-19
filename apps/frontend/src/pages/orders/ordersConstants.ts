import i18n from "../../i18n";

export interface OrderStatusDefinition {
  code: string;
  name: string;
  nameEn?: string;
  color?: string;
}

export interface MerchantFilterOption {
  id: string;
  name: string;
  email?: string;
  fulfillmentMode?: string;
}

export interface MerchantInventorySummary {
  linkedProducts?: number;
  availableForSale?: number;
  merchantProductStock?: number;
  physicalQuantity?: number;
  physicalAvailable?: number;
  reservedQuantity?: number;
  stockLocation?: string;
  stockLocationLabel?: string;
  warehouseNames?: string[];
}

import type {
  MerchantOperationsTotals,
  MerchantOperationsSummary,
} from "./utils/ordersTableHelpers";

export type { MerchantOperationsTotals, MerchantOperationsSummary };

export interface MerchantPayout {
  id: string;
  amount: string | number;
  currency?: string;
  status: string;
  paymentMethod?: string;
  createdAt: string;
  processedAt?: string | null;
}

export interface MerchantPayoutSummary {
  balances?: {
    availableAmount?: number;
    availableCommissionsCount?: number;
    confirmedAmount?: number;
    pendingPayoutAmount?: number;
    paidAmount?: number;
  };
  payouts?: MerchantPayout[];
}

export interface MerchantSettlementSummary {
  merchant?: MerchantFilterOption & {
    inventorySummary?: MerchantInventorySummary | null;
    operationsSummary?: MerchantOperationsSummary | null;
  };
  inventorySummary?: MerchantInventorySummary | null;
  operationsSummary?: MerchantOperationsSummary | null;
  payoutSummary?: MerchantPayoutSummary | null;
}

export const normalizeStatusCode = (value: string | null | undefined) =>
  String(value || "").trim().toUpperCase();

export const isCancellationStatus = (value: string | null | undefined) => {
  const normalizedStatus = normalizeStatusCode(value);
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

export const DEFAULT_ORDER_STATUSES: OrderStatusDefinition[] = [
  { code: "PENDING", name: i18n.t("orders.pending"), color: "#F59E0B" },
  { code: "DRAFT", name: i18n.t("orders.draft"), color: "#9CA3AF" },
  { code: "CONFIRMED", name: i18n.t("orders.confirmed"), color: "#3B82F6" },
  { code: "SCHEDULED", name: i18n.t("orders.scheduled"), color: "#F97316" },
  { code: "ON_HOLD", name: i18n.t("orders.onHold"), color: "#F97316" },
  { code: "PROCESSING", name: i18n.t("orders.processing"), color: "#8B5CF6" },
  { code: "SHIPPED", name: i18n.t("orders.shipped"), color: "#06B6D4" },
  { code: "DELIVERED", name: i18n.t("orders.delivered"), color: "#10B981" },
  { code: "CANCELLED", name: i18n.t("orders.cancelled"), color: "#EF4444" },
  { code: "DUPLICATE_ORDER", name: i18n.t("orders.duplicate"), color: "#F59E0B" },
  { code: "REFUNDED", name: i18n.t("orders.refunded"), color: "#6B7280" },
  {
    code: "PARTIALLY_REFUNDED",
    name: i18n.t("orders.partiallyRefunded"),
    color: "#9CA3AF",
  },
  { code: "RETURNED", name: i18n.t("orders.returned"), color: "#DC2626" },
  {
    code: "PARTIALLY_RETURNED",
    name: i18n.t("orders.partiallyReturned"),
    color: "#F87171",
  },
  {
    code: "PARTIALLY_DELIVERED",
    name: i18n.t("orders.partiallyDelivered"),
    color: "#FBBF24",
  },
  { code: "EXCHANGED", name: i18n.t("orders.exchanged"), color: "#7C3AED" },
  { code: "TRASH", name: i18n.t("orders.trash"), color: "#6B7280" },
  {
    code: "STOCK_SHORTAGE",
    name: i18n.t("orders.stockShortage"),
    color: "#F97316",
  },
  {
    code: "SHORTAGE_FAILED",
    name: i18n.t("orders.shortageFailed"),
    color: "#7C3AED",
  },
  // Turbo shipment statuses 1..13
  {
    code: "turbo_saved",
    name: "تربو: محفوظة قبل الشحن (كود 1)",
    color: "#6366F1",
  },
  {
    code: "turbo_sent",
    name: "تربو: مرسلة لشركة تربو (كود 2)",
    color: "#3B82F6",
  },
  {
    code: "processing",
    name: "تربو: قيد التنفيذ بالفرع (كود 3)",
    color: "#8B5CF6",
  },
  {
    code: "out_for_delivery",
    name: "تربو: مسلمة للمندوب (كود 4)",
    color: "#06B6D4",
  },
  {
    code: "returned_to_company",
    name: "تربو: مرتجعات بالشركة (كود 5)",
    color: "#991B1B",
  },
  {
    code: "cancelled",
    name: "تربو: ملغي من الشحن (كود 6)",
    color: "#DC2626",
  },
  {
    code: "delivered",
    name: "تربو: تم التسليم (كود 7)",
    color: "#10B981",
  },
  {
    code: "remitted",
    name: "تربو: تم التوريد وتحصيل المبلغ (كود 8)",
    color: "#047857",
  },
  {
    code: "archived",
    name: "تربو: شحنة محذوفة (كود 9)",
    color: "#78716C",
  },
  {
    code: "returned_resent",
    name: "تربو: معاد إرسالها (كود 10)",
    color: "#2563EB",
  },
  {
    code: "returned_missing",
    name: "تربو: مرتجع مفقود (كود 11)",
    color: "#7F1D1D",
  },
  {
    code: "returned_destroyed",
    name: "تربو: مرتجع معدوم (كود 12)",
    color: "#451A03",
  },
  {
    code: "delayed",
    name: "تربو: مؤجلة مع المندوب (كود 13)",
    color: "#F97316",
  },
];

export const DEFAULT_PAYMENT_STATUSES: OrderStatusDefinition[] = [
  {
    code: "PENDING",
    name: i18n.t("orders.paymentStatuses.pending"),
    color: "#F59E0B",
  },
  {
    code: "COMPLETED",
    name: i18n.t("orders.paymentStatuses.completed"),
    color: "#10B981",
  },
  {
    code: "PARTIALLY_PAID",
    name: i18n.t("orders.paymentStatuses.partiallyPaid"),
    color: "#3B82F6",
  },
  {
    code: "FAILED",
    name: i18n.t("orders.paymentStatuses.failed"),
    color: "#EF4444",
  },
  {
    code: "ON_HOLD",
    name: i18n.t("orders.paymentStatuses.onHold"),
    color: "#F97316",
  },
  {
    code: "REFUNDED",
    name: i18n.t("orders.paymentStatuses.refunded"),
    color: "#6B7280",
  },
  {
    code: "PARTIALLY_REFUNDED",
    name: i18n.t("orders.paymentStatuses.partiallyRefunded"),
    color: "#9CA3AF",
  },
];

export const FILTERABLE_STATUS_CODES = [
  "PENDING",
  "CONFIRMED",
  "SCHEDULED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "DUPLICATE_ORDER",
  "RETURNED",
  "PARTIALLY_RETURNED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "STOCK_SHORTAGE",
  "SHORTAGE_FAILED",
] as const;

export const BULK_UPDATABLE_STATUS_CODES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "DUPLICATE_ORDER",
  "RETURNED",
  "PARTIALLY_RETURNED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "SHORTAGE_FAILED",
] as const;
