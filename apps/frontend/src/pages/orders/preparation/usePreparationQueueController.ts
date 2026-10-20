import { useTranslation } from "react-i18next";
import { useMemo, useRef, useState, useDeferredValue } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCurrency } from "../../../hooks/useCurrency";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useInvoiceSettings } from "../../../hooks/useInvoiceSettings";
import { getApiErrorMessage } from "./helpers";
import type {
  PreparationOrder,
  QcCheckKey,
} from "./types";
import { usePreparationQueueData } from "./usePreparationQueueData";
import { usePreparationQueueUiState } from "./usePreparationQueueUiState";
import { isInternalCourierAppActive } from "./helpers/internalCourierHelper";
import { buildPreparationFiltersPayload } from "./helpers/preparationFiltersPayload";
import { usePreparationFulfillmentOperations } from "./usePreparationFulfillmentOperations";
import { usePreparationHoldOperations } from "./usePreparationHoldOperations";
import { usePreparationStatusOperations } from "./usePreparationStatusOperations";
import { usePreparationOrderSelection } from "./usePreparationOrderSelection";
import { usePreparationTransitions } from "./usePreparationTransitions";
import { usePreparationDialogState } from "./usePreparationDialogState";
import { usePreparationPreferences } from "./usePreparationPreferences";
import { usePreparationFilterMetadata } from "./usePreparationFilterMetadata";
import { usePreparationDraftSync } from "./usePreparationDraftSync";
import { usePreparationLocalMutations } from "./usePreparationLocalMutations";
import { usePreparationSectionsProps } from "./usePreparationSectionsProps";
import { usePreparationDerivedState } from "./usePreparationDerivedState";
import {
  getInitialPreparationState,
  usePreparationUrlSync,
} from "./usePreparationUrlSync";

