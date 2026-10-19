import { renderHook, act } from "@testing-library/react";
import { useOrdersTableSectionProps } from "./useOrdersTableSectionProps";

describe("useOrdersTableSectionProps", () => {
  const defaultParams = {
    canSelectOrders: true,
    selectedOrders: ["ORD-1"],
    bulkUpdatableStatuses: [{ code: "PROCESSING", name: "Processing" }],
    isTrashView: false,
    bulkProcessing: false,
    printingInvoices: false,
    setSelectedOrders: jest.fn(),
    handleBulkStatusUpdate: jest.fn(),
    handleBulkPrintInvoices: jest.fn(),
    handleBulkDelete: jest.fn(),
    hasActiveTurbo: true,
    hasActiveQpExpress: true,
    hasActiveBosta: true,
    handleBulkCreateTurboShipments: jest.fn(),
    handleBulkCreateQpExpressShipments: jest.fn(),
    handleBulkCreateBostaShipments: jest.fn(),

    displayedOrders: [{ orderNumber: "ORD-1" }] as any,
    loading: false,
    ordersLoadError: null,
    isMerchant: false,
    activeFilterCount: 0,
    search: "",

    columnsToRender: ["orderNumber"],
    tableColumnCount: 2,
    tableDensity: "comfortable" as const,

    page: 1,
    totalPages: 2,
    totalOrders: 10,
    limit: 5,

    mobileListHelpers: {} as any,
    tableHelpers: {} as any,

    handleOpenOrder: jest.fn(),
    toggleOrderSelection: jest.fn(),
    toggleAllSelection: jest.fn(),
    handleMarkAsViewed: jest.fn(),
    clearAllFilters: jest.fn(),
    handleCustomerRatingChange: jest.fn(),
    handlePageChange: jest.fn(),
    handleLimitChange: jest.fn(),
    changeTableDensity: jest.fn(),
  };

  it("builds table section props and triggers handlers correctly", () => {
    const { result } = renderHook(() =>
      useOrdersTableSectionProps(defaultParams as any),
    );

    expect(result.current.canSelectOrders).toBe(true);
    expect(result.current.selectedOrders).toEqual(["ORD-1"]);
    expect(result.current.displayedOrders).toHaveLength(1);

    act(() => {
      result.current.onClearSelection();
    });
    expect(defaultParams.setSelectedOrders).toHaveBeenCalledWith([]);

    act(() => {
      result.current.onBulkStatusUpdate("CONFIRMED");
    });
    expect(defaultParams.handleBulkStatusUpdate).toHaveBeenCalledWith(
      "CONFIRMED",
    );
  });

  it("delegates carrier actions, invoices, delete, and pagination correctly", () => {
    const { result } = renderHook(() =>
      useOrdersTableSectionProps(defaultParams as any),
    );

    act(() => {
      result.current.handleBulkCreateTurboShipments();
      result.current.handleBulkCreateQpExpressShipments();
      result.current.handleBulkCreateBostaShipments();
      result.current.onBulkPrintInvoices();
      result.current.onBulkDelete();
      result.current.handlePageChange(3);
      result.current.handleLimitChange(50);
      result.current.changeTableDensity("compact");
    });

    expect(defaultParams.handleBulkCreateTurboShipments).toHaveBeenCalled();
    expect(defaultParams.handleBulkCreateQpExpressShipments).toHaveBeenCalled();
    expect(defaultParams.handleBulkCreateBostaShipments).toHaveBeenCalled();
    expect(defaultParams.handleBulkPrintInvoices).toHaveBeenCalled();
    expect(defaultParams.handleBulkDelete).toHaveBeenCalled();
    expect(defaultParams.handlePageChange).toHaveBeenCalledWith(3);
    expect(defaultParams.handleLimitChange).toHaveBeenCalledWith(50);
    expect(defaultParams.changeTableDensity).toHaveBeenCalledWith("compact");
  });

  it("handles empty orders list and load error state gracefully", () => {
    const errorParams = {
      ...defaultParams,
      displayedOrders: [],
      loading: true,
      ordersLoadError: "Network connectivity failed",
      canSelectOrders: false,
    };

    const { result } = renderHook(() =>
      useOrdersTableSectionProps(errorParams as any),
    );

    expect(result.current.displayedOrders).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.ordersLoadError).toBe("Network connectivity failed");
    expect(result.current.canSelectOrders).toBe(false);
  });
});
