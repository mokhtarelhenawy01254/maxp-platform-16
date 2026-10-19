import { useTranslation } from "react-i18next";
import React, { useCallback, useMemo, useRef, useState, useDeferredValue } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useAuth } from "../../hooks/useAuthSimple";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
import {
  getApiErrorMessage,
} from "./preparation/helpers";
import type {
  PreparationOrder,
  PreparationStatusOption,
  ProblemHoldDetails,
  QcCheckKey,
  ShortageHoldDetails,
} from "./preparation/types";
import { usePreparationQueueData } from "./preparation/usePreparationQueueData";
import { usePreparationQueueUiState, type PreparationQueueUiState } from "./preparation/usePreparationQueueUiState";
import PreparationQueueFiltersContainer from "./preparation/components/PreparationQueueFiltersContainer";
import PreparationQueueTableSection from "./preparation/components/PreparationQueueTableSection";
import MerchantOperationsSummary from "./preparation/components/MerchantOperationsSummary";
import type { ActiveCarrier } from "./preparation/components/DispatchCarrierModal";
import PreparationAlertBanners from "./preparation/components/PreparationAlertBanners";
import PreparationQueueDialogsContainer from "./preparation/components/PreparationQueueDialogsContainer";
import { isInternalCourierAppActive } from "./preparation/helpers/internalCourierHelper";
import { buildPreparationFiltersPayload } from "./preparation/helpers/preparationFiltersPayload";
import { usePreparationFulfillmentOperations } from "./preparation/usePreparationFulfillmentOperations";
import { usePreparationHoldOperations } from "./preparation/usePreparationHoldOperations";
import { usePreparationBulkStatusOperations } from "./preparation/usePreparationBulkStatusOperations";
import { usePreparationSingleStatusOperations } from "./preparation/usePreparationSingleStatusOperations";
import { usePreparationOrderSelection } from "./preparation/usePreparationOrderSelection";
import { usePreparationTransitions } from "./preparation/usePreparationTransitions";
import { usePreparationEnrichedOrders } from "./preparation/usePreparationEnrichedOrders";
import { usePreparationDialogState } from "./preparation/usePreparationDialogState";
import { usePreparationPreferences } from "./preparation/usePreparationPreferences";
import { usePreparationStatusOptions } from "./preparation/usePreparationStatusOptions";
import { usePreparationDraftSync } from "./preparation/usePreparationDraftSync";
import { usePreparationFilterDerived } from "./preparation/usePreparationFilterDerived";
import { usePreparationLocalMutations } from "./preparation/usePreparationLocalMutations";
import { usePreparationTableSectionProps } from "./preparation/usePreparationTableSectionProps";
import { usePreparationDerivedState } from "./preparation/usePreparationDerivedState";
import { usePreparationDialogOperations } from "./preparation/usePreparationDialogOperations";
import { usePreparationFilterSectionProps } from "./preparation/usePreparationFilterSectionProps";
import {
  getInitialPreparationState,
  usePreparationUrlSync,
} from "./preparation/usePreparationUrlSync";

