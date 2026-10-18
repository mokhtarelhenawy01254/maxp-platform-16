import React from "react";
import { useTranslation } from "react-i18next";

export interface FilterDrawerFooterProps {
  advancedFilterCount: number;
  onlyUnseen: boolean;
  onClearAdvancedFilters: () => void;
  onClose: () => void;
}

export const FilterDrawerFooter: React.FC<FilterDrawerFooterProps> = ({
  advancedFilterCount,
  onlyUnseen,
  onClearAdvancedFilters,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <div className="border-t border-border/70 bg-card/90 px-4 sm:px-6 py-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClearAdvancedFilters}
          disabled={advancedFilterCount === 0 && !onlyUnseen}
          className="inline-flex items-center justify-center rounded-xl border border-border/70 bg-background/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 transition-all"
        >
          {t("orders.clearAdvancedFilters", { defaultValue: "إعادة تعيين الكل" })}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl bg-primary px-5 py-2.5 text-center text-xs sm:text-sm font-bold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
        >
          {t("orders.applyFilters", { defaultValue: "تطبيق الفلاتر" })}
        </button>
      </div>
    </div>
  );
};

export default FilterDrawerFooter;
