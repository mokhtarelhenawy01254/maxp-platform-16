import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import useSocket from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { getStatusDisplay } from "../../utils/statusRegistry";

import { OrdersToolbarSection } from "./components/OrdersToolbarSection";
import { OrdersTableSection } from "./components/OrdersTableSection";
import { useOrdersInitialState } from "./hooks/useOrdersInitialState";
import { useOrdersBulkOperations } from "./hooks/useOrdersBulkOperations";
import type { GeneratedInvoice } from "./hooks/useOrdersBulkOperations";
import { useOrdersLookupData } from "./hooks/useOrdersLookupData";
import { useOrdersFetchOperations } from "./hooks/useOrdersFetchOperations";
import { useOrdersUrlSync } from "./hooks/useOrdersUrlSync";
import { useOrdersOperationPermissions } from "./hooks/useOrdersOperationPermissions";
import { useOrdersTableSettings } from "./hooks/useOrdersTableSettings";
import { useOrdersSocketListeners } from "./hooks/useOrdersSocketListeners";
import { useOrdersFilterStats } from "./hooks/useOrdersFilterStats";
import type { SocketOrderUpdate } from "./hooks/useOrdersSocketListeners";
import {
  OrdersFilters,
  OrdersListViewState,
  DEFAULT_ORDERS_FILTERS,
  getInitialOrdersListViewState,
} from "./ordersFilterTypes";
import { useOrdersFilterActions } from "./hooks/useOrdersFilterActions";
import { useOrdersStatusDisplays } from "./hooks/useOrdersStatusDisplays";
import { useOrdersSingleMutations } from "./hooks/useOrdersSingleMutations";
import { useOrdersEntityFormatters } from "./hooks/useOrdersEntityFormatters";
import { useOrdersViewHelpers } from "./hooks/useOrdersViewHelpers";
import { useOrdersToolbarSectionProps } from "./hooks/useOrdersToolbarSectionProps";
import { useOrdersTableSectionProps } from "./hooks/useOrdersTableSectionProps";
import { useOrdersModalsContainerProps } from "./hooks/useOrdersModalsContainerProps";
import { OrdersModalsContainer } from "./components/OrdersModalsContainer";


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

export type { SocketOrderUpdate };

export type { GeneratedInvoice };

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

// Filter search and state helpers imported from ./ordersFilterTypes