export function usePreparationQueueController() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const { settings: invoiceSettings } = useInvoiceSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOverrides = useMemo(() => getInitialPreparationState(searchParams), [searchParams]);
  const { state: uiState, actions: uiActions } = usePreparationQueueUiState(initialOverrides);
  const {
    activeStage,
    selectedWarehouseId,
    selectedOrders,
    statusSelections,
    bulkStatus,
  } = uiState;
  const isMerchantUser = user?.role === "MERCHANT";

  const isInternalCourierActive = useMemo(
    () => isInternalCourierAppActive(user),
    [user],
  );

  const deferredSearch = useDeferredValue(uiState.search);

  const {
    orders,
    setOrders,
    inventory,
    inventoryLoading,
    ensureInventory,
    warehouses,
    statusConfigs,
    preparationStatuses,
    preparationSettings,
    pagination,
    summary,
    statusCounts,
    shortageOwnerOptions: serverShortageOwnerOptions,
    loading,
    fetchInventory,
    fetchAll,
    products,
    productsLoading,
  } = usePreparationQueueData({
    page: uiState.page,
    pageSize: uiState.pageSize,
    activeStage: uiState.activeStage,
    selectedWarehouseId: uiState.selectedWarehouseId,
    stockFilter: uiState.stockFilter,
    shortageReasonFilter: uiState.shortageReasonFilter,
    shortageFollowUpFilter: uiState.shortageFollowUpFilter,
    shortageOwnerFilter: uiState.shortageOwnerFilter,
    productFilter: uiState.productFilter,
    productColorFilter: uiState.productColorFilter,
    productSizeFilter: uiState.productSizeFilter,
    productIdFilter: uiState.productIdFilter,
    variantIdFilter: uiState.variantIdFilter,
    itemCountFilter: uiState.itemCountFilter,
    notPrintedFilter: uiState.notPrintedFilter,
    noShippingCodeFilter: uiState.noShippingCodeFilter,
    search: deferredSearch,
    sortBy: uiState.sortBy,
    sortOrder: uiState.sortOrder,
    companyId: user?.companyId || undefined,
  });

  const currentCompanyId = user?.companyId;

  const [qcChecklistState, setQcChecklistState] = useState<
    Record<string, Partial<Record<QcCheckKey, boolean>>>
  >({});
  const handleSingleStatusUpdateRef = useRef<(orderNumber: string, status: string) => Promise<boolean | void>>(async () => {});
  const updateLocalMetadataRef = useRef<(orderNumber: string, patch: Record<string, unknown>) => void>(() => {});

  const getOrderByNumberRef = useRef<(orderNumber: string) => PreparationOrder | null>(() => null);
  const updateLocalStatusesRef = useRef<(orderNumbers: string[], status: string) => void>(() => {});
  const setStatusChangeDialogRef = useRef<(dialog: unknown) => void>(() => {});

  const holdOps = usePreparationHoldOperations({
    orders,
    user,
    startingStatus: preparationSettings.startingStatus,
    updateLocalMetadata: (orderNumber, patch) => updateLocalMetadataRef.current(orderNumber, patch),
    updateLocalStatuses: (orderNumbers, status) => updateLocalStatusesRef.current(orderNumbers, status),
    getOrderByNumber: (orderNumber) => getOrderByNumberRef.current(orderNumber),
    fetchAll,
    handleSingleStatusUpdate: (orderNumber, status) => handleSingleStatusUpdateRef.current(orderNumber, status),
    setStatusChangeDialog: (dialog) => setStatusChangeDialogRef.current(dialog),
    getApiErrorMessage,
    t,
  });

  const {
    shortageHoldDrafts,
    setShortageHoldDrafts,
    problemHoldDrafts,
    setProblemHoldDrafts,
    problemHoldSavingOrderId,
    setProblemHoldSavingOrderId,
  } = holdOps;

  const {
    statusChangeDialog,
    setStatusChangeDialog,
    showInternalCourierModal,
    setShowInternalCourierModal,
    dialogOrder,
    dialogHoldReason,
    internalCourierOrderIds,
    handleInternalCourierSuccess,
  } = usePreparationDialogState({
    getOrderByNumber: (orderNumber) => getOrderByNumberRef.current(orderNumber),
    problemHoldDrafts,
    selectedOrders,
    clearBulkControls: uiActions.clearBulkControls,
    fetchAll,
    navigate,
  });
  setStatusChangeDialogRef.current = setStatusChangeDialog;

  const preferences = usePreparationPreferences();

  usePreparationDraftSync({
    orders,
    setShortageHoldDrafts,
    setProblemHoldDrafts,
    defaultWarehouseId: preparationSettings.defaultWarehouseId,
    uiActions,
    inventoryLength: inventory.length,
    inventoryLoading,
    ensureInventory,
  });

  usePreparationUrlSync({
    uiState,
    uiActions,
    searchParams,
    setSearchParams,
  });

  const {
    statusLabelMap,
    statusOptions,
    filterTabs,
    enabledQcChecks,
    inventorySummaryByProduct,
    preparationOrders,
    shortageOwnerOptions,
    productSuggestions,
  } = usePreparationFilterMetadata({
    statusConfigs,
    preparationStatuses,
    preparationSettings,
    orders,
    inventory,
    selectedWarehouseId,
    serverShortageOwnerOptions,
    shortageHoldDrafts,
    uiState,
    deferredSearch,
    currentCompanyId,
    clearBulkControls: uiActions.clearBulkControls,
    t,
  });

  const {
    stageCounts,
    totalPages,
    enrichedOrders,
    visibleOrdersCount,
    currentPageCount,
    allOverdueShortageFollowUpCount,
    allOverdueProblemFollowUpCount,
  } = usePreparationDerivedState({
    summary,
    pagination,
    preparationOrders,
    clampPage: uiActions.clampPage,
  });

  const {
    selectedSet,
    allVisibleSelected,
    toggleOrderSelection,
    toggleSelectAllVisible,
  } = usePreparationOrderSelection({
    selectedOrders,
    enrichedOrders,
    uiActions,
  });

  const {
    updateLocalStatuses,
    updateLocalMetadata,
    getOrderByNumber,
  } = usePreparationLocalMutations({
    setOrders,
    preparationOrders,
  });
  updateLocalStatusesRef.current = updateLocalStatuses;
  updateLocalMetadataRef.current = updateLocalMetadata;
  getOrderByNumberRef.current = getOrderByNumber;

  const {
    isQcComplete,
    validateTransition,
    handleQcCheckToggle,
  } = usePreparationTransitions({
    preparationSettings,
    enabledQcChecks,
    qcChecklistState,
    setQcChecklistState,
    userRole: user?.role,
    t,
  });

  const statusOps = usePreparationStatusOperations({
    getOrderByNumber,
    validateTransition,
    problemHoldDrafts,
    setProblemHoldDrafts,
    setProblemHoldSavingOrderId,
    updateLocalMetadata,
    updateLocalStatuses,
    statusLabelMap,
    preparationSettings,
    user,
    fetchAll,
    statusChangeDialog,
    setStatusChangeDialog,
    getApiErrorMessage,
    t,
    bulkStatus,
    selectedOrders,
    enrichedOrders,
    clearBulkControls: uiActions.clearBulkControls,
    paginationTotal: pagination.total,
    getFiltersPayload: () => buildPreparationFiltersPayload({ uiState, deferredSearch }),
  });
  handleSingleStatusUpdateRef.current = statusOps.handleSingleStatusUpdate;

  const fulfillmentOps = usePreparationFulfillmentOperations({
    orders,
    user,
    invoiceSettings,
    selectedWarehouseId,
    inventorySummaryByProduct,
    fetchInventory,
    selectedOrders,
    activeStage,
    getOrderByNumber,
    fetchAll,
    clearBulkControls: uiActions.clearBulkControls,
    navigate,
    getApiErrorMessage,
    t,
  });

  const {
    alertBannersProps,
    filtersContainerProps,
    selectionBarProps,
    ordersContainerProps,
    dialogsProps,
  } = usePreparationSectionsProps({
    preparationSettings,
    uiState,
    uiActions,
    preferences,
    formatPrice,
    formatDate,
    allOverdueShortageFollowUpCount,
    allOverdueProblemFollowUpCount,
    statusCounts,
    stageCounts,
    filterTabs,
    visibleOrdersCount,
    warehouseOptions: warehouses,
    shortageOwnerOptions,
    productSuggestions,
    allVisibleSelected,
    toggleSelectAllVisible,
    inventoryLoading,
    loading,
    statusOptions,
    statusLabelMap,
    isInternalCourierActive,
    setShowInternalCourierModal,
    showInternalCourierModal,
    enrichedOrders,
    pagination,
    totalPages,
    currentPageCount,
    statusSelections,
    selectedSet,
    selectedWarehouseId,
    enabledQcChecks,
    qcChecklistState,
    toggleOrderSelection,
    handleQcCheckToggle,
    statusChangeDialog,
    setStatusChangeDialog,
    dialogOrder,
    dialogHoldReason,
    internalCourierOrderIds,
    onInternalCourierSuccess: handleInternalCourierSuccess,
    statusOps,
    holdOps,
    fulfillmentOps,
  });

  return {
    isMerchantUser,
    formatPrice,
    formatDate,
    alertBannersProps,
    filtersContainerProps,
    selectionBarProps,
    ordersContainerProps,
    dialogsProps,
  };
}

export default usePreparationQueueController;
