import { useMemo } from "react";
import type { PreparationSelectionBarProps } from "./components/PreparationSelectionBar";
import type { PreparationOrdersContainerProps } from "./components/PreparationOrdersContainer";
import type {
  PreparationOrder,
  PreparationSettings,
  PreparationStatusOption,
  ProblemHoldDetails,
  QcCheckKey,
  ShortageHoldDetails,
} from "./types";
import type {
  PreparationQueueUiState,
  PreparationQueueUiActions,
} from "./usePreparationQueueUiState";
import type { PreparationTableColumn, PreparationFilterSection } from "./constants";

export interface UsePreparationTableSectionPropsParams {
  allVisibleSelected: boolean;
  toggleSelectAllVisible: () => void;
  totalVisibleOrders: number;
  inventoryLoading: boolean;
  loading: boolean;
  showFilters: boolean;
  setShowFilters: (val: boolean | ((prev: boolean) => boolean)) => void;
  columnSettingsOpen: boolean;
  setColumnSettingsOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  visibleColumns: PreparationTableColumn[];
  toggleColumn: (col: PreparationTableColumn) => void;
  visibleFilterSections: PreparationFilterSection[];
  toggleFilterSection: (sec: PreparationFilterSection) => void;
  selectedOrdersCount: number;
  bulkStatus: string;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Record<string, string>;
  bulkUpdating: boolean;
  preparationSettings: PreparationSettings;
  sendingToTurbo: boolean;
  printingInvoices: boolean;
  uiActions: PreparationQueueUiActions;
  handleBulkUpdate: () => void | Promise<void>;
  handleBulkUpdateAll: () => void | Promise<void>;
  handleOpenDispatchModal: () => void;
  isInternalCourierActive: boolean;
  setShowInternalCourierModal: (val: boolean) => void;
  handlePrintInvoices: () => void | Promise<void>;

  enrichedOrders: PreparationOrder[];
  pagination: { total: number; pages: number };
  totalPages: number;
  currentPageCount: number;
  uiState: PreparationQueueUiState;
  statusSelections: Record<string, string>;
  selectedSet: Set<string>;
  rowUpdatingId: string | null;
  shortageSavingOrderId: string | null;
  problemHoldSavingOrderId: string | null;
  selectedWarehouseId: string;
  enabledQcChecks: QcCheckKey[];
  qcChecklistState: Record<string, Partial<Record<QcCheckKey, boolean>>>;
  shortageHoldDrafts: Record<string, ShortageHoldDetails>;
  problemHoldDrafts: Record<string, ProblemHoldDetails>;
  transferingItemKey: string | null;
  printingOrderNumber: string | null;
  formatPrice: (amount: number | null | undefined, currency?: string) => string;
  formatDate: (date: Date | string | number) => string;
  toggleOrderSelection: (orderNumber: string) => void;
  handleQuickTransfer: (item: any) => Promise<void>;
  handleShortageFieldChange: (
    orderNumber: string,
    field: keyof ShortageHoldDetails,
    value: any,
  ) => void;
  saveShortageHoldDetails: (orderNumber: string) => Promise<void>;
  handleQcCheckToggle: (orderNumber: string, checkKey: QcCheckKey) => void;
  handleRequestStatusChange: (orderNumber: string, newStatus: string) => void;
  handleMarkAsShortageHold: (orderNumber: string) => Promise<void>;
  handleReleaseShortageHold: (orderNumber: string) => Promise<void>;
  handleMarkAsShortageFailed: (orderNumber: string) => Promise<void>;
  handleHoldAsProblem: (orderNumber: string) => void;
  handleReleaseProblemHold: (orderNumber: string) => Promise<void>;
  handleEditProblemReason: (orderNumber: string) => void;
  handlePrintPreparationSlip: (order: PreparationOrder) => Promise<void>;
}

