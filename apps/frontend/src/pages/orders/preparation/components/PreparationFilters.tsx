import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SHORTAGE_REASON_OPTIONS, SORT_OPTIONS } from "../constants";
import { getStatusDisplay } from "../../../../utils/statusRegistry";
import { normalizeStatusToStage } from "../helpers";
import type {
  PreparationFilterSection,
} from "../constants";
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

interface ProductOption {
  id: string;
  name: string;
  productVariants?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  variants?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface PreparationFiltersProps {
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

interface ProductSuggestion {
  displayName: string;
  color: string;
  size: string;
}

const selectClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-amber-400 focus:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:bg-gray-700 dark:focus:border-amber-500";

const PreparationFilters = ({
  activeFilter,
  statusCounts,
  stageCounts,
  filterTabs,
  visibleOrdersCount,
  search,
  selectedWarehouseId,
  stockFilter,
  shortageReasonFilter,
  shortageOwnerFilter,
  shortageOwnerOptions,
  shortageFollowUpFilter,
  productFilter,
  productColorFilter,
  productSizeFilter,
  productIdFilter,
  variantIdFilter,
  productSuggestions,
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
  onShortageOwnerFilterChange,
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
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = useState(search);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localProductFilter, setLocalProductFilter] = useState(productFilter);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);
  const productSuggestionsRef = useRef<HTMLSelectElement>(null);
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
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productSuggestionsRef.current && !productSuggestionsRef.current.contains(e.target as Node) && !productInputRef.current?.contains(e.target as Node)) {
        setShowProductSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedProduct = useMemo(() => {
    if (!productIdFilter) return null;
    return products.find((p) => p.id === productIdFilter) || null;
  }, [productIdFilter, products]);

  const selectedProductVariants = useMemo(() => {
    if (!selectedProduct) return [];
    const variants = selectedProduct.productVariants || selectedProduct.variants || [];
    return variants;
  }, [selectedProduct]);

  const { availableColors, availableSizes } = useMemo(() => {
    if (!productIdFilter || selectedProductVariants.length === 0) {
      return { availableColors: [] as string[], availableSizes: [] as string[] };
    }
    const colors = new Set<string>();
    const sizes = new Set<string>();
    selectedProductVariants.forEach((v) => {
      if (!v.name) return;
      const pipePattern = /([^:]+):\s*([^|]+)/g;
      let match: RegExpExecArray | null;
      const attrs: Record<string, string> = {};
      while ((match = pipePattern.exec(v.name)) !== null) {
        if (match[1] && match[2]) attrs[match[1].trim()] = match[2].trim();
      }
      if (attrs["اللون"] || attrs["المقاس"]) {
        if (attrs["اللون"]) colors.add(attrs["اللون"]);
        if (attrs["المقاس"]) sizes.add(attrs["المقاس"]);
        return;
      }
      const parts = v.name.split(/\s*[-–]\s*/);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        colors.add(parts[0].trim());
        sizes.add(parts[1].trim());
      } else if (parts.length === 1 && parts[0] && v.type) {
        if (v.type === "color") colors.add(parts[0].trim());
        else if (v.type === "size") sizes.add(parts[0].trim());
      }
    });
    return { availableColors: [...colors], availableSizes: [...sizes] };
  }, [productIdFilter, selectedProductVariants]);

  const filteredProductSuggestions: ProductSuggestion[] = [];

  const handleProductSuggestionSelect = (_suggestion: ProductSuggestion) => {
    // kept for backward compatibility
  };

  const hasAdvancedFilters =
    selectedWarehouseId !== "" ||
    stockFilter !== "all" ||
    shortageReasonFilter !== "all" ||
    shortageOwnerFilter !== "" ||
    shortageFollowUpFilter !== "all" ||
    itemCountFilter !== "all" ||
    notPrintedFilter !== "all" ||
    noShippingCodeFilter !== "all";

  const hasActiveFilters = activeFilter !== "ALL" || search !== "" || productFilter !== "" || productIdFilter !== "" || hasAdvancedFilters;

