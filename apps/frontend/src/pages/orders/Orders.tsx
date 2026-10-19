import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import useSocket from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { apiClient } from "../../services/apiClient";
import { queryClient } from "../../config/queryClient";
import { toast } from "sonner";
import { getStatusDisplay } from "../../utils/statusRegistry";

import { OrdersMobileList } from "./components/OrdersMobileList";
import { OrdersToolbar } from "./components/OrdersToolbar";
import { OrdersTable } from "./components/OrdersTable";
import { OrdersStatsBar } from "./components/OrdersStatsBar";

import { OrdersPagination } from "./components/OrdersPagination";
import { BulkActionBar } from "./components/BulkActionBar";
import { OrdersBulkCommandPalette } from "./components/OrdersBulkCommandPalette";
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
  ORDERS_LIST_QUERY_KEYS,
  sanitizeStoredFilters,
  readStoredOrdersListViewState,
  hasOrdersQueryState,
  getInitialOrdersListViewState,
} from "./ordersFilterTypes";
import type { OrderDetailsType } from "./types";
import { useOrdersFilterActions } from "./hooks/useOrdersFilterActions";
import { useOrdersStatusDisplays } from "./hooks/useOrdersStatusDisplays";
import { useOrdersSingleMutations } from "./hooks/useOrdersSingleMutations";
import { useOrdersEntityFormatters } from "./hooks/useOrdersEntityFormatters";
import { HeldOrdersBanner } from "./components/HeldOrdersBanner";
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

  const initialListViewState = useRef<OrdersListViewState | null>(null);
  if (!initialListViewState.current) {
    initialListViewState.current = getInitialOrdersListViewState(searchParams);
  }
  const restoredListViewState = initialListViewState.current!;

  const initialCacheKey = useMemo(
    () => [
      "orders-page-cache",
      user?.companyId || company?.id || "default",
      restoredListViewState.page,
      restoredListViewState.limit,
      { ...restoredListViewState.filters, search: restoredListViewState.filters.search },
    ],
    [user?.companyId, company?.id, restoredListViewState]
  );
  const initialCachedData = queryClient.getQueryData<{
    orders: Order[];
    totalPages: number;
    totalOrders: number;
  }>(initialCacheKey);

  const [orders, setOrders] = useState<Order[]>(() => initialCachedData?.orders || []);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const [loading, setLoading] = useState(() => !initialCachedData?.orders?.length);
  const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);
  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(
    user?.role || "",
  );
  const isMerchant = user?.role === "MERCHANT";
  const canSelectOrders = isAdmin && !isMerchant;
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [page, setPage] = useState(restoredListViewState.page);
  const [limit, setLimit] = useState(restoredListViewState.limit);
  const [totalOrders, setTotalOrders] = useState(() => initialCachedData?.totalOrders || 0);
  const [totalPages, setTotalPages] = useState(() => initialCachedData?.totalPages || 0);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<OrdersFilters>(
    restoredListViewState.filters,
  );

  const companyId = user?.companyId || company?.id || "default";

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
    merchantFilterId: filters.merchantId[0] || "",
    merchantFilterLength: filters.merchantId.length,
    defaultOrderStatuses: DEFAULT_ORDER_STATUSES,
    defaultPaymentStatuses: DEFAULT_PAYMENT_STATUSES,
    normalizeStatusCode,
    getApiErrorMessage,
  });
  // Debounced search: the input updates filters.search instantly (responsive
  // typing) while list fetches wait for a 300ms pause — one request per query
  // instead of one per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);
  const effectiveFilters = useMemo<OrdersFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );
  // Keep a ref to the latest filters so the socket listeners (which only
  // re-subscribe on [socket, isConnected, page]) can read current filter
  // state without re-binding the listeners on every filter change.
  const filtersRef = useRef<OrdersFilters>(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  const [showIncompleteInOrders, setShowIncompleteInOrders] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

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

  const handleOpenOrder = (order: Order) => {
    if (order.metadata?.isIncompleteCart) {
      navigate(`/orders/incomplete/${encodeURIComponent(order.metadata.cartId || order.orderNumber)}`);
      return;
    }
    setSelectedOrder(order);
    setShowOrderModal(true);
    if (!order.isViewed) {
      handleMarkAsViewed(order.orderNumber);
    }
  };

  const mobileListHelpers = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  const tableHelpers = useMemo(
    () => ({
      getCustomerDisplayName,
      formatPrice,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
      getConfidenceColor,
      getConfidenceIcon,
      getOrderSourceText,
    }),
    [
      getCustomerDisplayName,
      formatPrice,
      getRelativeTime,
      formatDate,
      getPaymentStatusBadgeStyle,
      getPaymentStatusColor,
      getPaymentStatusText,
      getUnifiedStatusDisplay,
      getConfidenceColor,
      getConfidenceIcon,
      getOrderSourceText,
    ],
  );

  const handleCustomerRatingChange = (orderNumber: string, newRating: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === orderNumber || o.id === orderNumber
          ? {
              ...o,
              customerRating: newRating,
              customer: o.customer
                ? { ...o.customer, customerRating: newRating }
                : undefined,
            }
          : o
      )
    );
  };

  return (
    <div
      data-orders-page="true"
      className="orders-page-root flex-1 h-full min-h-0 overflow-y-auto bg-slate-50/60 dark:bg-zinc-950 px-2 py-2 sm:px-3 sm:py-2.5"
    >
      <div className="w-full max-w-none">
        <HeldOrdersBanner />

        <OrdersToolbar
        filters={filters}
        advancedFilterCount={advancedFilterCount}
        ordersLoadError={ordersLoadError}
        showAdvancedFilters={showAdvancedFilters}
        fieldClassName={fieldClassName}
        filterableOrderStatuses={filterableOrderStatuses}
        filterablePaymentStatuses={filterablePaymentStatuses}
        merchantOptions={merchantOptions}
        affiliateOptions={affiliateOptions}
        showOrderSourceFilter={showOrderSourceFilter}
        showUnifiedOperationFilters={showUnifiedOperationFilters}
        showMerchantOperationFilters={showMerchantOperationFilters}
        showAffiliateOperationFilter={showAffiliateOperationFilter}
        hasCustomDateFilters={hasCustomDateFilters}
        getAffiliateDisplayName={getAffiliateDisplayName}
        onFilterChange={handleFilterChange}
        onApplyFilters={applySavedFilters}
        onClearAdvancedFilters={clearAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters((prev) => !prev)}
        onSetQuickDate={setQuickDate}
        onRetry={fetchOrders}
        onRefresh={fetchOrders}
      />

      <OrdersStatsBar
        isAdmin={isAdmin}
        isMerchant={isMerchant}
        merchantId={filters.merchantId[0] || ""}
        merchantSettlementSummary={merchantSettlementSummary}
        merchantSettlementLoading={merchantSettlementLoading}
        merchantSettlementError={merchantSettlementError}
        merchantOptions={merchantOptions}
        formatPrice={formatPrice}
        getFulfillmentSourceText={getFulfillmentSourceText}
        onClearMerchantFilters={() => {
          handleFilterChange("merchantOperationStatus", []);
          handleFilterChange("merchantSettlementStatus", []);
        }}
        onShowDueOrders={() => {
          handleFilterChange("merchantOperationStatus", ["DELIVERED"]);
          handleFilterChange("merchantSettlementStatus", ["PAYABLE"]);
        }}
      />

      {/* Bulk Toolbar */}
      {canSelectOrders && (
        <BulkActionBar
          count={selectedOrders.length}
          statuses={bulkUpdatableStatuses}
          isTrashView={isTrashView}
          busy={bulkProcessing}
          printing={printingInvoices}
          onClearSelection={() => setSelectedOrders([])}
          onStatusChange={handleBulkStatusUpdate}
          onPrintInvoices={handleBulkPrintInvoices}
          onCreateTurboShipments={hasActiveTurbo ? handleBulkCreateTurboShipments : undefined}
          onCreateQpExpressShipments={hasActiveQpExpress ? handleBulkCreateQpExpressShipments : undefined}
          onCreateBostaShipments={hasActiveBosta ? handleBulkCreateBostaShipments : undefined}
          onDelete={handleBulkDelete}
        />
      )}

      {/* Hidden command palette that registers the page-level bulk actions.
          The toolbar already has its own palette trigger; this one is mount-only
          (no trigger button) and just contributes commands to the same global
          keyboard shortcut handler. */}
      <OrdersBulkCommandPalette
        hasActiveTurbo={hasActiveTurbo}
        hasActiveQpExpress={hasActiveQpExpress}
        hasActiveBosta={hasActiveBosta}
        handleBulkPrintInvoices={handleBulkPrintInvoices}
        handleBulkCreateTurboShipments={handleBulkCreateTurboShipments}
        handleBulkCreateQpExpressShipments={handleBulkCreateQpExpressShipments}
        handleBulkCreateBostaShipments={handleBulkCreateBostaShipments}
        handleBulkDelete={handleBulkDelete}
      />

      <OrdersMobileList
        orders={displayedOrders}
        loading={loading}
        ordersLoadError={ordersLoadError}
        selectedOrders={selectedOrders}
        canSelectOrders={canSelectOrders}
        isMerchant={isMerchant}
        activeFilterCount={activeFilterCount}
        search={filters.search}
        density={tableDensity}
        helpers={mobileListHelpers}
        onOpenOrder={handleOpenOrder}
        onToggleSelection={toggleOrderSelection}
        onMarkAsViewed={handleMarkAsViewed}
        onClearFilters={clearAllFilters}
        onCustomerRatingChange={handleCustomerRatingChange}
      />

      <OrdersTable
        orders={displayedOrders}
        loading={loading}
        ordersLoadError={ordersLoadError}
        selectedOrders={selectedOrders}
        canSelectOrders={canSelectOrders}
        isMerchant={isMerchant}
        activeFilterCount={activeFilterCount}
        search={filters.search}
        columns={columnsToRender}
        columnCount={tableColumnCount}
        density={tableDensity}
        page={page}
        totalPages={totalPages}
        totalOrders={totalOrders}
        limit={limit}
        helpers={tableHelpers}
        onOpenOrder={handleOpenOrder}
        onToggleSelection={toggleOrderSelection}
        onToggleAllSelection={toggleAllSelection}
        onMarkAsViewed={handleMarkAsViewed}
        onClearFilters={clearAllFilters}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onDensityChange={changeTableDensity}
        onCustomerRatingChange={handleCustomerRatingChange}
      />

      {!loading && displayedOrders.length > 0 && (
        <OrdersPagination
          variant="mobile"
          page={page}
          totalPages={totalPages}
          totalOrders={totalOrders}
          limit={limit}
          density={tableDensity}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onDensityChange={changeTableDensity}
        />
      )}
      </div>

      <OrdersModalsContainer
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        showOrderModal={showOrderModal}
        setShowOrderModal={setShowOrderModal}
        isMerchant={isMerchant}
        orderStatuses={orderStatuses}
        onOrderUpdate={(updatedOrder) => {
          setSelectedOrder(updatedOrder);
          setOrders(
            orders.map((o) =>
              o.orderNumber === updatedOrder.orderNumber ? updatedOrder : o,
            ),
          );
        }}
        selectedInvoice={selectedInvoice}
        setSelectedInvoice={setSelectedInvoice}
      />
    </div>
  );
};

export default Orders;
