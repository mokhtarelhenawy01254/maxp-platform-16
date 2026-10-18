import React from "react";
import { useTranslation } from "react-i18next";
import { Filter } from "lucide-react";
import {
  useFilterChipsList,
  type OrderStatusFilterOption,
  type MerchantFilterOption,
  type AffiliateFilterOption,
  type UseFilterChipsOptions,
} from "./filters/useFilterChipsList";
import { FilterChipPill } from "./filters/FilterChipPill";

export type { OrderStatusFilterOption, MerchantFilterOption, AffiliateFilterOption };

export interface FilterChipsProps extends UseFilterChipsOptions {
  /** Clear the advanced filters (and the chip strip in one go). */
  onClearAdvancedFilters: () => void;
}

/**
 * Active filter chips. Renders one pill per non-default filter value, with a
 * dismiss button that resets just that filter.
 */
export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  filterableOrderStatuses = [],
  filterablePaymentStatuses = [],
  merchantOptions = [],
  affiliateOptions = [],
  onFilterChange,
  onClearAdvancedFilters,
}) => {
  const { t } = useTranslation();

  const chips = useFilterChipsList({
    filters,
    filterableOrderStatuses,
    filterablePaymentStatuses,
    merchantOptions,
    affiliateOptions,
    onFilterChange,
  });

  if (chips.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={String(t("orders.activeFilters", { defaultValue: "الفلاتر النشطة" }))}
      className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 py-2 text-xs shadow-xs backdrop-blur-sm"
    >
      <span className="inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        {t("orders.activeFilters", { defaultValue: "فلاتر نشطة" })}
        <span className="ms-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold font-mono tabular-nums text-primary">
          {chips.length}
        </span>
      </span>

      {chips.map((chip, idx) => (
        <FilterChipPill key={`${chip.key}-${idx}`} chip={chip} />
      ))}

      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAdvancedFilters}
          className="ms-auto rounded-md px-2 py-0.5 text-[11px] font-semibold text-destructive transition hover:bg-destructive/10 cursor-pointer"
        >
          {t("orders.clearAll", { defaultValue: "مسح الكل" })}
        </button>
      )}
    </div>
  );
};

export default FilterChips;