  const resetAll = () => {
    onFilterChange("ALL");
    onSearchChange("");
    onSelectedWarehouseChange("");
    onStockFilterChange("all");
    onShortageReasonFilterChange("all");
    onShortageOwnerFilterChange("");
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

  // Set of all status codes explicitly present as tabs
  const tabCodes = useMemo(
    () => new Set(filterTabs.map((t) => t.statusCode)),
    [filterTabs]
  );

  // Map each normalized stage to the primary tab representing it (e.g. 'WAITING' -> 'PENDING_PREPARATION')
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

  // Aggregate counts of statuses that do NOT have their own tab, grouped by their preparation stage
  // (e.g. 'CONFIRMED' orders that map to 'WAITING' stage and appear inside 'PENDING_PREPARATION' tab)
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
    <div className="sticky top-0 z-10 rounded-xl border border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
      {/* Top bar: Tabs & Search Controls */}
      <div className="flex flex-col gap-2 border-b border-slate-100 p-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        
        {/* Horizontal Scrollable Tabs */}
        {visibleFilterSections.includes("tabs") && (
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5 sm:pb-0 no-scrollbar">
            <button
              onClick={() => onFilterChange("ALL")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition active:scale-[0.98] ${
                activeFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{t("preparation.filters.allStages", { count: "" }).replace(/\(\s*\)/, "").trim()}</span>
              <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.2 text-[10px] font-mono font-semibold tabular-nums ${
                activeFilter === "ALL" ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900" : "bg-slate-200/80 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300"
              }`}>
                {visibleOrdersCount}
              </span>
            </button>

            {filterTabs.map((tab) => {
              const display = getStatusDisplay(tab.statusCode);
              const mappedStage = normalizeStatusToStage(tab.statusCode);
              const hasDirectCount = statusCounts[tab.statusCode] !== undefined;
              const isPrimary = mappedStage ? primaryTabByStage.get(mappedStage) === tab.statusCode : false;
              const unrepresentedCount = hasDirectCount && isPrimary && mappedStage
                ? (unrepresentedCountsByStage[mappedStage] || 0)
                : 0;
              const count = (hasDirectCount
                ? statusCounts[tab.statusCode]
                : mappedStage && stageCounts[mappedStage] !== undefined
                ? stageCounts[mappedStage]
                : 0) + unrepresentedCount;
              const isActive = activeFilter === tab.statusCode;

              return (
                <button
                  key={tab.statusCode}
                  onClick={() => onFilterChange(tab.statusCode)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition active:scale-[0.98] ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                  title={tab.name}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-400/60 dark:bg-zinc-500'}`} />
                  <span>{tab.name}</span>
                  <span
                    className={`inline-flex items-center justify-center rounded px-1.5 py-0.2 text-[10px] font-mono font-semibold tabular-nums ${
                      isActive
                        ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                        : count > 0
                        ? "bg-slate-200/90 text-slate-800 dark:bg-zinc-700 dark:text-zinc-200"
                        : "bg-slate-200/50 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search & Advanced Filters Trigger */}
        {visibleFilterSections.includes("search") && (
          <div className="flex shrink-0 items-center gap-1.5 pt-1 sm:pt-0">
            <div className="relative flex-1 sm:w-52">
              <MagnifyingGlassIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={t("preparation.filters.quickSearchPlaceholder")}
                className="h-8 w-full rounded-lg border border-slate-200/90 bg-slate-50/70 pl-2 pr-7 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200 dark:focus:border-zinc-400 font-sans"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition active:scale-[0.98] ${
                showAdvanced || hasAdvancedFilters
                  ? "border border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              <FunnelIcon className="h-3.5 w-3.5" />
              <span>{t("preparation.filters.advancedFilters")}</span>
              <ChevronDownIcon className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetAll}
                title={t("common.reset")}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-400 hover:text-slate-700 transition dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toggle filter buttons + Product filter */}
      {visibleFilterSections.includes("toggleButtons") && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 sm:px-3 sm:py-2 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-1.5 max-sm:w-full">
            <button
              onClick={() =>
                onNotPrintedFilterChange(notPrintedFilter === "not_printed" ? "all" : "not_printed")
              }
              className={`rounded-md px-2.5 py-1 text-xs font-mono font-medium transition max-sm:flex-1 border active:scale-[0.98] ${
                notPrintedFilter === "not_printed"
                  ? "border-slate-900 bg-slate-900 text-white shadow-xs dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                  : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {t("preparation.filters.notPrinted")}
            </button>
            <button
              onClick={() =>
                onNoShippingCodeFilterChange(noShippingCodeFilter === "no_shipping_code" ? "all" : "no_shipping_code")
              }
              className={`rounded-md px-2.5 py-1 text-xs font-mono font-medium transition max-sm:flex-1 border active:scale-[0.98] ${
                noShippingCodeFilter === "no_shipping_code"
                  ? "border-slate-900 bg-slate-900 text-white shadow-xs dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                  : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {t("preparation.filters.noShippingCode")}
            </button>
          </div>

          <div className="relative w-full sm:ms-auto sm:min-w-[180px] sm:max-w-[260px] max-sm:mt-1">
            <input
              ref={productInputRef}
              value={localProductFilter}
              onChange={(e) => {
                setLocalProductFilter(e.target.value);
                onProductFilterChange(e.target.value);
                if (e.target.value === "") {
                  onProductIdFilterChange("");
                  onProductColorFilterChange("");
                  onProductSizeFilterChange("");
                }
                setShowProductSuggestions(true);
              }}
              onFocus={() => setShowProductSuggestions(true)}
              placeholder={t("preparation.filters.productPlaceholder")}
              className="h-8 w-full rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 pr-7 text-xs text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:border-zinc-400"
            />
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            {showProductSuggestions && (
              <div
                ref={productSuggestionsRef}
                className="absolute right-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg text-xs dark:border-gray-600 dark:bg-gray-800"
              >
                {productsLoading && (
                  <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {t("common.loading")}
                  </div>
                )}
                {!productsLoading && products.length === 0 && (
                  <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {t("preparation.filters.noProductResults")}
                  </div>
                )}
                {!productsLoading && products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onProductFilterChange(p.name);
                      onProductIdFilterChange(p.id);
                      onProductColorFilterChange("");
                      onProductSizeFilterChange("");
                      setShowProductSuggestions(false);
                    }}
                    className="cursor-pointer px-3 py-1.5 text-xs text-gray-700 hover:bg-amber-50 dark:text-gray-300 dark:hover:bg-amber-900/20"
                  >
                    {p.name}
                  </div>
                ))}
              </div>
            )}

            {selectedProductVariants.length > 0 && (
              <div className="relative min-w-[140px]">
                <select
                  value={variantIdFilter}
                  onChange={(e) => onVariantIdFilterChange(e.target.value)}
                  className="h-8 w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-800 outline-none transition focus:border-amber-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-amber-500"
                >
                  <option value="">{t("preparation.filters.allVariants")}</option>
                  {selectedProductVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {productIdFilter && availableColors.length > 0 && (
            <div className="relative sm:min-w-[120px] max-sm:w-full">
              <select
                value={productColorFilter}
                onChange={(e) => onProductColorFilterChange(e.target.value)}
                className="h-8 w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-800 outline-none transition focus:border-amber-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-amber-500"
              >
                <option value="">{t("preparation.filters.productColorAll")}</option>
                {availableColors.map((color, idx) => (
                  <option key={idx} value={color}>{color}</option>
                ))}
              </select>
            </div>
          )}

          {productIdFilter && availableSizes.length > 0 && (
            <div className="relative sm:min-w-[120px] max-sm:w-full">
              <select
                value={productSizeFilter}
                onChange={(e) => onProductSizeFilterChange(e.target.value)}
                className="h-8 w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-800 outline-none transition focus:border-amber-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-amber-500"
              >
                <option value="">{t("preparation.filters.productSizeAll")}</option>
                {availableSizes.map((size, idx) => (
                  <option key={idx} value={size}>{size}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Advanced filters (collapsible) */}
      {showAdvanced && visibleFilterSections.includes("advanced") && (
        <div className="grid grid-cols-1 gap-3 border-t border-gray-50 p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 dark:border-gray-700">
          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">{t("preparation.filters.warehouse")}</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => onSelectedWarehouseChange(e.target.value)}
              className={selectClass}
            >
              <option value="">{t("preparation.filters.allWarehouses")}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">{t("preparation.filters.stockStatus")}</label>
            <select
              value={stockFilter}
              onChange={(e) => onStockFilterChange(e.target.value as StockFilter)}
              className={selectClass}
            >
              <option value="all">{t("preparation.filters.allStock")}</option>
              <option value="ready">{t("preparation.filters.ready")}</option>
              <option value="shortage">{t("preparation.filters.shortage")}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">{t("preparation.filters.sortBy")}</label>
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split("_") as [SortBy, SortOrder];
                onSortChange(newSortBy, newSortOrder);
              }}
              className={selectClass}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">{t("preparation.filters.itemsCount")}</label>
            <select
              value={itemCountFilter}
              onChange={(e) => onItemCountFilterChange(e.target.value as ItemCountFilter)}
              className={selectClass}
            >
              <option value="all">{t("preparation.filters.allItems")}</option>
              <option value="single">{t("preparation.filters.singleItem")}</option>
              <option value="multiple">{t("preparation.filters.multipleItems")}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">{t("preparation.filters.shortageReason")}</label>
            <select
              value={shortageReasonFilter}
              onChange={(e) => onShortageReasonFilterChange(e.target.value as ShortageReasonFilter)}
              className={selectClass}
            >
              <option value="all">{t("preparation.filters.allReasons")}</option>
              {SHORTAGE_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">{t("preparation.filters.followUpDate")}</label>
            <select
              value={shortageFollowUpFilter}
              onChange={(e) => onShortageFollowUpFilterChange(e.target.value as ShortageFollowUpFilter)}
              className={selectClass}
            >
              <option value="all">{t("preparation.filters.allDates")}</option>
              <option value="today">{t("preparation.filters.today")}</option>
              <option value="overdue">{t("preparation.filters.overdue")}</option>
              <option value="without_date">{t("preparation.filters.withoutDate")}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationFilters;
