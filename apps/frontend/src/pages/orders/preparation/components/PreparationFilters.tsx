import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SHORTAGE_REASON_OPTIONS, SORT_OPTIONS } from "../constants";
import { getStatusDisplay } from "../../../../utils/statusRegistry";
import type {
  ItemCountFilter,
  NoShippingCodeFilter,
  NotPrintedFilter,
  ShortageFollowUpFilter,
  ShortageReasonFilter,
  SortBy,
  SortOrder,
  StockFilter,
  WarehouseOption,
} from "../types";

interface PreparationFiltersProps {
  activeFilter: string;
  statusCounts: Record<string, number>;
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
  itemCountFilter: ItemCountFilter;
  notPrintedFilter: NotPrintedFilter;
  noShippingCodeFilter: NoShippingCodeFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
  warehouses: WarehouseOption[];
  onFilterChange: (filter: string) => void;
  onSearchChange: (value: string) => void;
  onSelectedWarehouseChange: (value: string) => void;
  onStockFilterChange: (value: StockFilter) => void;
  onShortageReasonFilterChange: (value: ShortageReasonFilter) => void;
  onShortageOwnerFilterChange: (value: string) => void;
  onShortageFollowUpFilterChange: (value: ShortageFollowUpFilter) => void;
  onProductFilterChange: (value: string) => void;
  onItemCountFilterChange: (value: ItemCountFilter) => void;
  onNotPrintedFilterChange: (value: NotPrintedFilter) => void;
  onNoShippingCodeFilterChange: (value: NoShippingCodeFilter) => void;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}

const selectClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-amber-400 focus:bg-white";

const PreparationFilters = ({
  activeFilter,
  statusCounts,
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
  itemCountFilter,
  notPrintedFilter,
  noShippingCodeFilter,
  sortBy,
  sortOrder,
  warehouses,
  onFilterChange,
  onSearchChange,
  onSelectedWarehouseChange,
  onStockFilterChange,
  onShortageReasonFilterChange,
  onShortageOwnerFilterChange,
  onShortageFollowUpFilterChange,
  onProductFilterChange,
  onItemCountFilterChange,
  onNotPrintedFilterChange,
  onNoShippingCodeFilterChange,
  onSortChange,
}: PreparationFiltersProps) => {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = useState(search);
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const hasAdvancedFilters =
    selectedWarehouseId !== "" ||
    stockFilter !== "all" ||
    shortageReasonFilter !== "all" ||
    shortageOwnerFilter !== "" ||
    shortageFollowUpFilter !== "all" ||
    productFilter !== "" ||
    itemCountFilter !== "all" ||
    notPrintedFilter !== "all" ||
    noShippingCodeFilter !== "all";

  const hasActiveFilters = activeFilter !== "ALL" || search !== "" || hasAdvancedFilters;

  const resetAll = () => {
    onFilterChange("ALL");
    onSearchChange("");
    onSelectedWarehouseChange("");
    onStockFilterChange("all");
    onShortageReasonFilterChange("all");
    onShortageOwnerFilterChange("");
    onShortageFollowUpFilterChange("all");
    onProductFilterChange("");
    onItemCountFilterChange("all");
    onNotPrintedFilterChange("all");
    onNoShippingCodeFilterChange("all");
    onSortChange("createdAt", "desc");
    setLocalSearch("");
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Top bar: Tabs & Search Controls */}
      <div className="flex flex-col gap-2 border-b border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Horizontal Scrollable Tabs */}
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => onFilterChange("ALL")}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeFilter === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>{t("preparation.filters.allStages", { count: "" }).replace(/\(\s*\)/, "").trim()}</span>
            <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              activeFilter === "ALL" ? "bg-white/20 text-white" : "bg-gray-200/80 text-gray-700"
            }`}>
              {visibleOrdersCount}
            </span>
          </button>

          {filterTabs.map((tab) => {
            const display = getStatusDisplay(tab.statusCode);
            const count = statusCounts[tab.statusCode] ?? 0;
            const isActive = activeFilter === tab.statusCode;

            return (
              <button
                key={tab.statusCode}
                onClick={() => onFilterChange(tab.statusCode)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? `${display.colorClass} border border-current shadow-sm`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={tab.name}
              >
                <span>{tab.name}</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/25 text-current"
                      : count > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-200/70 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Advanced Filters Trigger */}
        <div className="flex shrink-0 items-center gap-1.5 pt-1 sm:pt-0">
          <div className="relative flex-1 sm:w-48">
            <MagnifyingGlassIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={t("preparation.filters.quickSearchPlaceholder")}
              className="h-8 w-full rounded-xl border border-gray-200 bg-gray-50 pl-2 pr-8 text-xs text-gray-800 outline-none transition focus:border-amber-400 focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition ${
              showAdvanced || hasAdvancedFilters
                ? "bg-amber-100 text-amber-800 font-semibold"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FunnelIcon className="h-3.5 w-3.5" />
            <span>{t("preparation.filters.advanced")}</span>
            <ChevronDownIcon className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetAll}
              title={t("common.reset", "إعادة ضبط")}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toggle filter buttons */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-2.5">
        <button
          onClick={() =>
            onNotPrintedFilterChange(notPrintedFilter === "not_printed" ? "all" : "not_printed")
          }
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            notPrintedFilter === "not_printed"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t("preparation.filters.notPrinted")}
        </button>
        <button
          onClick={() =>
            onNoShippingCodeFilterChange(noShippingCodeFilter === "no_shipping_code" ? "all" : "no_shipping_code")
          }
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            noShippingCodeFilter === "no_shipping_code"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t("preparation.filters.noShippingCode")}
        </button>
      </div>

      {/* Advanced filters (collapsible) */}
      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2 border-t border-gray-50 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-gray-500">{t("preparation.filters.warehouse")}</label>
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
            <label className="block text-[10px] font-medium text-gray-500">{t("preparation.filters.stock")}</label>
            <select
              value={stockFilter}
              onChange={(e) => onStockFilterChange(e.target.value as StockFilter)}
              className={selectClass}
            >
              <option value="all">{t("preparation.filters.allStock")}</option>
              <option value="available">{t("preparation.filters.stockAvailable")}</option>
              <option value="shortage">{t("preparation.filters.stockShortage")}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-gray-500">{t("preparation.filters.sortBy")}</label>
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
            <label className="block text-[10px] font-medium text-gray-500">{t("preparation.filters.itemCount")}</label>
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
            <label className="block text-[10px] font-medium text-gray-500">{t("preparation.filters.product")}</label>
            <input
              value={productFilter}
              onChange={(e) => onProductFilterChange(e.target.value)}
              placeholder={t("preparation.filters.productPlaceholder")}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none transition focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-medium text-gray-500">{t("preparation.filters.shortageReason")}</label>
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
            <label className="block text-[10px] font-medium text-gray-500">{t("preparation.filters.followUpDate")}</label>
            <select
              value={shortageFollowUpFilter}
              onChange={(e) => onShortageFollowUpFilterChange(e.target.value as ShortageFollowUpFilter)}
              className={selectClass}
            >
              <option value="all">{t("preparation.filters.allDates")}</option>
              <option value="today">{t("preparation.filters.today")}</option>
              <option value="overdue">{t("preparation.filters.overdue")}</option>
              <option value="none">{t("preparation.filters.noDate")}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationFilters;
