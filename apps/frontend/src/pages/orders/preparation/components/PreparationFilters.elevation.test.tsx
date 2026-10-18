import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PreparationTabsBar } from "./PreparationTabsBar";
import { PreparationToggleBar } from "./PreparationToggleBar";
import { PreparationAdvancedGrid } from "./PreparationAdvancedGrid";

jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { language: "ar" },
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("Elevated Preparation Filter Components", () => {
  describe("PreparationTabsBar", () => {
    const tabsProps = {
      activeFilter: "ALL",
      statusCounts: { CONFIRMED: 5 },
      stageCounts: {} as any,
      filterTabs: [{ statusCode: "CONFIRMED", name: "مؤكد" }],
      visibleOrdersCount: 20,
      localSearch: "",
      setLocalSearch: jest.fn(),
      showAdvanced: false,
      setShowAdvanced: jest.fn(),
      hasAdvancedFilters: false,
      hasActiveFilters: false,
      resetAll: jest.fn(),
      tabCodes: new Set(["CONFIRMED"]),
      primaryTabByStage: new Map(),
      unrepresentedCountsByStage: {},
      visibleFilterSections: ["tabs", "search"],
      onFilterChange: jest.fn(),
    };

    it("renders tabs and triggers onFilterChange", () => {
      render(<PreparationTabsBar {...tabsProps} />);

      expect(screen.getByText("مؤكد")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();

      fireEvent.click(screen.getByText("مؤكد"));
      expect(tabsProps.onFilterChange).toHaveBeenCalledWith("CONFIRMED");
    });

    it("triggers advanced filters toggle button", () => {
      render(<PreparationTabsBar {...tabsProps} />);

      const advBtn = screen.getByText("preparation.filters.advancedFilters");
      fireEvent.click(advBtn);
      expect(tabsProps.setShowAdvanced).toHaveBeenCalled();
    });
  });

  describe("PreparationToggleBar", () => {
    const toggleProps = {
      notPrintedFilter: "all" as const,
      noShippingCodeFilter: "all" as const,
      productFilter: "",
      localProductFilter: "",
      setLocalProductFilter: jest.fn(),
      showProductSuggestions: false,
      setShowProductSuggestions: jest.fn(),
      products: [],
      productsLoading: false,
      productIdFilter: "",
      variantIdFilter: "",
      productColorFilter: "",
      productSizeFilter: "",
      selectedProductVariants: [],
      availableColors: [],
      availableSizes: [],
      visibleFilterSections: ["toggleButtons"],
      onNotPrintedFilterChange: jest.fn(),
      onNoShippingCodeFilterChange: jest.fn(),
      onProductFilterChange: jest.fn(),
      onProductIdFilterChange: jest.fn(),
      onVariantIdFilterChange: jest.fn(),
      onProductColorFilterChange: jest.fn(),
      onProductSizeFilterChange: jest.fn(),
    };

    it("renders toggle buttons for not printed and no shipping code", () => {
      render(<PreparationToggleBar {...toggleProps} />);

      const notPrintedBtn = screen.getByText("غير مطبوعة");
      const noCodeBtn = screen.getByText("بدون بوليصة");

      expect(notPrintedBtn).toBeInTheDocument();
      expect(noCodeBtn).toBeInTheDocument();

      fireEvent.click(notPrintedBtn);
      expect(toggleProps.onNotPrintedFilterChange).toHaveBeenCalledWith("not_printed");

      fireEvent.click(noCodeBtn);
      expect(toggleProps.onNoShippingCodeFilterChange).toHaveBeenCalledWith("no_shipping_code");
    });
  });

  describe("PreparationAdvancedGrid", () => {
    const gridProps = {
      showAdvanced: true,
      visibleFilterSections: ["advanced"],
      selectedWarehouseId: "",
      warehouses: [{ id: "wh-1", name: "المستودع الرئيسي" }],
      stockFilter: "all" as const,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
      itemCountFilter: "all" as const,
      shortageReasonFilter: "all" as const,
      shortageFollowUpFilter: "all" as const,
      onSelectedWarehouseChange: jest.fn(),
      onStockFilterChange: jest.fn(),
      onSortChange: jest.fn(),
      onItemCountFilterChange: jest.fn(),
      onShortageReasonFilterChange: jest.fn(),
      onShortageFollowUpFilterChange: jest.fn(),
    };

    it("renders advanced select dropdowns with warehouse options", () => {
      render(<PreparationAdvancedGrid {...gridProps} />);

      expect(screen.getByText("المستودع")).toBeInTheDocument();
      expect(screen.getByText("المستودع الرئيسي")).toBeInTheDocument();
      expect(screen.getByText("حالة المخزون")).toBeInTheDocument();
      expect(screen.getByText("عدد العناصر")).toBeInTheDocument();
    });

    it("calls onSelectedWarehouseChange when warehouse is selected", () => {
      render(<PreparationAdvancedGrid {...gridProps} />);

      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value: "wh-1" } });
      expect(gridProps.onSelectedWarehouseChange).toHaveBeenCalledWith("wh-1");
    });
  });
});
