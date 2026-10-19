import type {
  FilterTab,
  PreparationOrder,
  PreparationQueueSettings,
  PreparationStatusOption,
  QcCheckKey,
  StageCounts,
} from "./types";
import type { PreparationQueueUiState, PreparationQueueUiActions } from "./usePreparationQueueUiState";
import type { usePreparationPreferences } from "./usePreparationPreferences";
import type { UsePreparationStatusOperationsReturn } from "./usePreparationStatusOperations";
import type { UsePreparationHoldOperationsReturn } from "./usePreparationHoldOperations";
import type { UsePreparationFulfillmentOperationsReturn } from "./usePreparationFulfillmentOperations";
import { usePreparationFilterSectionProps } from "./usePreparationFilterSectionProps";
import { usePreparationTableSectionProps } from "./usePreparationTableSectionProps";
import { usePreparationDialogOperations } from "./usePreparationDialogOperations";

export type UsePreparationPreferencesReturn = ReturnType<typeof usePreparationPreferences>;

export interface UsePreparationSectionsPropsParams {
  preparationSettings: PreparationQueueSettings;
  uiState: PreparationQueueUiState;
  uiActions: PreparationQueueUiActions;
  preferences: UsePreparationPreferencesReturn;
  formatPrice: (amount: number | null | undefined, currencyCode?: string) => string;
  formatDate: (date: any) => string;

  // Filter section
  allOverdueShortageFollowUpCount: number;
  allOverdueProblemFollowUpCount: number;
  statusCounts?: Record<string, number>;
  stageCounts: StageCounts;
  filterTabs: FilterTab[];
  visibleOrdersCount: number;
  warehouseOptions: any[];
  shortageOwnerOptions: string[];
  productSuggestions: string[];

  // Table section
  allVisibleSelected: boolean;
  toggleSelectAllVisible: () => void;
  inventoryLoading: boolean;
  loading: boolean;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Record<string, string>;
  isInternalCourierActive: boolean;
  setShowInternalCourierModal: (val: boolean) => void;
  showInternalCourierModal: boolean;
  enrichedOrders: PreparationOrder[];
  pagination: { total: number; pages: number };
  totalPages: number;
  currentPageCount: number;
  statusSelections: Record<string, string>;
  selectedSet: Set<string>;
  selectedWarehouseId: string;
  enabledQcChecks: QcCheckKey[];
  qcChecklistState: Record<string, Partial<Record<QcCheckKey, boolean>>>;
  toggleOrderSelection: (orderNumber: string) => void;
  handleQcCheckToggle: (orderNumber: string, key: QcCheckKey) => void;

  // Dialogs
  statusChangeDialog: any;
  setStatusChangeDialog: (dialog: any) => void;
  dialogOrder: PreparationOrder | null;
  dialogHoldReason: string;
  internalCourierOrderIds: string[];
  onInternalCourierSuccess: () => void;

  // Composite operations
  statusOps: UsePreparationStatusOperationsReturn;
  holdOps: UsePreparationHoldOperationsReturn;
  fulfillmentOps: UsePreparationFulfillmentOperationsReturn;
}

export function usePreparationSectionsProps({
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
  warehouseOptions,
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
  onInternalCourierSuccess,
  statusOps,
  holdOps,
  fulfillmentOps,
}: UsePreparationSectionsPropsParams) {
  const { alertBannersProps, filtersContainerProps } = usePreparationFilterSectionProps({
    preparationSettingsEnabled: Boolean(preparationSettings.enabled),
    allOverdueShortageFollowUpCount,
    allOverdueProblemFollowUpCount,
    showFilters: preferences.showFilters,
    uiState,
    uiActions,
    statusCounts,
    stageCounts,
    filterTabs,
    visibleOrdersCount,
    warehouseOptions,
    shortageOwnerOptions,
    productSuggestions,
  });

  const { selectionBarProps, ordersContainerProps } = usePreparationTableSectionProps({
    allVisibleSelected,
    toggleSelectAllVisible,
    totalVisibleOrders: pagination.total,
    inventoryLoading,
    loading,
    showFilters: preferences.showFilters,
    setShowFilters: preferences.setShowFilters,
    columnSettingsOpen: preferences.columnSettingsOpen,
    setColumnSettingsOpen: preferences.setColumnSettingsOpen,
    visibleColumns: preferences.visibleColumns,
    toggleColumn: preferences.toggleColumn,
    visibleFilterSections: preferences.visibleFilterSections,
    toggleFilterSection: preferences.toggleFilterSection,
    selectedOrdersCount: uiState.selectedOrders.length,
    bulkStatus: uiState.bulkStatus,
    statusOptions,
    statusLabelMap,
    preparationSettings,
    uiActions,
    isInternalCourierActive,
    setShowInternalCourierModal,
    enrichedOrders,
    pagination,
    totalPages,
    currentPageCount,
    uiState,
    statusSelections,
    selectedSet,
    selectedWarehouseId,
    enabledQcChecks,
    qcChecklistState,
    formatPrice,
    formatDate,
    toggleOrderSelection,
    handleQcCheckToggle,
    ...statusOps,
    ...holdOps,
    ...fulfillmentOps,
  });

  const dialogsProps = usePreparationDialogOperations({
    statusChangeDialog,
    setStatusChangeDialog,
    dialogOrder,
    statusLabelMap,
    dialogHoldReason,
    problemHoldSavingOrderId: holdOps.problemHoldSavingOrderId,
    editReasonOrder: holdOps.editReasonOrder,
    setEditReasonOrder: holdOps.setEditReasonOrder,
    editReasonOrderOrder: holdOps.editReasonOrderOrder,
    handleConfirmEditReason: holdOps.handleConfirmEditReason,
    showDispatchModal: fulfillmentOps.showDispatchModal,
    setShowDispatchModal: fulfillmentOps.setShowDispatchModal,
    selectedOrdersCount: uiState.selectedOrders.length,
    activeCarriers: fulfillmentOps.activeCarriers,
    handleDispatchToCarrier: fulfillmentOps.handleDispatchToCarrier,
    sendingToTurbo: fulfillmentOps.sendingToTurbo,
    showInternalCourierModal,
    setShowInternalCourierModal,
    internalCourierOrderIds,
    onInternalCourierSuccess,
    ...statusOps,
  });

  return {
    alertBannersProps,
    filtersContainerProps,
    selectionBarProps,
    ordersContainerProps,
    dialogsProps,
  };
}

export type UsePreparationSectionsPropsReturn = ReturnType<typeof usePreparationSectionsProps>;
