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
    hasActiveTurbo: false,
    hasActiveQpExpress: false,
    hasActiveBosta: false,
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
});