const Orders: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const companyId = user?.companyId || company?.id || "default";

  const {
    orders,
    setOrders,
    ordersRef,
    loading,
    setLoading,
    ordersLoadError,
    setOrdersLoadError,
    isAdmin,
    isMerchant,
    canSelectOrders,
    selectedOrder,
    setSelectedOrder,
    showOrderModal,
    setShowOrderModal,
    page,
    setPage,
    limit,
    setLimit,
    totalOrders,
    setTotalOrders,
    totalPages,
    setTotalPages,
    selectedOrders,
    setSelectedOrders,
    showAdvancedFilters,
    setShowAdvancedFilters,
    filters,
    setFilters,
    effectiveFilters,
    filtersRef,
    showIncompleteInOrders,
    setShowIncompleteInOrders,
    lastUpdatedAt,
    setLastUpdatedAt,
  } = useOrdersInitialState({
    searchParams,
    companyId,
    userRole: user?.role,
  });

  const {
    orderStatuses,
    paymentStatuses,
    orderStatusMap,
    paymentStatusMap,
    merchantOptions,
    affiliateOptions,
    merchantSettlementSummary,
    merchantSettlementLoading,
    merchantSettlementError,
    activeCarriers,
    hasActiveTurbo,
    hasActiveQpExpress,
    hasActiveBosta,
  } = useOrdersLookupData({
    companyId,
    isAdmin,
    isMerchant,
    canSelectOrders,
    merchantFilterId: filters.merchantId?.[0] || "",
    merchantFilterLength: filters.merchantId?.length || 0,
    defaultOrderStatuses: DEFAULT_ORDER_STATUSES,
    defaultPaymentStatuses: DEFAULT_PAYMENT_STATUSES,
    normalizeStatusCode,
    getApiErrorMessage,
  });

  const { fetchOrders, fetchOrdersRef } = useOrdersFetchOperations({
    companyId,
    page,
    limit,
    filters,
    effectiveFilters,
    isMerchant,
    ordersRef,
    setOrders,
    setTotalPages,
    setTotalOrders,
    setSelectedOrders,
    setPage,
    setLoading,
    setOrdersLoadError,
    setLastUpdatedAt,
    setShowIncompleteInOrders,
  });

  useOrdersUrlSync({
    filters,
    setFilters,
    page,
    setPage,
    limit,
    setLimit,
    searchParams,
    setSearchParams,
  });

  const isTrashView =
    Array.isArray(filters.status) &&
    filters.status.some((s) => s.toLowerCase() === "trash");

  const {
    tableDensity,
    changeTableDensity,
    columnsToRender,
    tableColumnCount,
  } = useOrdersTableSettings({
    companyOrdersTableColumns: company?.settings?.ordersTableColumns,
    canSelectOrders,
  });
  const fieldClassName =
    "theme-native-control w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-100";
  const {
    hasAgentWorkspace,
    canShowUnifiedOperationFilters,
    showOrderSourceFilter,
    showMerchantOperationFilters,
    showAffiliateOperationFilter,
    showUnifiedOperationFilters,
    merchantOperationFilterIsActive,
    affiliateFilterIsActive,
    sourceFilterIsActive,
  } = useOrdersOperationPermissions({
    user,
    company,
    isAdmin,
    isMerchant,
    filters,
    merchantOptions,
    affiliateOptions,
  });



  // Stats State

  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  // orderStatusMap and paymentStatusMap are provided by useOrdersLookupData
  const {
    activeFilterCount,
    advancedFilterCount,
    hasCustomDateFilters,
  } = useOrdersFilterStats(filters);

  // Active advanced filters are surfaced via FilterChips while the panel stays
  // collapsed — no auto-open. Users expand deliberately with the فلاتر toggle.

  // Socket.IO Integration
  const { socket, isConnected } = useSocket();

  // Lookup data and filter effects managed by useOrdersLookupData hook

  useOrdersSocketListeners({
    socket,
    isConnected,
    page,
    limit,
    filtersRef,
    ordersRef,
    fetchOrdersRef,
    setOrders,
    setTotalOrders,
  });

  const {
    getCustomerDisplayName,
    getConfidenceColor,
    getConfidenceIcon,
    getRelativeTime,
    getAffiliateDisplayName,
    getFulfillmentSourceText,
  } = useOrdersEntityFormatters({
    t,
    formatDate,
  });

  const {
    displayedOrders,
    setQuickDate,
    clearAdvancedFilters,
    handleFilterChange,
    applySavedFilters,
    clearAllFilters,
    handlePageChange,
    handleLimitChange,
    toggleOrderSelection,
    toggleAllSelection,
  } = useOrdersFilterActions({
    orders,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    limit,
    setLimit,
    selectedOrders,
    setSelectedOrders,
    setShowAdvancedFilters,
  });

  const {
    bulkProcessing,
    printingInvoices,
    selectedInvoice,
    setSelectedInvoice,
    handleBulkStatusUpdate,
    handleBulkDelete,
    handleBulkPrintInvoices,
    handleBulkCreateTurboShipments,
    handleBulkCreateQpExpressShipments,
    handleBulkCreateBostaShipments,
  } = useOrdersBulkOperations({
    selectedOrders,
    setSelectedOrders,
    isTrashView,
    fetchOrders,
    user,
    navigate,
    t,
    getStatusDisplay,
    normalizeStatusCode,
    isCancellationStatus,
    getApiErrorMessage,
  });

  // hasActiveTurbo, hasActiveQpExpress, hasActiveBosta provided by useOrdersLookupData

  const {
    getStatusBadgeStyle,
    getUnifiedStatusDisplay,
    getPaymentStatusColor,
    getPaymentStatusText,
    getPaymentStatusBadgeStyle,
    filterableOrderStatuses,
    filterablePaymentStatuses,
    bulkUpdatableStatuses,
    getOrderSourceText,
  } = useOrdersStatusDisplays({
    orderStatuses,
    paymentStatuses,
    orderStatusMap,
    paymentStatusMap,
    filters,
    showIncompleteInOrders,
    normalizeStatusCode,
    t,
  });

  const {
    handleUpdateStatus,
    handleUpdatePaymentStatus,
    handleMarkAsViewed,
  } = useOrdersSingleMutations({
    orders,
    setOrders,
    selectedOrder,
    setSelectedOrder,
    normalizeStatusCode,
    isCancellationStatus,
    getApiErrorMessage,
    t,
  });

  const {
    handleOpenOrder,
    handleCustomerRatingChange,
    mobileListHelpers,
    tableHelpers,
  } = useOrdersViewHelpers({
    navigate,
    setSelectedOrder,
    setShowOrderModal,
    handleMarkAsViewed,
    setOrders,
    getCustomerDisplayName,
    formatPrice,
    getOrderAmount,
    getOrderSourceText,
    getRelativeTime,
    formatDate,
    getPaymentStatusBadgeStyle,
    getPaymentStatusColor,
    getPaymentStatusText,
    getUnifiedStatusDisplay,
    getConfidenceColor,
    getConfidenceIcon,
  });

  const toolbarSectionProps = useOrdersToolbarSectionProps({
    filters,
    advancedFilterCount,
    ordersLoadError,
    showAdvancedFilters,
    setShowAdvancedFilters,
    fieldClassName,
    filterableOrderStatuses,
    filterablePaymentStatuses,
    merchantOptions,
    affiliateOptions,
    showOrderSourceFilter,
    showUnifiedOperationFilters,
    showMerchantOperationFilters,
    showAffiliateOperationFilter,
    hasCustomDateFilters,
    getAffiliateDisplayName,
    handleFilterChange,
    applySavedFilters,
    clearAdvancedFilters,
    setQuickDate,
    fetchOrders,
    isAdmin,
    isMerchant,
    merchantSettlementSummary,
    merchantSettlementLoading,
    merchantSettlementError,
    formatPrice,
    getFulfillmentSourceText,
  });

  const tableSectionProps = useOrdersTableSectionProps({
    canSelectOrders,
    selectedOrders,
    bulkUpdatableStatuses,
    isTrashView,
    bulkProcessing,
    printingInvoices,
    setSelectedOrders,
    handleBulkStatusUpdate,
    handleBulkPrintInvoices,
    handleBulkDelete,
    hasActiveTurbo,
    hasActiveQpExpress,
    hasActiveBosta,
    handleBulkCreateTurboShipments,
    handleBulkCreateQpExpressShipments,
    handleBulkCreateBostaShipments,
    displayedOrders,
    loading,
    ordersLoadError,
    isMerchant,
    activeFilterCount,
    search: filters.search,
    columnsToRender,
    tableColumnCount,
    tableDensity,
    page,
    totalPages,
    totalOrders,
    limit,
    mobileListHelpers,
    tableHelpers,
    handleOpenOrder,
    toggleOrderSelection,
    toggleAllSelection,
    handleMarkAsViewed,
    clearAllFilters,
    handleCustomerRatingChange,
    handlePageChange,
    handleLimitChange,
    changeTableDensity,
  });

  const modalsContainerProps = useOrdersModalsContainerProps({
    selectedOrder,
    setSelectedOrder,
    showOrderModal,
    setShowOrderModal,
    isMerchant,
    orderStatuses,
    orders,
    setOrders,
    selectedInvoice,
    setSelectedInvoice,
  });

  return (
    <div
      data-orders-page="true"
      className="orders-page-root flex-1 h-full min-h-0 overflow-y-auto bg-slate-50/60 dark:bg-zinc-950 px-2 py-2 sm:px-3 sm:py-2.5"
    >
      <div className="w-full max-w-none">
        <OrdersToolbarSection {...toolbarSectionProps} />
        <OrdersTableSection {...tableSectionProps} />
      </div>

      <OrdersModalsContainer {...modalsContainerProps} />
    </div>
  );
};

export default Orders;
