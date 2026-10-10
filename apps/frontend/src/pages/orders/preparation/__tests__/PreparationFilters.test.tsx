jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PreparationFilters from "../components/PreparationFilters";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("PreparationFilters Component", () => {
  const defaultProps = {
    activeFilter: "PENDING_PREPARATION",
    statusCounts: {
      CONFIRMED: 5,
      PENDING_PREPARATION: 5,
    },
    stageCounts: {
      ALL: 10,
      CONFIRMED: 5,
      WAITING: 5,
      IN_PREP: 0,
      QC_CHECK: 0,
      READY: 0,
      PROBLEM: 0,
      SHORTAGE: 0,
    },
    filterTabs: [
      { statusCode: "ALL", name: "الكل" },
      { statusCode: "CONFIRMED", name: "مؤكد" },
      { statusCode: "PENDING_PREPARATION", name: "تجهيز معلق" },
    ],
    visibleOrdersCount: 10,
    search: "",
    selectedWarehouseId: "",
    stockFilter: "all" as const,
    shortageReasonFilter: "all" as const,
    shortageOwnerFilter: "",
    shortageOwnerOptions: [],
    shortageFollowUpFilter: "all" as const,
    productFilter: "",
    productColorFilter: "",
    productSizeFilter: "",
    productIdFilter: "",
    variantIdFilter: "",
    productSuggestions: [],
    products: [],
    productsLoading: false,
    itemCountFilter: "all" as const,
    notPrintedFilter: "all" as const,
    noShippingCodeFilter: "all" as const,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
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

  it("renders filter tabs and highlights active stage", () => {
    render(<PreparationFilters {...defaultProps} />);
    const activeTab = screen.getByRole("button", { name: /تجهيز معلق/i });
    expect(activeTab).toBeInTheDocument();
  });

  it("calls onFilterChange when a tab is clicked", () => {
    render(<PreparationFilters {...defaultProps} />);
    const confirmedTab = screen.getByRole("button", { name: /مؤكد/i });
    fireEvent.click(confirmedTab);
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith("CONFIRMED");
  });

  it("calls onProductFilterChange when product search changes", () => {
    render(<PreparationFilters {...defaultProps} />);
    const input = screen.getByPlaceholderText("preparation.filters.productPlaceholder");
    fireEvent.change(input, { target: { value: "قميص" } });
    expect(defaultProps.onProductFilterChange).toHaveBeenCalledWith("قميص");
  });
});
