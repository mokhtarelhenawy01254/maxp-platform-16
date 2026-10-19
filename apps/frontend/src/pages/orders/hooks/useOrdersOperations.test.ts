import { renderHook } from "@testing-library/react";
import { useOrdersOperations } from "./useOrdersOperations";
import { DEFAULT_ORDERS_FILTERS } from "../ordersFilterTypes";

jest.mock("./useOrdersFilterActions", () => ({
  useOrdersFilterActions: jest.fn(() => ({
    displayedOrders: [],
    setQuickDate: jest.fn(),
    clearAdvancedFilters: jest.fn(),
    handleFilterChange: jest.fn(),
    applySavedFilters: jest.fn(),
    clearAllFilters: jest.fn(),
    handlePageChange: jest.fn(),
    handleLimitChange: jest.fn(),
    toggleOrderSelection: jest.fn(),
    toggleAllSelection: jest.fn(),
  })),
}));

jest.mock("./useOrdersBulkOperations", () => ({
  useOrdersBulkOperations: jest.fn(() => ({
    bulkProcessing: false,
    printingInvoices: false,
    selectedInvoice: null,
    setSelectedInvoice: jest.fn(),
    handleBulkStatusUpdate: jest.fn(),
    handleBulkDelete: jest.fn(),
    handleBulkPrintInvoices: jest.fn(),
    handleBulkCreateTurboShipments: jest.fn(),
    handleBulkCreateQpExpressShipments: jest.fn(),
    handleBulkCreateBostaShipments: jest.fn(),
  })),
}));

jest.mock("./useOrdersSingleMutations", () => ({
  useOrdersSingleMutations: jest.fn(() => ({
    handleUpdateStatus: jest.fn(),
    handleUpdatePaymentStatus: jest.fn(),
    handleMarkAsViewed: jest.fn(),
  })),
}));

describe("useOrdersOperations", () => {
  it("orchestrates filter actions, bulk operations, and single mutations cleanly", () => {
    const { result } = renderHook(() =>
      useOrdersOperations({
        orders: [],
        setOrders: jest.fn(),
        filters: DEFAULT_ORDERS_FILTERS,
        setFilters: jest.fn(),
        page: 1,
        setPage: jest.fn(),
        totalPages: 1,
        limit: 20,
        setLimit: jest.fn(),
        selectedOrders: [],
        setSelectedOrders: jest.fn(),
        setShowAdvancedFilters: jest.fn(),
        fetchOrders: jest.fn(),
        user: { role: "ADMIN" },
        navigate: jest.fn(),
        t: (k: string) => k,
        getStatusDisplay: jest.fn(),
        normalizeStatusCode: (s?: string | null) => (s || "").toUpperCase(),
        isCancellationStatus: () => false,
        getApiErrorMessage: (_: any, f: string) => f,
        selectedOrder: null,
        setSelectedOrder: jest.fn(),
      }),
    );

    expect(result.current.displayedOrders).toBeDefined();
    expect(result.current.bulkProcessing).toBe(false);
    expect(typeof result.current.handleUpdateStatus).toBe("function");
    expect(typeof result.current.handleBulkDelete).toBe("function");
  });
});
