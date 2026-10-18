import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { SHORTAGE_REASON_OPTIONS, SORT_OPTIONS } from "../constants";
import type {
  ItemCountFilter,
  ShortageFollowUpFilter,
  ShortageReasonFilter,
  SortBy,
  SortOrder,
  StockFilter,
  WarehouseOption,
} from "../types";

export interface PreparationAdvancedGridProps {
  showAdvanced: boolean;
  visibleFilterSections: string[];
  selectedWarehouseId: string;
  warehouses: WarehouseOption[];
  stockFilter: StockFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
  itemCountFilter: ItemCountFilter;
  shortageReasonFilter: ShortageReasonFilter;
  shortageFollowUpFilter: ShortageFollowUpFilter;
  onSelectedWarehouseChange: (value: string) => void;
  onStockFilterChange: (value: StockFilter) => void;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
  onItemCountFilterChange: (value: ItemCountFilter) => void;
  onShortageReasonFilterChange: (value: ShortageReasonFilter) => void;
  onShortageFollowUpFilterChange: (value: ShortageFollowUpFilter) => void;
}

const selectClass =
  "w-full h-9 appearance-none rounded-xl border border-border/70 bg-background ps-3 pe-8 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 cursor-pointer";

export const PreparationAdvancedGrid: React.FC<PreparationAdvancedGridProps> = ({
  showAdvanced,
  visibleFilterSections,
  selectedWarehouseId,
  warehouses,
  stockFilter,
  sortBy,
  sortOrder,
  itemCountFilter,
  shortageReasonFilter,
  shortageFollowUpFilter,
  onSelectedWarehouseChange,
  onStockFilterChange,
  onSortChange,
  onItemCountFilterChange,
  onShortageReasonFilterChange,
  onShortageFollowUpFilterChange,
}) => {
  const { t } = useTranslation();

  if (!showAdvanced || !visibleFilterSections.includes("advanced")) return null;

  return (
    <div className="grid grid-cols-1 gap-3 border-t border-border/70 p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 bg-muted/20 animate-in fade-in duration-150">
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.warehouse", { defaultValue: "المستودع" })}
        </label>
        <div className="relative">
          <select
            value={selectedWarehouseId}
            onChange={(e) => onSelectedWarehouseChange(e.target.value)}
            className={selectClass}
          >
            <option value="">{t("preparation.filters.allWarehouses", { defaultValue: "كل المستودعات" })}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.stockStatus", { defaultValue: "حالة المخزون" })}
        </label>
        <div className="relative">
          <select
            value={stockFilter}
            onChange={(e) => onStockFilterChange(e.target.value as StockFilter)}
            className={selectClass}
          >
            <option value="all">{t("preparation.filters.allStock", { defaultValue: "الكل" })}</option>
            <option value="ready">{t("preparation.filters.ready", { defaultValue: "جاهز للتجهيز" })}</option>
            <option value="shortage">{t("preparation.filters.shortage", { defaultValue: "نواقص" })}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.sortBy", { defaultValue: "الترتيب حسب" })}
        </label>
        <div className="relative">
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split("_") as [SortBy, SortOrder];
              onSortChange(newSortBy, newSortOrder);
            }}
            className={selectClass}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.itemsCount", { defaultValue: "عدد العناصر" })}
        </label>
        <div className="relative">
          <select
            value={itemCountFilter}
            onChange={(e) => onItemCountFilterChange(e.target.value as ItemCountFilter)}
            className={selectClass}
          >
            <option value="all">{t("preparation.filters.allItems", { defaultValue: "كل القطع" })}</option>
            <option value="single">{t("preparation.filters.singleItem", { defaultValue: "قطعة واحدة" })}</option>
            <option value="multiple">{t("preparation.filters.multipleItems", { defaultValue: "أكثر من قطعة" })}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.shortageReason", { defaultValue: "سبب النقص" })}
        </label>
        <div className="relative">
          <select
            value={shortageReasonFilter}
            onChange={(e) => onShortageReasonFilterChange(e.target.value as ShortageReasonFilter)}
            className={selectClass}
          >
            <option value="all">{t("preparation.filters.allReasons", { defaultValue: "كل الأسباب" })}</option>
            {SHORTAGE_REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.followUpDate", { defaultValue: "تاريخ المتابعة" })}
        </label>
        <div className="relative">
          <select
            value={shortageFollowUpFilter}
            onChange={(e) => onShortageFollowUpFilterChange(e.target.value as ShortageFollowUpFilter)}
            className={selectClass}
          >
            <option value="all">{t("preparation.filters.allDates", { defaultValue: "كل التواريخ" })}</option>
            <option value="today">{t("preparation.filters.today", { defaultValue: "اليوم" })}</option>
            <option value="overdue">{t("preparation.filters.overdue", { defaultValue: "متأخر" })}</option>
            <option value="without_date">{t("preparation.filters.withoutDate", { defaultValue: "بدون تاريخ" })}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

export default PreparationAdvancedGrid;
