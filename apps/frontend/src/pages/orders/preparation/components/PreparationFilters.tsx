import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SHORTAGE_REASON_OPTIONS, SORT_OPTIONS } from "../constants";
import type {
  ItemCountFilter,
  ShortageFollowUpFilter,
  ShortageReasonFilter,
  SortBy,
  SortOrder,
  StageCounts,
  StageDefinition,
  StageFilter,
  StockFilter,
  WarehouseOption,
} from "../types";

interface PreparationFiltersProps {
  activeStage: StageFilter;
  stageCounts: StageCounts;
  stageDefinitions: StageDefinition[];
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
  onActiveStageChange: (stage: StageFilter) => void;
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
  activeStage,
  stageCounts,
  stageDefinitions,
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
  onActiveStageChange,
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

  const isDefaultSort = sortBy === "createdAt" && sortOrder === "desc";

  const hasActiveFilters =
    activeStage !== "ALL" ||
    selectedWarehouseId !== "" ||
    stockFilter !== "all" ||
    shortageReasonFilter !== "all" ||
    shortageOwnerFilter !== "" ||
    shortageFollowUpFilter !== "all" ||
    productFilter !== "" ||
    itemCountFilter !== "all" ||
    search !== "" ||
    !isDefaultSort;

  const resetAll = () => {
    onActiveStageChange("ALL");
    setLocalSearch("");
    onSearchChange("");
    onSelectedWarehouseChange("");
    onStockFilterChange("all");
    onShortageReasonFilterChange("all");
    onShortageOwnerFilterChange("");
    onShortageFollowUpFilterChange("all");
    onProductFilterChange("");
    onItemCountFilterChange("all");
    onSortChange("createdAt", "desc");
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{t("preparation.filters.title")}</span>
          {hasActiveFilters && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {t("preparation.filters.active")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {t("preparation.filters.ordersCount", { count: visibleOrdersCount })}
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              {t("preparation.filters.clearAll")}
            </button>
          )}
        </div>
      </div>

      {/* Stage tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-4 py-2.5">
        <button
          onClick={() => onActiveStageChange("ALL")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            activeStage === "ALL"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t("preparation.filters.allStages", { count: stageCounts.ALL })}
        </button>
        {stageDefinitions.map((stage) => (
          <button
            key={stage.key}
            onClick={() => onActiveStageChange(stage.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeStage === stage.key
                ? `${stage.colorClass} border border-current`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title={t(stage.descriptionKey)}
          >
            {t(stage.labelKey)} ({stageCounts[stage.key] || 0})
          </button>
        ))}
      </div>

      {/* Filter fields */}
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
        {/* Search — wider */}
        <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-500">{t("preparation.filters.quickSearch")}</label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={t("preparation.filters.quickSearchPlaceholder")}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-800 outline-none transition focus:border-amber-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Product filter */}
        <div className="col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-500">{t("preparation.filters.product")}</label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={productFilter}
              onChange={(e) => onProductFilterChange(e.target.value)}
              placeholder={t("preparation.filters.productPlaceholder")}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-800 outline-none transition focus:border-amber-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Warehouse */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">{t("preparation.filters.warehouse")}</label>
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

        {/* Stock status */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">{t("preparation.filters.stockStatus")}</label>
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

        {/* Sort */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">{t("preparation.filters.sortBy")}</label>
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

        {/* Item count */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">{t("preparation.filters.itemsCount")}</label>
          <select
            value={itemCountFilter}
            onChange={(e) => onItemCountFilterChange(e.target.value as ItemCountFilter)}
            className={selectClass}
          >
            <option value="all">{t("preparation.filters.allStock")}</option>
            <option value="single">{t("preparation.filters.singleItem")}</option>
            <option value="multiple">{t("preparation.filters.multipleItems")}</option>
          </select>
        </div>

        {/* Shortage reason */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">{t("preparation.filters.shortageReason")}</label>
          <select
            value={shortageReasonFilter}
            onChange={(e) =>
              onShortageReasonFilterChange(e.target.value as ShortageReasonFilter)
            }
            className={selectClass}
          >
            <option value="all">{t("preparation.filters.allReasons")}</option>
            {SHORTAGE_REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
        </div>

        {/* Owner */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">{t("preparation.filters.owner")}</label>
          <input
            list="preparation-shortage-owners"
            value={shortageOwnerFilter}
            onChange={(e) => onShortageOwnerFilterChange(e.target.value)}
            placeholder={t("preparation.filters.allOwners")}
            className={selectClass}
          />
          <datalist id="preparation-shortage-owners">
            {shortageOwnerOptions.map((owner) => (
              <option key={owner} value={owner} />
            ))}
          </datalist>
        </div>

        {/* Follow-up date */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">{t("preparation.filters.followUpDate")}</label>
          <select
            value={shortageFollowUpFilter}
            onChange={(e) =>
              onShortageFollowUpFilterChange(e.target.value as ShortageFollowUpFilter)
            }
            className={selectClass}
          >
            <option value="all">{t("preparation.filters.allDates")}</option>
            <option value="today">{t("preparation.filters.today")}</option>
            <option value="overdue">{t("preparation.filters.overdue")}</option>
            <option value="without_date">{t("preparation.filters.withoutDate")}</option>
          </select>
        </div>
      </div>
    </section>
  );
};

export default PreparationFilters;
