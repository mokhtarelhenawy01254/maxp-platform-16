import { renderHook, act } from "@testing-library/react";
import { usePreparationTableSectionProps } from "./usePreparationTableSectionProps";

describe("usePreparationTableSectionProps", () => {
  const mockUiActions = {
    setBulkStatus: jest.fn(),
    clearBulkControls: jest.fn(),
    setStatusSelection: jest.fn(),
    setPageSize: jest.fn(),
    goToPreviousPage: jest.fn(),
    goToNextPage: jest.fn(),
  };

  const defaultParams = {
    allVisibleSelected: false,
    toggleSelectAllVisible: jest.fn(),
    totalVisibleOrders: 10,
    inventoryLoading: false,
    loading: false,
    showFilters: true,
    setShowFilters: jest.fn(),
    columnSettingsOpen: false,
    setColumnSettingsOpen: jest.fn(),
    visibleColumns: ["orderNumber"] as any,
    toggleColumn: jest.fn(),
    visibleFilterSections: ["stages"] as any,
    toggleFilterSection: jest.fn(),
    selectedOrdersCount: 2,
    bulkStatus: "CONFIRMED",
    statusOptions: [{ value: "CONFIRMED", label: "Confirmed" }] as any,
    statusLabelMap: { CONFIRMED: "Confirmed" },
    bulkUpdating: false,
    preparationSettings: { enabled: true, enableBulkStatusUpdate: true } as any,
    sendingToTurbo: false,
    printingInvoices: false,
    uiActions: mockUiActions as any,
    handleBulkUpdate: jest.fn(),
    handleBulkUpdateAll: jest.fn(),
    handleOpenDispatchModal: jest.fn(),
    isInternalCourierActive: true,
    setShowInternalCourierModal: jest.fn(),
    handlePrintInvoices: jest.fn(),

    enrichedOrders: [{ orderNumber: "ORD-1" }] as any,
    pagination: { total: 10, pages: 2 },
    totalPages: 2,
    currentPageCount: 1,
    uiState: { pageSize: 10 } as any,
    statusSelections: {},
    selectedSet: new Set(["ORD-1"]),
    rowUpdatingId: null,
    shortageSavingOrderId: null,
    problemHoldSavingOrderId: null,
    selectedWarehouseId: "wh-1",
    enabledQcChecks: [],
    qcChecklistState: {},
    shortageHoldDrafts: {},
    problemHoldDrafts: {},
    transferingItemKey: null,
    printingOrderNumber: null,
    formatPrice: jest.fn((p) => String(p)),
    formatDate: jest.fn((d) => String(d)),
    toggleOrderSelection: jest.fn(),
    handleQuickTransfer: jest.fn(),
    handleShortageFieldChange: jest.fn(),
    saveShortageHoldDetails: jest.fn(),
    handleQcCheckToggle: jest.fn(),
    handleRequestStatusChange: jest.fn(),
    handleMarkAsShortageHold: jest.fn(),
    handleReleaseShortageHold: jest.fn(),
    handleMarkAsShortageFailed: jest.fn(),
    handleHoldAsProblem: jest.fn(),
    handleReleaseProblemHold: jest.fn(),
    handleEditProblemReason: jest.fn(),
    handlePrintPreparationSlip: jest.fn(),
  };

  it("builds selectionBarProps and ordersContainerProps correctly", () => {
    const { result } = renderHook(() =>
      usePreparationTableSectionProps(defaultParams as any),
    );

    expect(result.current.selectionBarProps).toBeDefined();
    expect(result.current.selectionBarProps.selectedOrdersCount).toBe(2);
    expect(result.current.selectionBarProps.preparationEnabled).toBe(true);

    expect(result.current.ordersContainerProps).toBeDefined();
    expect(result.current.ordersContainerProps.enrichedOrders).toHaveLength(1);
    expect(result.current.ordersContainerProps.totalPages).toBe(2);
  });

  it("invokes bulk action handlers correctly from selectionBarProps", () => {
    const { result } = renderHook(() =>
      usePreparationTableSectionProps(defaultParams as any),
    );

    act(() => {
      result.current.selectionBarProps.onApply();
    });
    expect(defaultParams.handleBulkUpdate).toHaveBeenCalled();

    act(() => {
      result.current.selectionBarProps.onSendToInternalCourier?.();
    });
    expect(defaultParams.setShowInternalCourierModal).toHaveBeenCalledWith(true);
  });
});
