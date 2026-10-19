import React from "react";
import { render, screen } from "@testing-library/react";
import { PreparationQueueFiltersContainer } from "./PreparationQueueFiltersContainer";

// Mock child component to isolate container behavior
jest.mock("./PreparationFilters", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-preparation-filters">Mock Filters</div>,
}));

describe("PreparationQueueFiltersContainer", () => {
  const defaultProps: any = {
    activeFilter: "ALL",
    statusCounts: {},
    stageCounts: {},
    filterTabs: [],
    visibleOrdersCount: 0,
    search: "",
    selectedWarehouseId: "",
    stockFilter: "ALL",
    shortageReasonFilter: "ALL",
    shortageOwnerFilter: "",
    shortageOwnerOptions: [],
    shortageFollowUpFilter: "ALL",
    productFilter: "",
    productColorFilter: "",
    productSizeFilter: "",
    productIdFilter: "",
    variantIdFilter: "",
    productSuggestions: [],
    products: [],
    productsLoading: false,
    itemCountFilter: "ALL",
    notPrintedFilter: "ALL",
    noShippingCodeFilter: "ALL",
    sortBy: "date",
    sortOrder: "desc",
    warehouses: [],
    onFilterChange: jest.fn(),
    onSearchChange: jest.fn(),
    onSelectedWarehouseChange: jest.fn(),
    onStockFilterChange: jest.fn(),
    onShortageReasonFilterChange: jest.fn(),
    onShortageOwnerFilterChange: jest.fn(),
    onShortageFollowUpFilterChange: jest.fn(),
    onProductFilterChange: jest.fn(),
    onProductColorFilterChange: jest.fn(),
    onProductSizeFilterChange: jest.fn(),
    onProductIdFilterChange: jest.fn(),
    onVariantIdFilterChange: jest.fn(),
    onItemCountFilterChange: jest.fn(),
    onNotPrintedFilterChange: jest.fn(),
    onNoShippingCodeFilterChange: jest.fn(),
    onSortChange: jest.fn(),
  };

  it("renders nothing when showFilters is false", () => {
    const { container } = render(
      <PreparationQueueFiltersContainer {...defaultProps} showFilters={false} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("mock-preparation-filters")).not.toBeInTheDocument();
  });

  it("renders PreparationFilters when showFilters is true", () => {
    render(
      <PreparationQueueFiltersContainer {...defaultProps} showFilters={true} />,
    );
    expect(screen.getByTestId("mock-preparation-filters")).toBeInTheDocument();
  });
});
