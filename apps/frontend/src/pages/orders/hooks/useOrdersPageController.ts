import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../../hooks/useCurrency";
import { useDateFormat } from "../../../hooks/useDateFormat";
import useSocket from "../../../hooks/useSocket";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useCompany } from "../../../contexts/CompanyContext";
import { getStatusDisplay } from "../../../utils/statusRegistry";

import { useOrdersInitialState } from "./useOrdersInitialState";
import { useOrdersOperations } from "./useOrdersOperations";
import { useOrdersLookupData } from "./useOrdersLookupData";
import { useOrdersFetchOperations } from "./useOrdersFetchOperations";
import { useOrdersUrlSync } from "./useOrdersUrlSync";
import { useOrdersOperationPermissions } from "./useOrdersOperationPermissions";
import { useOrdersTableSettings } from "./useOrdersTableSettings";
import { useOrdersSocketListeners } from "./useOrdersSocketListeners";
import { useOrdersFilterStats } from "./useOrdersFilterStats";
import { useOrdersViewDecorators } from "./useOrdersViewDecorators";
import { useOrdersSectionsProps } from "./useOrdersSectionsProps";

import {
  normalizeStatusCode,
  isCancellationStatus,
  DEFAULT_ORDER_STATUSES,
  DEFAULT_PAYMENT_STATUSES,
  getApiErrorMessage,
} from "../ordersCompat";

export const useOrdersPageController = () => {
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
    showOrderSourceFilter,
    showMerchantOperationFilters,
    showAffiliateOperationFilter,
    showUnifiedOperationFilters,
  } = useOrdersOperationPermissions({
    user,
    company,
    isAdmin,
    isMerchant,
    filters,
    merchantOptions,
    affiliateOptions,
  });

  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const {
    activeFilterCount,
    advancedFilterCount,
    hasCustomDateFilters,
  } = useOrdersFilterStats(filters);

  const { socket, isConnected } = useSocket();

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

  const operations = useOrdersOperations({
    orders,
    setOrders,
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
    isTrashView,
    fetchOrders,
    user,
    navigate,
    t,
    getStatusDisplay,
    normalizeStatusCode,
    isCancellationStatus,
    getApiErrorMessage,
    selectedOrder,
    setSelectedOrder,
  });

  const decorators = useOrdersViewDecorators({
    t,
    formatDate,
    formatPrice,
    orderStatuses,
    paymentStatuses,
    orderStatusMap,
    paymentStatusMap,
    filters,
    showIncompleteInOrders,
    normalizeStatusCode,
    navigate,
    setSelectedOrder,
    setShowOrderModal,
    handleMarkAsViewed: operations.handleMarkAsViewed,
    setOrders,
  });

  const { toolbarSectionProps, tableSectionProps, modalsContainerProps } =
    useOrdersSectionsProps({
      filters,
      advancedFilterCount,
      activeFilterCount,
      ordersLoadError,
      showAdvancedFilters,
      setShowAdvancedFilters,
      fieldClassName,
      merchantOptions,
      affiliateOptions,
      showOrderSourceFilter,
      showUnifiedOperationFilters,
      showMerchantOperationFilters,
      showAffiliateOperationFilter,
      hasCustomDateFilters,
      fetchOrders,
      isAdmin,
      isMerchant,
      merchantSettlementSummary,
      merchantSettlementLoading,
      merchantSettlementError,
      formatPrice,
      canSelectOrders,
      selectedOrders,
      isTrashView,
      setSelectedOrders,
      hasActiveTurbo,
      hasActiveQpExpress,
      hasActiveBosta,
      loading,
      columnsToRender,
      tableColumnCount,
      tableDensity,
      page,
      totalPages,
      totalOrders,
      limit,
      changeTableDensity,
      orderStatuses,
      orders,
      setOrders,
      selectedOrder,
      setSelectedOrder,
      showOrderModal,
      setShowOrderModal,
      operations,
      decorators,
    });

  return { toolbarSectionProps, tableSectionProps, modalsContainerProps };
};
