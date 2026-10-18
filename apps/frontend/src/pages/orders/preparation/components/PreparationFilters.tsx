import { useEffect, useRef, useState, useMemo } from "react";
import { PreparationTabsBar } from "./PreparationTabsBar";
import { PreparationToggleBar } from "./PreparationToggleBar";
import { PreparationAdvancedGrid } from "./PreparationAdvancedGrid";
import { useProductFilterOptions, type ProductOption } from "./useProductFilterOptions";
import { normalizeStatusToStage } from "../helpers";
import type { PreparationFilterSection } from "../constants";
import type {
  ItemCountFilter,
  NoShippingCodeFilter,
  NotPrintedFilter,
  ShortageFollowUpFilter,
  ShortageReasonFilter,
  SortBy,
  SortOrder,
  StageCounts,
  StockFilter,
  WarehouseOption,
} from "../types";

export interface PreparationFiltersProps {
  activeFilter: string;
  statusCounts: Record<string, number>;
  stageCounts: StageCounts;
  filterTabs: { statusCode: string; name: string }[];
  visibleOrdersCount: number;
  search: string;
  selectedWarehouseId: string;
  stockFilter: StockFilter;
  shortageReasonFilter: ShortageReasonFilter;
  shortageOwnerFilter: string;
  shortageOwnerOptions: string[];
  shortageFollowUpFilter: ShortageFollowUpFilter;
  productFilter: string;
  productColorFilter: string;
  productSizeFilter: string;
  productIdFilter: string;
  variantIdFilter: string;
  productSuggestions: ProductSuggestion[];
  products: ProductOption[];
  productsLoading: boolean;
  itemCountFilter: ItemCountFilter;
  notPrintedFilter: NotPrintedFilter;
  noShippingCodeFilter: NoShippingCodeFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
  warehouses: WarehouseOption[];
  visibleFilterSections?: PreparationFilterSection[];
  onFilterChange: (filter: string) => void;
  onSearchChange: (value: string) => void;
  onSelectedWarehouseChange: (value: string) => void;
  onStockFilterChange: (value: StockFilter) => void;
  onShortageReasonFilterChange: (value: ShortageReasonFilter) => void;
  onShortageOwnerFilterChange: (value: string) => void;
  onShortageFollowUpFilterChange: (value: ShortageFollowUpFilter) => void;
  onProductFilterChange: (value: string) => void;
  onProductColorFilterChange: (value: string) => void;
  onProductSizeFilterChange: (value: string) => void;
  onProductIdFilterChange: (value: string) => void;
  onVariantIdFilterChange: (value: string) => void;
  onItemCountFilterChange: (value: ItemCountFilter) => void;
  onNotPrintedFilterChange: (value: NotPrintedFilter) => void;
  onNoShippingCodeFilterChange: (value: NoShippingCodeFilter) => void;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}

export interface ProductSuggestion {
  displayName: string;
  color: string;
  size: string;
}

