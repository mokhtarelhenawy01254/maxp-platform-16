import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, RotateCcw } from "lucide-react";
import type { OrdersFilters } from "../../Orders";

export interface DateRangeFilterSectionProps {
  filters: OrdersFilters;
  hasCustomDateFilters: boolean;
  onFilterChange: (key: keyof OrdersFilters, value: OrdersFilters[keyof OrdersFilters]) => void;
  onSetQuickDate: (range: string) => void;
}

const QUICK_DATE_CHIPS = [
  { key: "", labelKey: "orders.allDates", defaultLabel: "الكل" },
  { key: "today", labelKey: "orders.today", defaultLabel: "اليوم" },
  { key: "yesterday", labelKey: "orders.yesterday", defaultLabel: "أمس" },
  { key: "last7", labelKey: "orders.last7Days", defaultLabel: "آخر 7 أيام" },
  { key: "last30", labelKey: "orders.last30Days", defaultLabel: "آخر 30 يوم" },
  { key: "thisMonth", labelKey: "orders.thisMonth", defaultLabel: "هذا الشهر" },
];

export const DateRangeFilterSection: React.FC<DateRangeFilterSectionProps> = ({
  filters,
  hasCustomDateFilters,
  onFilterChange,
  onSetQuickDate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <span>{t("orders.allDates", { defaultValue: "النطاق الزمني والتاريخ" })}</span>
        </label>
        {filters.timeRange && (
          <button
            type="button"
            onClick={() => onSetQuickDate("")}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t("orders.clearAll", { defaultValue: "إعادة تعيين" })}</span>
          </button>
        )}
      </div>

      {/* Quick Date Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK_DATE_CHIPS.map((chip) => {
          const isActive = filters.timeRange === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onSetQuickDate(chip.key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border/70 bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t(chip.labelKey, { defaultValue: chip.defaultLabel })}
            </button>
          );
        })}
      </div>

      {/* Main Select Dropdown */}
      <select
        aria-label={String(t("orders.allDates", { defaultValue: "النطاق الزمني" }))}
        value={filters.timeRange}
        onChange={(e) => onSetQuickDate(e.target.value)}
        className="w-full h-10 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
      >
        <option value="">{t("orders.allDates", { defaultValue: "جميع الأوقات" })}</option>
        <option value="today">{t("orders.today", { defaultValue: "اليوم" })}</option>
        <option value="yesterday">{t("orders.yesterday", { defaultValue: "أمس" })}</option>
        <option value="last7">{t("orders.last7Days", { defaultValue: "آخر 7 أيام" })}</option>
        <option value="last30">{t("orders.last30Days", { defaultValue: "آخر 30 يوم" })}</option>
        <option value="last90">{t("orders.last90Days", { defaultValue: "آخر 90 يوم" })}</option>
        <option value="last180">{t("orders.last6Months", { defaultValue: "آخر 6 أشهر" })}</option>
        <option value="last365">{t("orders.lastYear", { defaultValue: "آخر سنة" })}</option>
        <option value="thisMonth">{t("orders.thisMonth", { defaultValue: "هذا الشهر" })}</option>
        <option value="thisYear">{t("orders.thisYear", { defaultValue: "هذه السنة" })}</option>
        <option value="custom">{t("orders.customPeriod", { defaultValue: "فترة مخصصة" })}</option>
      </select>

      {/* Custom Date Pickers */}
      {hasCustomDateFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="space-y-1">
            <span className="block text-[11px] font-semibold text-muted-foreground">
              {t("orders.fromDate", { defaultValue: "من تاريخ" })}
            </span>
            <input
              type="date"
              aria-label={String(t("orders.startDate", { defaultValue: "تاريخ البداية" }))}
              value={filters.startDate}
              onChange={(e) => {
                onFilterChange("startDate", e.target.value);
                if (filters.timeRange !== "custom") onFilterChange("timeRange", "custom");
              }}
              className="w-full h-10 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <span className="block text-[11px] font-semibold text-muted-foreground">
              {t("orders.toDate", { defaultValue: "إلى تاريخ" })}
            </span>
            <input
              type="date"
              aria-label={String(t("orders.endDate", { defaultValue: "تاريخ النهاية" }))}
              value={filters.endDate}
              onChange={(e) => {
                onFilterChange("endDate", e.target.value);
                if (filters.timeRange !== "custom") onFilterChange("timeRange", "custom");
              }}
              className="w-full h-10 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilterSection;
