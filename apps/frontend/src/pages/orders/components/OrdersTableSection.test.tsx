import React from "react";
import { render, screen } from "@testing-library/react";
import { OrdersTableSection } from "./OrdersTableSection";

jest.mock("./BulkActionBar", () => ({
  BulkActionBar: (props: any) => (
    <div data-testid="bulk-action-bar">Bulk count: {props.count}</div>
  ),
}));

jest.mock("./OrdersBulkCommandPalette", () => ({
  OrdersBulkCommandPalette: () => (
    <div data-testid="bulk-command-palette" />
  ),
}));

jest.mock("./OrdersMobileList", () => ({
  OrdersMobileList: (props: any) => (
    <div data-testid="orders-mobile-list">Orders: {props.orders?.length}</div>
  ),
}));

jest.mock("./OrdersTable", () => ({
  OrdersTable: (props: any) => (
    <div data-testid="orders-table">Table: {props.orders?.length}</div>
  ),
}));

jest.mock("./OrdersPagination", () => ({
  OrdersPagination: (props: any) => (
    <div data-testid="orders-pagination">Page: {props.page}</div>
  ),
}));

describe("OrdersTableSection", () => {
  const defaultProps = {
    canSelectOrders: true,
    selectedOrders: ["ORD-1"],
    bulkUpdatableStatuses: [{ code: "PROCESSING", name: "Processing" }],
    isTrashView: false,
    bulkProcessing: false,
    printingInvoices: false,
    onClearSelection: jest.fn(),
    onBulkStatusUpdate: jest.fn(),
    onBulkPrintInvoices: jest.fn(),
    onBulkDelete: jest.fn(),

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

    columnsToRender: ["orderNumber", "status"],
    tableColumnCount: 3,
    tableDensity: "comfortable" as const,

    page: 1,
    totalPages: 2,
    totalOrders: 10,
    limit: 5,

    mobileListHelpers: {} as any,
    tableHelpers: {} as any,

    onOpenOrder: jest.fn(),
    toggleOrderSelection: jest.fn(),
    toggleAllSelection: jest.fn(),
    onMarkAsViewed: jest.fn(),
    clearAllFilters: jest.fn(),
    handleCustomerRatingChange: jest.fn(),
    handlePageChange: jest.fn(),
    handleLimitChange: jest.fn(),
    changeTableDensity: jest.fn(),
  };

  it("renders bulk action bar when canSelectOrders is true", () => {
    render(<OrdersTableSection {...defaultProps} />);
    expect(screen.getByTestId("bulk-action-bar")).toHaveTextContent("Bulk count: 1");
    expect(screen.getByTestId("orders-mobile-list")).toBeInTheDocument();
    expect(screen.getByTestId("orders-table")).toBeInTheDocument();
    expect(screen.getByTestId("orders-pagination")).toBeInTheDocument();
  });

  it("hides bulk action bar when canSelectOrders is false", () => {
    render(<OrdersTableSection {...defaultProps} canSelectOrders={false} />);
    expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
  });
});