export const PreparationFilters = ({
  activeFilter,
  statusCounts,
  stageCounts,
  filterTabs,
  visibleOrdersCount,
  search,
  selectedWarehouseId,
  stockFilter,
  shortageReasonFilter,
  shortageOwnerFilter: _shortageOwnerFilter,
  shortageOwnerOptions: _shortageOwnerOptions,
  shortageFollowUpFilter,
  productFilter,
  productColorFilter,
  productSizeFilter,
  productIdFilter,
  variantIdFilter,
  productSuggestions: _productSuggestions,
  products,
  productsLoading,
  itemCountFilter,
  notPrintedFilter,
  noShippingCodeFilter,
  sortBy,
  sortOrder,
  warehouses,
  visibleFilterSections = ["tabs", "search", "toggleButtons", "advanced"],
  onFilterChange,
  onSearchChange,
  onSelectedWarehouseChange,
  onStockFilterChange,
  onShortageReasonFilterChange,
  onShortageOwnerFilterChange: _onShortageOwnerFilterChange,
  onShortageFollowUpFilterChange,
  onProductFilterChange,
  onProductColorFilterChange,
  onProductSizeFilterChange,
  onProductIdFilterChange,
  onVariantIdFilterChange,
  onItemCountFilterChange,
  onNotPrintedFilterChange,
  onNoShippingCodeFilterChange,
  onSortChange,
}: PreparationFiltersProps) => {
  const [localSearch, setLocalSearch] = useState(search);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localProductFilter, setLocalProductFilter] = useState(productFilter);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const { selectedProductVariants, availableColors, availableSizes } = useProductFilterOptions(
    productIdFilter,
    products
  );

  const hasAdvancedFilters =
    selectedWarehouseId !== "" ||
    stockFilter !== "all" ||
    shortageReasonFilter !== "all" ||
    shortageFollowUpFilter !== "all" ||
    itemCountFilter !== "all" ||
    notPrintedFilter !== "all" ||
    noShippingCodeFilter !== "all";

  const hasActiveFilters =
    activeFilter !== "ALL" ||
    search !== "" ||
    productFilter !== "" ||
    productIdFilter !== "" ||
    hasAdvancedFilters;

  const resetAll = () => {
    onFilterChange("ALL");
    onSearchChange("");
    onSelectedWarehouseChange("");
    onStockFilterChange("all");
    onShortageReasonFilterChange("all");
    onShortageFollowUpFilterChange("all");
    onProductFilterChange("");
    onProductColorFilterChange("");
    onProductSizeFilterChange("");
    onProductIdFilterChange("");
    onVariantIdFilterChange("");
    onItemCountFilterChange("all");
    onNotPrintedFilterChange("all");
    onNoShippingCodeFilterChange("all");
    onSortChange("createdAt", "desc");
    setLocalSearch("");
  };

  const tabCodes = useMemo(() => new Set(filterTabs.map((t) => t.statusCode)), [filterTabs]);

  const primaryTabByStage = useMemo(() => {
    const map = new Map<string, string>();
    filterTabs.forEach((tab) => {
      const stage = normalizeStatusToStage(tab.statusCode);
      if (stage && !map.has(stage)) {
        map.set(stage, tab.statusCode);
      }
    });
    return map;
  }, [filterTabs]);

  const unrepresentedCountsByStage = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(statusCounts || {}).forEach(([statusCode, count]) => {
      if (!tabCodes.has(statusCode)) {
        const stage = normalizeStatusToStage(statusCode);
        if (stage) {
          counts[stage] = (counts[stage] || 0) + Number(count || 0);
        }
      }
    });
    return counts;
  }, [statusCounts, tabCodes]);

  return (
    <div className="sticky top-0 z-10 rounded-2xl border border-border/70 bg-card/95 shadow-xs backdrop-blur-md">
      {/* Stage Tabs & Search Bar */}
      <PreparationTabsBar
        activeFilter={activeFilter}
        statusCounts={statusCounts}
        stageCounts={stageCounts}
        filterTabs={filterTabs}
        visibleOrdersCount={visibleOrdersCount}
        localSearch={localSearch}
        setLocalSearch={setLocalSearch}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        hasAdvancedFilters={hasAdvancedFilters}
        hasActiveFilters={hasActiveFilters}
        resetAll={resetAll}
        tabCodes={tabCodes}
        primaryTabByStage={primaryTabByStage}
        unrepresentedCountsByStage={unrepresentedCountsByStage}
        visibleFilterSections={visibleFilterSections}
        onFilterChange={onFilterChange}
      />

      {/* Quick Toggles & Product Search */}
      <PreparationToggleBar
        notPrintedFilter={notPrintedFilter}
        noShippingCodeFilter={noShippingCodeFilter}
        productFilter={productFilter}
        localProductFilter={localProductFilter}
        setLocalProductFilter={setLocalProductFilter}
        showProductSuggestions={showProductSuggestions}
        setShowProductSuggestions={setShowProductSuggestions}
        products={products}
        productsLoading={productsLoading}
        productIdFilter={productIdFilter}
        variantIdFilter={variantIdFilter}
        productColorFilter={productColorFilter}
        productSizeFilter={productSizeFilter}
        selectedProductVariants={selectedProductVariants}
        availableColors={availableColors}
        availableSizes={availableSizes}
        visibleFilterSections={visibleFilterSections}
        onNotPrintedFilterChange={onNotPrintedFilterChange}
        onNoShippingCodeFilterChange={onNoShippingCodeFilterChange}
        onProductFilterChange={onProductFilterChange}
        onProductIdFilterChange={onProductIdFilterChange}
        onVariantIdFilterChange={onVariantIdFilterChange}
        onProductColorFilterChange={onProductColorFilterChange}
        onProductSizeFilterChange={onProductSizeFilterChange}
      />

      {/* Collapsible Advanced Filters */}
      <PreparationAdvancedGrid
        showAdvanced={showAdvanced}
        visibleFilterSections={visibleFilterSections}
        selectedWarehouseId={selectedWarehouseId}
        warehouses={warehouses}
        stockFilter={stockFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        itemCountFilter={itemCountFilter}
        shortageReasonFilter={shortageReasonFilter}
        shortageFollowUpFilter={shortageFollowUpFilter}
        onSelectedWarehouseChange={onSelectedWarehouseChange}
        onStockFilterChange={onStockFilterChange}
        onSortChange={onSortChange}
        onItemCountFilterChange={onItemCountFilterChange}
        onShortageReasonFilterChange={onShortageReasonFilterChange}
        onShortageFollowUpFilterChange={onShortageFollowUpFilterChange}
      />
    </div>
  );
};

export default PreparationFilters;
