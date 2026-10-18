import React from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, RotateCcw, X } from "lucide-react";

export interface FilterDrawerHeaderProps {
  advancedFilterCount: number;
  onClearAdvancedFilters: () => void;
  onClose: () => void;
}

export const FilterDrawerHeader: React.FC<FilterDrawerHeaderProps> = ({
  advancedFilterCount,
  onClearAdvancedFilters,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between border-b border-border/70 px-4 sm:px-6 py-4 bg-card/80 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div>
          <h2
            id="orders-filter-drawer-title"
            className="text-sm sm:text-base font-bold text-foreground tracking-tight"
          >
            {t("orders.filters", { defaultValue: "فلاتر الطلبات المتقدمة" })}
          </h2>
          <p className="text-xs text-muted-foreground">
            {advancedFilterCount > 0 ? (
              <span className="font-semibold text-primary font-mono tabular-nums">
                {advancedFilterCount}{" "}
                {t("orders.activeFilters", { count: advancedFilterCount }) || "فلاتر نشطة"}
              </span>
            ) : (
              t("orders.allOrders", { defaultValue: "عرض جميع الطلبات بدون تصفية" })
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {advancedFilterCount > 0 && (
          <button
            type="button"
            onClick={onClearAdvancedFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
            title={String(t("orders.clearAdvancedFilters", { defaultValue: "مسح الفلاتر" }))}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t("orders.clearAll", { defaultValue: "مسح الكل" })}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={String(t("common.close", { defaultValue: "إغلاق" }))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default FilterDrawerHeader;
