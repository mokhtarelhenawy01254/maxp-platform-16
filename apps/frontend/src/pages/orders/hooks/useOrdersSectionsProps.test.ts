import { renderHook } from "@testing-library/react";
import { useOrdersSectionsProps } from "./useOrdersSectionsProps";

// Mock the child hooks
jest.mock("./useOrdersToolbarSectionProps", () => ({
  useOrdersToolbarSectionProps: jest.fn(() => ({
    toolbarKey: "mock-toolbar",
  })),
}));

jest.mock("./useOrdersTableSectionProps", () => ({
  useOrdersTableSectionProps: jest.fn(() => ({
    tableKey: "mock-table",
  })),
}));

jest.mock("./useOrdersModalsContainerProps", () => ({
  useOrdersModalsContainerProps: jest.fn(() => ({
    modalsKey: "mock-modals",
  })),
}));

describe("useOrdersSectionsProps", () => {
  it("orchestrates toolbar, table, and modals props correctly", () => {
    const { result } = renderHook(() =>
      useOrdersSectionsProps({
        filters: {} as any,
        advancedFilterCount: 0,
        activeFilterCount: 0,
        ordersLoadError: null,
        showAdvancedFilters: false,
        setShowAdvancedFilters: jest.fn(),
        fieldClassName: "field-cls",
        merchantOptions: [],
        affiliateOptions: [],
        showOrderSourceFilter: false,
        showUnifiedOperationFilters: false,
        showMerchantOperationFilters: false,
        showAffiliateOperationFilter: false,
        hasCustomDateFilters: false,
        fetchOrders: jest.fn(),
        isAdmin: false,
        isMerchant: false,
        merchantSettlementSummary: null,
        merchantSettlementLoading: false,
        merchantSettlementError: null,
        formatPrice: jest.fn(),
        canSelectOrders: false,
        selectedOrders: [],
        isTrashView: false,
        setSelectedOrders: jest.fn(),
        hasActiveTurbo: false,
        hasActiveQpExpress: false,
        hasActiveBosta: false,
        loading: false,
        columnsToRender: [],
        tableColumnCount: 5,
        tableDensity: "comfortable" as any,
        page: 1,
        totalPages: 1,
        totalOrders: 0,
        limit: 25,
        changeTableDensity: jest.fn(),
        orderStatuses: [],
        orders: [],
        setOrders: jest.fn(),
        selectedOrder: null,
        setSelectedOrder: jest.fn(),
        showOrderModal: false,
        setShowOrderModal: jest.fn(),
        operations: {
          handleFilterChange: jest.fn(),
          applySavedFilters: jest.fn(),
          clearAdvancedFilters: jest.fn(),
          setQuickDate: jest.fn(),
          bulkProcessing: false,
          printingInvoices: false,
          handleBulkStatusUpdate: jest.fn(),
          handleBulkPrintInvoices: jest.fn(),
          handleBulkDelete: jest.fn(),
          handleBulkCreateTurboShipments: jest.fn(),
          handleBulkCreateQpExpressShipments: jest.fn(),
          handleBulkCreateBostaShipments: jest.fn(),
          displayedOrders: [],
          toggleOrderSelection: jest.fn(),
          toggleAllSelection: jest.fn(),
          handleMarkAsViewed: jest.fn(),
          clearAllFilters: jest.fn(),
          handlePageChange: jest.fn(),
          handleLimitChange: jest.fn(),
          selectedInvoice: null,
          setSelectedInvoice: jest.fn(),
        } as any,
        decorators: {
          filterableOrderStatuses: [],
          filterablePaymentStatuses: [],
          bulkUpdatableStatuses: [],
          getAffiliateDisplayName: jest.fn(),
          getFulfillmentSourceText: jest.fn(),
          mobileListHelpers: {} as any,
          tableHelpers: {} as any,
          handleOpenOrder: jest.fn(),
          handleCustomerRatingChange: jest.fn(),
        } as any,
      })
    );

    expect(result.current.toolbarSectionProps).toEqual({ toolbarKey: "mock-toolbar" });
    expect(result.current.tableSectionProps).toEqual({ tableKey: "mock-table" });
    expect(result.current.modalsContainerProps).toEqual({ modalsKey: "mock-modals" });
  });
});
