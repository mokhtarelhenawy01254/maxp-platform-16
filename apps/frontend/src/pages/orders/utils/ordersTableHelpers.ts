import i18n from "../../../i18n";
import type { Order } from "./orderTransformer";

export const ORDER_TABLE_COLUMNS = [
  "orderNumber",
  "customer",
  "customerRating",
  "amount",
  "status",
  "payment",
  "date",
  "actions",
] as const;

export type OrderTableColumn = (typeof ORDER_TABLE_COLUMNS)[number];
export const ORDER_TABLE_COLUMN_SET = new Set<string>(ORDER_TABLE_COLUMNS);

export const normalizeOrderTableColumns = (value: unknown): OrderTableColumn[] => {
  if (!Array.isArray(value)) return [...ORDER_TABLE_COLUMNS];
  const filtered = value.filter(
    (col): col is OrderTableColumn =>
      typeof col === "string" && ORDER_TABLE_COLUMN_SET.has(col),
  );
  if (filtered.length === 0) return [...ORDER_TABLE_COLUMNS];
  if (!filtered.includes("orderNumber")) {
    filtered.unshift("orderNumber");
  }
  return filtered as OrderTableColumn[];
};

export const getOrderAmount = (order: Order) => {
  if (typeof order.total === "number" && order.total > 0) {
    return order.total;
  }
  const subtotal = typeof order.subtotal === "number" ? order.subtotal : 0;
  const shipping = typeof order.shipping === "number" ? order.shipping : 0;
  const tax = typeof order.tax === "number" ? order.tax : 0;
  const discount = typeof order.discount === "number" ? order.discount : 0;

  return Math.max(0, subtotal + shipping + tax - discount);
};

export const getOrdersLoadErrorMessage = (error: unknown) => {
  const apiError = error as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };

  if (apiError?.response?.status && apiError.response.status >= 500) {
    return i18n.t("orders.failedToLoadOrdersDesc");
  }

  if (apiError?.message?.includes("Network")) {
    return i18n.t("orders.networkError");
  }

  return (
    apiError?.response?.data?.message ||
    apiError?.message ||
    i18n.t("orders.genericLoadError")
  );
};

export const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object"
  ) {
    const data = error.response.data as Record<string, unknown>;
    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof data.error === "string") {
      return data.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

export interface MerchantOperationsTotals {
  assignedOrdersCount: number;
  assignedPieces: number;
  preparationOrdersCount: number;
  preparationPieces: number;
  inShippingOrdersCount: number;
  inShippingPieces: number;
  deliveredOrdersCount: number;
  deliveredPieces: number;
  notDeliveredOrdersCount: number;
  notDeliveredPieces: number;
  payablePieces: number;
  pendingPayablePieces: number;
  expectedReceivableAmount: number;
  inShippingAmount: number;
  deliveredPayableAmount: number;
  notDeliveredAmount: number;
  shippingCostAmount: number;
  confirmedCommissionAmount: number;
  pendingCommissionAmount: number;
  paidAmount: number;
}

export interface MerchantOperationsSummary {
  merchantId?: string;
  summary?: Partial<MerchantOperationsTotals>;
  [key: string]: unknown;
}

export const EMPTY_MERCHANT_OPERATIONS_TOTALS: MerchantOperationsTotals = {
  assignedOrdersCount: 0,
  assignedPieces: 0,
  preparationOrdersCount: 0,
  preparationPieces: 0,
  inShippingOrdersCount: 0,
  inShippingPieces: 0,
  deliveredOrdersCount: 0,
  deliveredPieces: 0,
  notDeliveredOrdersCount: 0,
  notDeliveredPieces: 0,
  payablePieces: 0,
  pendingPayablePieces: 0,
  expectedReceivableAmount: 0,
  inShippingAmount: 0,
  deliveredPayableAmount: 0,
  notDeliveredAmount: 0,
  shippingCostAmount: 0,
  confirmedCommissionAmount: 0,
  pendingCommissionAmount: 0,
  paidAmount: 0,
};

export const formatMerchantPieces = (value: string | number | undefined | null) =>
  Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 0,
  });

export const payoutStatusLabels: Record<string, string> = {
  PENDING: i18n.t("orders.pendingWithdrawal"),
  PROCESSED: i18n.t("orders.transferred"),
  FAILED: i18n.t("orders.transferFailed"),
  CANCELLED: i18n.t("orders.cancelled"),
};

export const getMerchantOperationsTotals = (
  summary?: MerchantOperationsSummary | null,
): MerchantOperationsTotals => ({
  ...EMPTY_MERCHANT_OPERATIONS_TOTALS,
  ...(summary?.summary || {}),
});
