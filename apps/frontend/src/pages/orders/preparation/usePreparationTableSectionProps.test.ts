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
      result.current.selectionBarProps.onApplyToAll();
      result.current.selectionBarProps.onClear();
      result.current.selectionBarProps.onClearSelection();
      result.current.selectionBarProps.onSendToTurbo();
      result.current.selectionBarProps.onSendToShipping();
      result.current.selectionBarProps.onPrintInvoices();
    });

    expect(defaultParams.handleBulkUpdate).toHaveBeenCalled();
    expect(defaultParams.handleBulkUpdateAll).toHaveBeenCalled();
    expect(mockUiActions.clearBulkControls).toHaveBeenCalledTimes(2);
    expect(defaultParams.handleOpenDispatchModal).toHaveBeenCalledTimes(2);
    expect(defaultParams.handlePrintInvoices).toHaveBeenCalled();

    act(() => {
      result.current.selectionBarProps.onSendToInternalCourier?.();
    });
    expect(defaultParams.setShowInternalCourierModal).toHaveBeenCalledWith(true);
  });

  it("sets onSendToInternalCourier to undefined when internal courier is inactive", () => {
    const inactiveParams = {
      ...defaultParams,
      isInternalCourierActive: false,
    };

    const { result } = renderHook(() =>
      usePreparationTableSectionProps(inactiveParams as any),
    );

    expect(result.current.selectionBarProps.onSendToInternalCourier).toBeUndefined();
  });

  it("delegates orders container pagination and operations correctly", () => {
    const { result } = renderHook(() =>
      usePreparationTableSectionProps(defaultParams as any),
    );

    act(() => {
      result.current.ordersContainerProps.onPreviousPage();
      result.current.ordersContainerProps.onNextPage();
      result.current.ordersContainerProps.onPageSizeChange(50);
      result.current.ordersContainerProps.onStatusSelectionChange("ORD-1", "READY");
      result.current.ordersContainerProps.handleQuickTransfer({ id: "item-1" });
      result.current.ordersContainerProps.handleShortageFieldChange("ORD-1", "reason", "no_stock");
      result.current.ordersContainerProps.saveShortageHoldDetails("ORD-1");
      result.current.ordersContainerProps.handleQcCheckToggle("ORD-1", "packaging");
      result.current.ordersContainerProps.handleRequestStatusChange("ORD-1", "COMPLETED");
      result.current.ordersContainerProps.handleHoldAsProblem("ORD-1");
    });

    expect(mockUiActions.goToPreviousPage).toHaveBeenCalled();
    expect(mockUiActions.goToNextPage).toHaveBeenCalledWith(2);
    expect(mockUiActions.setPageSize).toHaveBeenCalledWith(50);
    expect(mockUiActions.setStatusSelection).toHaveBeenCalledWith("ORD-1", "READY");
    expect(defaultParams.handleQuickTransfer).toHaveBeenCalledWith({ id: "item-1" });
    expect(defaultParams.handleShortageFieldChange).toHaveBeenCalledWith("ORD-1", "reason", "no_stock");
    expect(defaultParams.saveShortageHoldDetails).toHaveBeenCalledWith("ORD-1");
    expect(defaultParams.handleQcCheckToggle).toHaveBeenCalledWith("ORD-1", "packaging");
    expect(defaultParams.handleRequestStatusChange).toHaveBeenCalledWith("ORD-1", "COMPLETED");
    expect(defaultParams.handleHoldAsProblem).toHaveBeenCalledWith("ORD-1");
  });
});
