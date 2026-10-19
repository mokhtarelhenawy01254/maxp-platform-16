import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
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
import { usePreparationCarrierDispatch } from "./preparation/usePreparationCarrierDispatch";
import { usePreparationInvoicePrinting } from "./preparation/usePreparationInvoicePrinting";
import { usePreparationShortageOperations } from "./preparation/usePreparationShortageOperations";
import { usePreparationProblemOperations } from "./preparation/usePreparationProblemOperations";
import { usePreparationBulkStatusOperations } from "./preparation/usePreparationBulkStatusOperations";
import { usePreparationSingleStatusOperations } from "./preparation/usePreparationSingleStatusOperations";
import { usePreparationOrderSelection } from "./preparation/usePreparationOrderSelection";
import { usePreparationTransitions } from "./preparation/usePreparationTransitions";
import { usePreparationQuickTransfer } from "./preparation/usePreparationQuickTransfer";
import { usePreparationSlipPrint } from "./preparation/usePreparationSlipPrint";
import { usePreparationEnrichedOrders } from "./preparation/usePreparationEnrichedOrders";
import { usePreparationDialogState } from "./preparation/usePreparationDialogState";
import { usePreparationPreferences } from "./preparation/usePreparationPreferences";
import { usePreparationStatusOptions } from "./preparation/usePreparationStatusOptions";
import { usePreparationDraftSync } from "./preparation/usePreparationDraftSync";
import { usePreparationFilterDerived } from "./preparation/usePreparationFilterDerived";
import { usePreparationLocalMutations } from "./preparation/usePreparationLocalMutations";
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
    stockFilter,
    shortageReasonFilter,
    shortageFollowUpFilter,
    shortageOwnerFilter,
    productFilter,
    itemCountFilter,
    notPrintedFilter,
    noShippingCodeFilter,
    search,
    sortBy,
    sortOrder,
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

  const {
    shortageHoldDrafts,
    setShortageHoldDrafts,
    shortageSavingOrderId,
    handleShortageFieldChange,
    saveShortageHoldDetails,
    handleMarkAsShortageHold,
    handleReleaseShortageHold,
    handleMarkAsShortageFailed,
  } = usePreparationShortageOperations({
    orders,
    startingStatus: preparationSettings.startingStatus,
    updateLocalMetadata: (orderNumber, patch) => updateLocalMetadataRef.current(orderNumber, patch),
    fetchAll,
    handleSingleStatusUpdate: (orderNumber, status) => handleSingleStatusUpdateRef.current(orderNumber, status),
    getApiErrorMessage,
    t,
  });

  const getOrderByNumberRef = useRef<(orderNumber: string) => PreparationOrder | null>(() => null);
  const updateLocalStatusesRef = useRef<(orderNumbers: string[], status: string) => void>(() => {});
  const setStatusChangeDialogRef = useRef<(dialog: any) => void>(() => {});

  const {
    problemHoldDrafts,
    setProblemHoldDrafts,
    problemHoldSavingOrderId,
    setProblemHoldSavingOrderId,
    editReasonOrder,
    setEditReasonOrder,
    editReasonOrderOrder,
    saveProblemHoldDetails,
    handleHoldAsProblem,
    handleEditProblemReason,
    handleConfirmEditReason,
    handleReleaseProblemHold,
  } = usePreparationProblemOperations({
    orders,
    user,
    startingStatus: preparationSettings.startingStatus,
    getOrderByNumber: (orderNumber) => getOrderByNumberRef.current(orderNumber),
    updateLocalMetadata: (orderNumber, patch) => updateLocalMetadataRef.current(orderNumber, patch),
    updateLocalStatuses: (orderNumbers, status) => updateLocalStatusesRef.current(orderNumbers, status),
    fetchAll,
    setStatusChangeDialog: (dialog) => setStatusChangeDialogRef.current(dialog),
    getApiErrorMessage,
    t,
  });

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
      activeStage,
      selectedWarehouseId,
      stockFilter,
      shortageReasonFilter,
      shortageFollowUpFilter,
      shortageOwnerFilter,
      deferredSearch,
      notPrintedFilter,
      noShippingCodeFilter,
      sortBy,
      sortOrder,
      currentCompanyId,
      clearBulkControls: uiActions.clearBulkControls,
    });

  const stageCounts = summary.stageCounts;
  const totalPages = Math.max(1, pagination.pages);
  // NOTE: server-side pagination already ran; this is just the inventory-enriched
  // version of the current page's orders — not a client-side slice.
  const enrichedOrders = preparationOrders;
  const visibleOrdersCount = summary.filteredTotal;
  const currentPageCount = enrichedOrders.length;
  const allOverdueShortageFollowUpCount =
    summary.allOverdueShortageFollowUpCount;
  const allOverdueProblemFollowUpCount =
    summary.allOverdueProblemFollowUpCount;

  useEffect(() => {
    uiActions.clampPage(totalPages);
  }, [totalPages, uiActions]);

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

  const { printingOrderNumber, handlePrintPreparationSlip } = usePreparationSlipPrint({
    orders,
    user,
    invoiceSettings,
    t,
  });

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

  const { transferingItemKey, handleQuickTransfer } = usePreparationQuickTransfer({
    selectedWarehouseId,
    inventorySummaryByProduct,
    fetchInventory,
    getApiErrorMessage,
    t,
  });

  const {
    activeCarriers,
    showDispatchModal,
    setShowDispatchModal,
    sendingToTurbo,
    handleOpenDispatchModal,
    handleDispatchToCarrier,
  } = usePreparationCarrierDispatch({
    selectedOrders,
    activeStage,
    getOrderByNumber,
    fetchAll,
    clearBulkControls: uiActions.clearBulkControls,
  });

  const { printingInvoices, handlePrintInvoices } = usePreparationInvoicePrinting({
    selectedOrders,
    navigate,
    user,
  });

  // handleMarkAsShortageHold, handleReleaseShortageHold, handleMarkAsShortageFailed provided by usePreparationShortageOperations
  // handleConfirmStatusChange provided by usePreparationSingleStatusOperations



  return (
    <div className="space-y-3">
      {isMerchantUser ? (
        <MerchantOperationsSummary
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
      ) : null}

      <PreparationAlertBanners
        preparationSettingsEnabled={Boolean(preparationSettings.enabled)}
        allOverdueShortageFollowUpCount={allOverdueShortageFollowUpCount}
        allOverdueProblemFollowUpCount={allOverdueProblemFollowUpCount}
      />

      <PreparationQueueFiltersContainer
        showFilters={showFilters}
        activeFilter={activeStage}
        statusCounts={statusCounts}
        stageCounts={summary.stageCounts}
        filterTabs={filterTabs}
        visibleOrdersCount={visibleOrdersCount}
        search={search}
        selectedWarehouseId={selectedWarehouseId}
        stockFilter={stockFilter}
        shortageReasonFilter={shortageReasonFilter}
        shortageOwnerFilter={shortageOwnerFilter}
        shortageOwnerOptions={shortageOwnerOptions}
        shortageFollowUpFilter={shortageFollowUpFilter}
        productFilter={productFilter}
        productColorFilter={uiState.productColorFilter}
        productSizeFilter={uiState.productSizeFilter}
        productIdFilter={uiState.productIdFilter}
        variantIdFilter={uiState.variantIdFilter}
        productSuggestions={productSuggestions}
        products={products}
        productsLoading={productsLoading}
        itemCountFilter={itemCountFilter}
        notPrintedFilter={notPrintedFilter}
        noShippingCodeFilter={noShippingCodeFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        warehouses={warehouses}
        visibleFilterSections={visibleFilterSections}
        onFilterChange={uiActions.setActiveStage}
        onSearchChange={uiActions.setSearch}
        onSelectedWarehouseChange={uiActions.setSelectedWarehouse}
        onStockFilterChange={uiActions.setStockFilter}
        onShortageReasonFilterChange={uiActions.setShortageReasonFilter}
        onShortageOwnerFilterChange={uiActions.setShortageOwnerFilter}
        onShortageFollowUpFilterChange={uiActions.setShortageFollowUpFilter}
        onProductFilterChange={uiActions.setProductFilter}
        onProductColorFilterChange={uiActions.setProductColorFilter}
        onProductSizeFilterChange={uiActions.setProductSizeFilter}
        onProductIdFilterChange={uiActions.setProductIdFilter}
        onVariantIdFilterChange={uiActions.setVariantIdFilter}
        onItemCountFilterChange={uiActions.setItemCountFilter}
        onNotPrintedFilterChange={uiActions.setNotPrintedFilter}
        onNoShippingCodeFilterChange={uiActions.setNoShippingCodeFilter}
        onSortChange={(sortBy, sortOrder) => uiActions.setSort({ sortBy, sortOrder })}
      />

      <PreparationQueueTableSection
        selectionBarProps={{
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
          preparationEnabled: preparationSettings.enabled,
          bulkStatusUpdateEnabled: preparationSettings.enableBulkStatusUpdate,
          sendingToTurbo,
          printingInvoices,
          onBulkStatusChange: uiActions.setBulkStatus,
          onApply: () => void handleBulkUpdate(),
          onApplyToAll: () => void handleBulkUpdateAll(),
          onClear: uiActions.clearBulkControls,
          onClearSelection: () => uiActions.clearBulkControls(),
          onSendToTurbo: () => void handleOpenDispatchModal(),
          onSendToShipping: () => void handleOpenDispatchModal(),
          onSendToInternalCourier: isInternalCourierActive ? () => setShowInternalCourierModal(true) : undefined,
          onPrintInvoices: () => void handlePrintInvoices(),
        }}
        ordersContainerProps={{
          loading,
          enrichedOrders,
          pagination,
          totalPages,
          currentPageCount,
          pageSize: uiState.pageSize,
          statusSelections,
          statusOptions,
          statusLabelMap,
          selectedSet,
          rowUpdatingId,
          shortageSavingOrderId,
          problemHoldSavingOrderId,
          selectedWarehouseId,
          enabledQcChecks,
          qcChecklistState,
          shortageHoldDrafts,
          problemHoldDrafts,
          transferingItemKey,
          printingOrderNumber,
          preparationSettings,
          visibleColumns,
          formatPrice,
          formatDate,
          toggleOrderSelection,
          handleQuickTransfer,
          handleShortageFieldChange,
          saveShortageHoldDetails,
          handleQcCheckToggle,
          onStatusSelectionChange: uiActions.setStatusSelection,
          handleRequestStatusChange,
          handleMarkAsShortageHold,
          handleReleaseShortageHold,
          handleMarkAsShortageFailed,
          handleHoldAsProblem,
          handleReleaseProblemHold,
          handleEditProblemReason,
          handlePrintPreparationSlip,
          onPageSizeChange: uiActions.setPageSize,
          onPreviousPage: uiActions.goToPreviousPage,
          onNextPage: () => uiActions.goToNextPage(totalPages),
        }}
      />

      <PreparationQueueDialogsContainer
        statusChangeDialog={statusChangeDialog}
        setStatusChangeDialog={setStatusChangeDialog}
        dialogOrder={dialogOrder}
        statusLabelMap={statusLabelMap}
        dialogHoldReason={dialogHoldReason}
        rowUpdatingId={rowUpdatingId}
        problemHoldSavingOrderId={problemHoldSavingOrderId}
        handleConfirmStatusChange={handleConfirmStatusChange}

        bulkHoldDialog={bulkHoldDialog}
        setBulkHoldDialog={setBulkHoldDialog}
        bulkUpdating={bulkUpdating}
        executeBulkUpdateSelected={executeBulkUpdateSelected}
        executeBulkUpdateAll={executeBulkUpdateAll}

        editReasonOrder={editReasonOrder}
        setEditReasonOrder={setEditReasonOrder}
        editReasonOrderOrder={editReasonOrderOrder}
        handleConfirmEditReason={handleConfirmEditReason}

        showDispatchModal={showDispatchModal}
        setShowDispatchModal={setShowDispatchModal}
        selectedOrdersCount={selectedOrders.length}
        activeCarriers={activeCarriers}
        handleDispatchToCarrier={handleDispatchToCarrier}
        sendingToTurbo={sendingToTurbo}

        showInternalCourierModal={showInternalCourierModal}
        setShowInternalCourierModal={setShowInternalCourierModal}
        internalCourierOrderIds={internalCourierOrderIds}
        onInternalCourierSuccess={handleInternalCourierSuccess}
      />
    </div>
  );
};

export default PreparationQueue;
