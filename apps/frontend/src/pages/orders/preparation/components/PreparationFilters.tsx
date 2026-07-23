import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SHORTAGE_REASON_OPTIONS, SORT_OPTIONS } from "../constants";
import { getStatusDisplay } from "../../../../utils/statusRegistry";
import type {
  ItemCountFilter,
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
    itemCountFilter !== "all";

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
    onSortChange("createdAt", "desc");
    setLocalSearch("");
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Top bar: tabs + search */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2">
        <button
          onClick={() => onFilterChange("ALL")}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
            activeFilter === "ALL"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t("preparation.filters.allStages", { count: visibleOrdersCount })}
        </button>

        <div className="flex flex-1 flex-wrap gap-1">
          {filterTabs.map((tab) => {
            const display = getStatusDisplay(tab.statusCode);
            return (
              <button
                key={tab.statusCode}
                onClick={() => onFilterChange(tab.statusCode)}
                className={`rounded-lg px-2 py-1 text-xs font-medium whitespace-nowrap transition ${
                  activeFilter === tab.statusCode
                    ? `${display.colorClass} border border-current`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={tab.name}
              >
                {tab.name}
                {(statusCounts[tab.statusCode] ?? 0) > 0 && (
                  <span className="mr-1 opacity-60">({statusCounts[tab.statusCode]})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={t("preparation.filters.quickSearchPlaceholder")}
              className="h-8 w-40 rounded-lg border border-gray-200 bg-gray-50 pl-2 pr-7 text-xs text-gray-800 outline-none transition focus:w-56 focus:border-amber-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition ${
              showAdvanced || hasAdvancedFilters
                ? "bg-amber-100 text-amber-800"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <FunnelIcon className="h-3.5 w-3.5" />
            {t("preparation.filters.advanced")}
            <ChevronDownIcon className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </button>

          {hasActiveFilters && (
            <button onClick={resetAll} className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
