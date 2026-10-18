import React from "react";
import { useTranslation } from "react-i18next";
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
  "w-full h-9 rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

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
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.stockStatus", { defaultValue: "حالة المخزون" })}
        </label>
        <select
          value={stockFilter}
          onChange={(e) => onStockFilterChange(e.target.value as StockFilter)}
          className={selectClass}
        >
          <option value="all">{t("preparation.filters.allStock", { defaultValue: "الكل" })}</option>
          <option value="ready">{t("preparation.filters.ready", { defaultValue: "جاهز للتجهيز" })}</option>
          <option value="shortage">{t("preparation.filters.shortage", { defaultValue: "نواقص" })}</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.sortBy", { defaultValue: "الترتيب حسب" })}
        </label>
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
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.itemsCount", { defaultValue: "عدد العناصر" })}
        </label>
        <select
          value={itemCountFilter}
          onChange={(e) => onItemCountFilterChange(e.target.value as ItemCountFilter)}
          className={selectClass}
        >
          <option value="all">{t("preparation.filters.allItems", { defaultValue: "كل القطع" })}</option>
          <option value="single">{t("preparation.filters.singleItem", { defaultValue: "قطعة واحدة" })}</option>
          <option value="multiple">{t("preparation.filters.multipleItems", { defaultValue: "أكثر من قطعة" })}</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.shortageReason", { defaultValue: "سبب النقص" })}
        </label>
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
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          {t("preparation.filters.followUpDate", { defaultValue: "تاريخ المتابعة" })}
        </label>
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
      </div>
    </div>
  );
};

export default PreparationAdvancedGrid;
