import React from "react";
import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import { SavedViews } from "../SavedViews";
import type { OrdersFilters } from "../../Orders";

export interface QuickViewItem {
  key: string;
  label: string;
  isActive: (filters: OrdersFilters) => boolean;
  apply: () => void;
}

export interface OrdersQuickViewsBarProps {
  quickViews: QuickViewItem[];
  filters: OrdersFilters;
  onApplyFilters: (next: Partial<OrdersFilters>) => void;
}

export const OrdersQuickViewsBar: React.FC<OrdersQuickViewsBarProps> = ({
  quickViews,
  filters,
  onApplyFilters,
}) => {
  const { t } = useTranslation();

  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-0.5 sm:flex-wrap">
      <span className="hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline-flex">
        <Zap className="h-3.5 w-3.5" />
        {t("orders.quickViews")}
      </span>
      {quickViews.map((view) => {
        const active = view.isActive(filters);
        return (
          <button
            key={view.key}
            type="button"
            onClick={view.apply}
            className={`inline-flex h-7 sm:h-8 min-h-[28px] sm:min-h-[32px] flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-lg sm:rounded-xl border px-2.5 sm:px-3 text-xs font-semibold active:scale-[0.97] transition-all duration-150 cursor-pointer ${
              active
                ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:border-border"
            }`}
          >
            {view.label}
          </button>
        );
      })}
      <span className="mx-0.5 hidden h-4 w-px bg-border sm:inline-block" />
      <div className="flex-shrink-0">
        <SavedViews filters={filters} onApplyFilters={onApplyFilters} />
      </div>
    </div>
  );
};

export default OrdersQuickViewsBar;
