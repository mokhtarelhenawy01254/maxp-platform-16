import { renderHook } from "@testing-library/react";
import { usePreparationDraftSync } from "./usePreparationDraftSync";
import type { PreparationOrder } from "./types";
import type { PreparationQueueUiActions } from "./usePreparationQueueUiState";

describe("usePreparationDraftSync", () => {
  const sampleOrders: PreparationOrder[] = [
    {
      id: "1",
      orderNumber: "ORD-1",
      status: "CONFIRMED",
      items: [],
      metadata: {
        shortageHoldDetails: { reason: "stock_shortage", owner: "Ali" },
        problemHoldDetails: { reason: "Customer unreachable" },
      },
    } as unknown as PreparationOrder,
  ];

  const mockUiActions: PreparationQueueUiActions = {
    applyDefaultWarehouse: jest.fn(),
    setActiveStage: jest.fn(),
    setSelectedWarehouse: jest.fn(),
    setStockFilter: jest.fn(),
    setShortageReasonFilter: jest.fn(),
    setShortageFollowUpFilter: jest.fn(),
    setShortageOwnerFilter: jest.fn(),
    setProductFilter: jest.fn(),
    setProductColorFilter: jest.fn(),
    setProductIdFilter: jest.fn(),
    setVariantIdFilter: jest.fn(),
    setItemCountFilter: jest.fn(),
    setSearch: jest.fn(),
    setSortBy: jest.fn(),
    setSortOrder: jest.fn(),
    setNotPrintedFilter: jest.fn(),
    setNoShippingCodeFilter: jest.fn(),
    setPage: jest.fn(),
    setPageSize: jest.fn(),
    resetPage: jest.fn(),
    clampPage: jest.fn(),
    toggleOrderSelection: jest.fn(),
    selectAllVisible: jest.fn(),
    clearVisibleSelection: jest.fn(),
    clearAllSelection: jest.fn(),
    setBulkStatus: jest.fn(),
    setBulkOrderType: jest.fn(),
    setBulkWorkflowStatus: jest.fn(),
    setSingleOrderStatusSelection: jest.fn(),
    clearBulkControls: jest.fn(),
    resetFilters: jest.fn(),
  };

  test("applies default warehouse ID when provided", () => {
    renderHook(() =>
      usePreparationDraftSync({
        orders: [],
        setShortageHoldDrafts: jest.fn(),
        setProblemHoldDrafts: jest.fn(),
        defaultWarehouseId: "warehouse-101",
        uiActions: mockUiActions,
        inventoryLength: 0,
        inventoryLoading: false,
        ensureInventory: jest.fn(),
      }),
    );

    expect(mockUiActions.applyDefaultWarehouse).toHaveBeenCalledWith("warehouse-101");
  });

  test("triggers ensureInventory when orders are present but inventory is empty", () => {
    const ensureInventory = jest.fn();

    renderHook(() =>
      usePreparationDraftSync({
        orders: sampleOrders,
        setShortageHoldDrafts: jest.fn(),
        setProblemHoldDrafts: jest.fn(),
        defaultWarehouseId: undefined,
        uiActions: mockUiActions,
        inventoryLength: 0,
        inventoryLoading: false,
        ensureInventory,
      }),
    );

    expect(ensureInventory).toHaveBeenCalled();
  });

  test("populates shortage and problem hold drafts for orders", () => {
    let shortageDrafts: Record<string, unknown> = {};
    let problemDrafts: Record<string, unknown> = {};

    const setShortageHoldDrafts = jest.fn((updater) => {
      shortageDrafts = typeof updater === "function" ? updater(shortageDrafts) : updater;
    });
    const setProblemHoldDrafts = jest.fn((updater) => {
      problemDrafts = typeof updater === "function" ? updater(problemDrafts) : updater;
    });

    renderHook(() =>
      usePreparationDraftSync({
        orders: sampleOrders,
        setShortageHoldDrafts,
        setProblemHoldDrafts,
        defaultWarehouseId: undefined,
        uiActions: mockUiActions,
        inventoryLength: 5,
        inventoryLoading: false,
        ensureInventory: jest.fn(),
      }),
    );

    expect(setShortageHoldDrafts).toHaveBeenCalled();
    expect(setProblemHoldDrafts).toHaveBeenCalled();
    expect(shortageDrafts["ORD-1"]).toBeDefined();
    expect(problemDrafts["ORD-1"]).toBeDefined();
  });
});