const PreparationQueue: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const { settings: invoiceSettings } = useInvoiceSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOverrides = useMemo(() => getInitialPreparationState(searchParams), []);
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

  // rowUpdatingId provided by usePreparationSingleStatusOperations
  // bulkUpdating provided by usePreparationBulkStatusOperations
  const [qcChecklistState, setQcChecklistState] = useState<
    Record<string, Partial<Record<QcCheckKey, boolean>>>
  >({});
  const handleSingleStatusUpdateRef = useRef<(orderNumber: string, status: string) => Promise<boolean | void>>(async () => {});
  const updateLocalMetadataRef = useRef<(orderNumber: string, patch: Record<string, unknown>) => void>(() => {});

  const getOrderByNumberRef = useRef<(orderNumber: string) => PreparationOrder | null>(() => null);
  const updateLocalStatusesRef = useRef<(orderNumbers: string[], status: string) => void>(() => {});
  const setStatusChangeDialogRef = useRef<(dialog: any) => void>(() => {});

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
    editReasonOrder,
    setEditReasonOrder,
    editReasonOrderOrder,
    handleConfirmEditReason,
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
  const {
    visibleColumns,
    setVisibleColumns,
    toggleColumn,
    columnSettingsOpen,
    setColumnSettingsOpen,
    visibleFilterSections,
    setVisibleFilterSections,
    toggleFilterSection,
    showFilters,
    setShowFilters,
  } = usePreparationPreferences();

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
  } = usePreparationStatusOptions({
    statusConfigs,
    preparationStatuses,
    preparationSettings,
    t,
  });

  const { inventorySummaryByProduct, preparationOrders } = usePreparationEnrichedOrders({
    orders,
    inventory,
    selectedWarehouseId,
    t,
  });

  const { shortageOwnerOptions, productSuggestions } =
    usePreparationFilterDerived({
      serverShortageOwnerOptions,
      preparationOrders,
      shortageHoldDrafts,
      activeStage: uiState.activeStage,
      selectedWarehouseId: uiState.selectedWarehouseId,
      stockFilter: uiState.stockFilter,
      shortageReasonFilter: uiState.shortageReasonFilter,
      shortageFollowUpFilter: uiState.shortageFollowUpFilter,
      shortageOwnerFilter: uiState.shortageOwnerFilter,
      deferredSearch,
      notPrintedFilter: uiState.notPrintedFilter,
      noShippingCodeFilter: uiState.noShippingCodeFilter,
      sortBy: uiState.sortBy,
      sortOrder: uiState.sortOrder,
      currentCompanyId,
      clearBulkControls: uiActions.clearBulkControls,
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

  // handleShortageFieldChange provided by usePreparationShortageOperations



  // saveShortageHoldDetails provided by usePreparationShortageOperations
  const {
    rowUpdatingId,
    performStatusUpdate,
    handleSingleStatusUpdate,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  } = usePreparationSingleStatusOperations({
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
  });
  handleSingleStatusUpdateRef.current = handleSingleStatusUpdate;

  // Problem hold handlers provided by usePreparationProblemOperations
  const {
    bulkUpdating,
    setBulkUpdating,
    bulkHoldDialog,
    setBulkHoldDialog,
    executeBulkUpdateSelected,
    handleBulkUpdate,
    executeBulkUpdateAll,
    handleBulkUpdateAll,
  } = usePreparationBulkStatusOperations({
    bulkStatus,
    selectedOrders,
    enrichedOrders,
    getOrderByNumber,
    validateTransition,
    updateLocalStatuses,
    fetchAll,
    clearBulkControls: uiActions.clearBulkControls,
    statusLabelMap,
    paginationTotal: pagination.total,
    getFiltersPayload: () => buildPreparationFiltersPayload({ uiState, deferredSearch }),
    getApiErrorMessage,
    t,
  });

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
    activeCarriers,
    showDispatchModal,
    setShowDispatchModal,
    sendingToTurbo,
    handleDispatchToCarrier,
  } = fulfillmentOps;

  const { selectionBarProps, ordersContainerProps } =
    usePreparationTableSectionProps({
      allVisibleSelected,
      toggleSelectAllVisible,
      totalVisibleOrders: pagination.total,
      inventoryLoading,
      loading,
      showFilters,
      setShowFilters,
      columnSettingsOpen,
      setColumnSettingsOpen,
      visibleColumns,
      toggleColumn,
      visibleFilterSections,
      toggleFilterSection,
      selectedOrdersCount: selectedOrders.length,
      bulkStatus,
      statusOptions,
      statusLabelMap,
      bulkUpdating,
      preparationSettings,
      uiActions,
      handleBulkUpdate,
      handleBulkUpdateAll,
      isInternalCourierActive,
      setShowInternalCourierModal,
      enrichedOrders,
      pagination,
      totalPages,
      currentPageCount,
      uiState,
      statusSelections,
      selectedSet,
      rowUpdatingId,
      selectedWarehouseId,
      enabledQcChecks,
      qcChecklistState,
      formatPrice,
      formatDate,
      toggleOrderSelection,
      handleQcCheckToggle,
      handleRequestStatusChange,
      ...holdOps,
      ...fulfillmentOps,
    });

  const dialogsProps = usePreparationDialogOperations({
    statusChangeDialog,
    setStatusChangeDialog,
    dialogOrder,
    statusLabelMap,
    dialogHoldReason,
    rowUpdatingId,
    problemHoldSavingOrderId,
    handleConfirmStatusChange,
    bulkHoldDialog,
    setBulkHoldDialog,
    bulkUpdating,
    executeBulkUpdateSelected,
    executeBulkUpdateAll,
    editReasonOrder,
    setEditReasonOrder,
    editReasonOrderOrder,
    handleConfirmEditReason,
    showDispatchModal,
    setShowDispatchModal,
    selectedOrdersCount: selectedOrders.length,
    activeCarriers,
    handleDispatchToCarrier,
    sendingToTurbo,
    showInternalCourierModal,
    setShowInternalCourierModal,
    internalCourierOrderIds,
    onInternalCourierSuccess: handleInternalCourierSuccess,
  });

  const { alertBannersProps, filtersContainerProps } = usePreparationFilterSectionProps({
    preparationSettingsEnabled: Boolean(preparationSettings.enabled),
    allOverdueShortageFollowUpCount,
    allOverdueProblemFollowUpCount,
    showFilters,
    uiState,
    uiActions,
    statusCounts,
    stageCounts,
    filterTabs,
    visibleOrdersCount,
    warehouseOptions: warehouses,
    shortageOwnerOptions,
    productSuggestions,
  });

  return (
    <div className="space-y-3">
      {isMerchantUser ? (
        <MerchantOperationsSummary
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
      ) : null}

      <PreparationAlertBanners {...alertBannersProps} />
      <PreparationQueueFiltersContainer {...filtersContainerProps} />
      <PreparationQueueTableSection
        selectionBarProps={selectionBarProps}
        ordersContainerProps={ordersContainerProps}
      />
      <PreparationQueueDialogsContainer {...dialogsProps} />
    </div>
  );
};

export default PreparationQueue;
