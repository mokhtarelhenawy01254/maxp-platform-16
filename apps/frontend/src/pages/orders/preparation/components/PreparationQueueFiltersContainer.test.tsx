import React from "react";
import { render, screen } from "@testing-library/react";
import { PreparationQueueFiltersContainer } from "./PreparationQueueFiltersContainer";

let lastFiltersProps: any = null;

// Mock child component to isolate container behavior and capture props
jest.mock("./PreparationFilters", () => ({
  __esModule: true,
  default: (props: any) => {
    lastFiltersProps = props;
    return <div data-testid="mock-preparation-filters">Mock Filters</div>;
  },
}));

describe("PreparationQueueFiltersContainer", () => {
  beforeEach(() => {
    lastFiltersProps = null;
  });

  const directProps: any = {
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
      <PreparationQueueFiltersContainer {...directProps} showFilters={false} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("mock-preparation-filters")).not.toBeInTheDocument();
  });

  it("renders PreparationFilters when showFilters is true (direct props mode)", () => {
    render(
      <PreparationQueueFiltersContainer {...directProps} showFilters={true} />,
    );
    expect(screen.getByTestId("mock-preparation-filters")).toBeInTheDocument();
    expect(lastFiltersProps.activeFilter).toBe("ALL");
  });

  it("handles container mode (uiState and uiActions) and maps handlers correctly", () => {
    const mockActions = {
      setActiveStage: jest.fn(),
      setSearch: jest.fn(),
      setSelectedWarehouse: jest.fn(),
      setStockFilter: jest.fn(),
      setShortageReasonFilter: jest.fn(),
      setShortageOwnerFilter: jest.fn(),
      setShortageFollowUpFilter: jest.fn(),
      setProductFilter: jest.fn(),
      setProductColorFilter: jest.fn(),
      setProductSizeFilter: jest.fn(),
      setProductIdFilter: jest.fn(),
      setVariantIdFilter: jest.fn(),
      setItemCountFilter: jest.fn(),
      setNotPrintedFilter: jest.fn(),
      setNoShippingCodeFilter: jest.fn(),
      setSort: jest.fn(),
    };

    const mockState: any = {
      activeStage: "PRINTED",
      search: "search-val",
      selectedWarehouseId: "wh-99",
      stockFilter: "IN_STOCK",
      shortageReasonFilter: "ALL",
      shortageOwnerFilter: "owner-1",
      shortageFollowUpFilter: "ALL",
      productFilter: "prod-1",
      productColorFilter: "red",
      productSizeFilter: "XL",
      productIdFilter: "pid-1",
      variantIdFilter: "vid-1",
      itemCountFilter: "1",
      notPrintedFilter: "NO",
      noShippingCodeFilter: "YES",
      sortBy: "status",
      sortOrder: "asc",
    };

    render(
      <PreparationQueueFiltersContainer
        showFilters={true}
        uiState={mockState}
        uiActions={mockActions as any}
        statusCounts={{ PRINTED: 10 }}
        stageCounts={{ ready: 5 } as any}
        filterTabs={[{ statusCode: "PRINTED", name: "Printed" }]}
        visibleOrdersCount={15}
        warehouseOptions={[{ id: "wh-99", name: "Main WH" }] as any}
        shortageOwnerOptions={["owner-1"]}
        productSuggestions={[]}
      />,
    );

    expect(screen.getByTestId("mock-preparation-filters")).toBeInTheDocument();
    expect(lastFiltersProps.activeFilter).toBe("PRINTED");
    expect(lastFiltersProps.search).toBe("search-val");
    expect(lastFiltersProps.selectedWarehouseId).toBe("wh-99");
    expect(lastFiltersProps.stockFilter).toBe("IN_STOCK");

    // Test callback delegation
    lastFiltersProps.onFilterChange("READY");
    expect(mockActions.setActiveStage).toHaveBeenCalledWith("READY");

    lastFiltersProps.onSearchChange("new-search");
    expect(mockActions.setSearch).toHaveBeenCalledWith("new-search");

    lastFiltersProps.onSelectedWarehouseChange("wh-2");
    expect(mockActions.setSelectedWarehouse).toHaveBeenCalledWith("wh-2");

    lastFiltersProps.onSortChange("date", "desc");
    expect(mockActions.setSort).toHaveBeenCalledWith({ sortBy: "date", sortOrder: "desc" });
  });
});
