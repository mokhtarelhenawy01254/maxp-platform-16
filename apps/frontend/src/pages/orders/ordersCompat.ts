import {
  transformOrder,
  normalizeOrderStatus,
  normalizePaymentStatus,
  isRecord,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentStatus,
  type RawOrder,
  type RawOrderItem,
  type AffiliateFilterOption,
  type MerchantOrderScope,
} from "./utils/orderTransformer";

export type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  RawOrder,
  RawOrderItem,
  AffiliateFilterOption,
  MerchantOrderScope,
};
export { transformOrder, normalizeOrderStatus, normalizePaymentStatus, isRecord };

import type { SocketOrderUpdate } from "./hooks/useOrdersSocketListeners";
export type { SocketOrderUpdate };

import type { GeneratedInvoice } from "./hooks/useOrdersBulkOperations";
export type { GeneratedInvoice };

import {
  type OrdersFilters,
  type OrdersListViewState,
  DEFAULT_ORDERS_FILTERS,
} from "./ordersFilterTypes";

export type { OrdersFilters, OrdersListViewState };
export { DEFAULT_ORDERS_FILTERS };

import {
  type OrderStatusDefinition,
  type MerchantFilterOption,
  type MerchantInventorySummary,
  type MerchantPayout,
  type MerchantPayoutSummary,
  type MerchantSettlementSummary,
  normalizeStatusCode,
  isCancellationStatus,
  DEFAULT_ORDER_STATUSES,
  DEFAULT_PAYMENT_STATUSES,
  FILTERABLE_STATUS_CODES,
  BULK_UPDATABLE_STATUS_CODES,
} from "./ordersConstants";

export type {
  OrderStatusDefinition,
  MerchantFilterOption,
  MerchantInventorySummary,
  MerchantPayout,
  MerchantPayoutSummary,
  MerchantSettlementSummary,
};
export {
  normalizeStatusCode,
  isCancellationStatus,
  DEFAULT_ORDER_STATUSES,
  DEFAULT_PAYMENT_STATUSES,
  FILTERABLE_STATUS_CODES,
  BULK_UPDATABLE_STATUS_CODES,
};

import {
  ORDER_TABLE_COLUMNS,
  normalizeOrderTableColumns,
  getOrderAmount,
  getOrdersLoadErrorMessage,
  getApiErrorMessage,
  EMPTY_MERCHANT_OPERATIONS_TOTALS,
  formatMerchantPieces,
  payoutStatusLabels,
  getMerchantOperationsTotals,
  type OrderTableColumn,
  type MerchantOperationsTotals,
  type MerchantOperationsSummary,
} from "./utils/ordersTableHelpers";

export {
  ORDER_TABLE_COLUMNS,
  normalizeOrderTableColumns,
  getOrderAmount,
  getOrdersLoadErrorMessage,
  getApiErrorMessage,
  EMPTY_MERCHANT_OPERATIONS_TOTALS,
  formatMerchantPieces,
  payoutStatusLabels,
  getMerchantOperationsTotals,
};
export type {
  OrderTableColumn,
  MerchantOperationsTotals,
  MerchantOperationsSummary,
};