export function usePreparationTableSectionProps(
  params: UsePreparationTableSectionPropsParams,
): {
  selectionBarProps: PreparationSelectionBarProps;
  ordersContainerProps: PreparationOrdersContainerProps;
} {
  const selectionBarProps: PreparationSelectionBarProps = useMemo(
    () => ({
      allVisibleSelected: params.allVisibleSelected,
      toggleSelectAllVisible: params.toggleSelectAllVisible,
      totalVisibleOrders: params.totalVisibleOrders,
      inventoryLoading: params.inventoryLoading,
      loading: params.loading,
      showFilters: params.showFilters,
      setShowFilters: params.setShowFilters,
      columnSettingsOpen: params.columnSettingsOpen,
      setColumnSettingsOpen: params.setColumnSettingsOpen,
      visibleColumns: params.visibleColumns,
      toggleColumn: params.toggleColumn,
      visibleFilterSections: params.visibleFilterSections,
      toggleFilterSection: params.toggleFilterSection,
      selectedOrdersCount: params.selectedOrdersCount,
      bulkStatus: params.bulkStatus,
      statusOptions: params.statusOptions,
      statusLabelMap: params.statusLabelMap,
      bulkUpdating: params.bulkUpdating,
      preparationEnabled: params.preparationSettings.enabled,
      bulkStatusUpdateEnabled: params.preparationSettings.enableBulkStatusUpdate,
      sendingToTurbo: params.sendingToTurbo,
      printingInvoices: params.printingInvoices,
      onBulkStatusChange: params.uiActions.setBulkStatus,
      onApply: () => void params.handleBulkUpdate(),
      onApplyToAll: () => void params.handleBulkUpdateAll(),
      onClear: params.uiActions.clearBulkControls,
      onClearSelection: () => params.uiActions.clearBulkControls(),
      onSendToTurbo: () => void params.handleOpenDispatchModal(),
      onSendToShipping: () => void params.handleOpenDispatchModal(),
      onSendToInternalCourier: params.isInternalCourierActive
        ? () => params.setShowInternalCourierModal(true)
        : undefined,
      onPrintInvoices: () => void params.handlePrintInvoices(),
    }),
    [
      params.allVisibleSelected,
      params.toggleSelectAllVisible,
      params.totalVisibleOrders,
      params.inventoryLoading,
      params.loading,
      params.showFilters,
      params.setShowFilters,
      params.columnSettingsOpen,
      params.setColumnSettingsOpen,
      params.visibleColumns,
      params.toggleColumn,
      params.visibleFilterSections,
      params.toggleFilterSection,
      params.selectedOrdersCount,
      params.bulkStatus,
      params.statusOptions,
      params.statusLabelMap,
      params.bulkUpdating,
      params.preparationSettings.enabled,
      params.preparationSettings.enableBulkStatusUpdate,
      params.sendingToTurbo,
      params.printingInvoices,
      params.uiActions,
      params.handleBulkUpdate,
      params.handleBulkUpdateAll,
      params.handleOpenDispatchModal,
      params.isInternalCourierActive,
      params.setShowInternalCourierModal,
      params.handlePrintInvoices,
    ],
  );

  const ordersContainerProps: PreparationOrdersContainerProps = useMemo(
    () => ({
      loading: params.loading,
      enrichedOrders: params.enrichedOrders,
      pagination: params.pagination,
      totalPages: params.totalPages,
      currentPageCount: params.currentPageCount,
      pageSize: params.uiState.pageSize,
      statusSelections: params.statusSelections,
      statusOptions: params.statusOptions,
      statusLabelMap: params.statusLabelMap,
      selectedSet: params.selectedSet,
      rowUpdatingId: params.rowUpdatingId,
      shortageSavingOrderId: params.shortageSavingOrderId,
      problemHoldSavingOrderId: params.problemHoldSavingOrderId,
      selectedWarehouseId: params.selectedWarehouseId,
      enabledQcChecks: params.enabledQcChecks,
      qcChecklistState: params.qcChecklistState,
      shortageHoldDrafts: params.shortageHoldDrafts,
      problemHoldDrafts: params.problemHoldDrafts,
      transferingItemKey: params.transferingItemKey,
      printingOrderNumber: params.printingOrderNumber,
      preparationSettings: params.preparationSettings,
      visibleColumns: params.visibleColumns,
      formatPrice: params.formatPrice,
      formatDate: params.formatDate,
      toggleOrderSelection: params.toggleOrderSelection,
      handleQuickTransfer: params.handleQuickTransfer,
      handleShortageFieldChange: params.handleShortageFieldChange,
      saveShortageHoldDetails: params.saveShortageHoldDetails,
      handleQcCheckToggle: params.handleQcCheckToggle,
      onStatusSelectionChange: params.uiActions.setStatusSelection,
      handleRequestStatusChange: params.handleRequestStatusChange,
      handleMarkAsShortageHold: params.handleMarkAsShortageHold,
      handleReleaseShortageHold: params.handleReleaseShortageHold,
      handleMarkAsShortageFailed: params.handleMarkAsShortageFailed,
      handleHoldAsProblem: params.handleHoldAsProblem,
      handleReleaseProblemHold: params.handleReleaseProblemHold,
      handleEditProblemReason: params.handleEditProblemReason,
      handlePrintPreparationSlip: params.handlePrintPreparationSlip,
      onPageSizeChange: params.uiActions.setPageSize,
      onPreviousPage: params.uiActions.goToPreviousPage,
      onNextPage: () => params.uiActions.goToNextPage(params.totalPages),
    }),
    [
      params.loading,
      params.enrichedOrders,
      params.pagination,
      params.totalPages,
      params.currentPageCount,
      params.uiState.pageSize,
      params.statusSelections,
      params.statusOptions,
      params.statusLabelMap,
      params.selectedSet,
      params.rowUpdatingId,
      params.shortageSavingOrderId,
      params.problemHoldSavingOrderId,
      params.selectedWarehouseId,
      params.enabledQcChecks,
      params.qcChecklistState,
      params.shortageHoldDrafts,
      params.problemHoldDrafts,
      params.transferingItemKey,
      params.printingOrderNumber,
      params.preparationSettings,
      params.visibleColumns,
      params.formatPrice,
      params.formatDate,
      params.toggleOrderSelection,
      params.handleQuickTransfer,
      params.handleShortageFieldChange,
      params.saveShortageHoldDetails,
      params.handleQcCheckToggle,
      params.uiActions,
      params.handleRequestStatusChange,
      params.handleMarkAsShortageHold,
      params.handleReleaseShortageHold,
      params.handleMarkAsShortageFailed,
      params.handleHoldAsProblem,
      params.handleReleaseProblemHold,
      params.handleEditProblemReason,
      params.handlePrintPreparationSlip,
    ],
  );

  return { selectionBarProps, ordersContainerProps };
}
