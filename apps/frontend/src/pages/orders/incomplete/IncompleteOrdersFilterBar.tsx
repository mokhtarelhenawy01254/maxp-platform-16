import React from "react";
import { useTranslation } from "react-i18next";
import { Search, RotateCw } from "lucide-react";

export type SortValue = "recent" | "value_desc" | "value_asc" | "priority";
export type PhoneFilter = "all" | "with_phone" | "no_phone";

interface IncompleteOrdersFilterBarProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  phoneFilter: PhoneFilter;
  onPhoneFilterChange: (filter: PhoneFilter) => void;
  sortValue: SortValue;
  onSortValueChange: (sort: SortValue) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  onRefresh: () => void;
  activeCount: number;
  lostCount: number;
  loading?: boolean;
}

export const IncompleteOrdersFilterBar: React.FC<IncompleteOrdersFilterBarProps> = ({
  searchInput,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  phoneFilter,
  onPhoneFilterChange,
  sortValue,
  onSortValueChange,
  limit,
  onLimitChange,
  onRefresh,
  activeCount,
  lostCount,
  loading = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border/70 bg-card p-2.5 shadow-2xs">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <label htmlFor="incomplete-orders-search" className="sr-only">
            {t("orders.incompleteSearchLabel")}
          </label>
          <Search className="h-4 w-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="incomplete-orders-search"
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("orders.incompleteSearchPlaceholder")}
            className="w-full ps-9 pe-9 py-2 border border-border/70 rounded-lg bg-muted/30 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:bg-card focus:border-border focus:ring-1 focus:ring-ring outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Segmented active/lost toggle */}
          <div className="flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => onStatusFilterChange("active")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === "active"
                  ? "bg-card text-foreground shadow-2xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={statusFilter === "active"}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{t("orders.incompleteStatusActive")}</span>
              <span className="font-mono tabular-nums text-[11px] opacity-80">
                ({activeCount})
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange("lost")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === "lost"
                  ? "bg-card text-foreground shadow-2xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={statusFilter === "lost"}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>{t("orders.incompleteStatusLost")}</span>
              <span className="font-mono tabular-nums text-[11px] opacity-80">
                ({lostCount})
              </span>
            </button>
          </div>

          {/* Phone filter select */}
          <label htmlFor="incomplete-orders-phone" className="sr-only">
            {t("orders.incompletePhoneLabel")}
          </label>
          <select
            id="incomplete-orders-phone"
            value={phoneFilter}
            onChange={(e) => onPhoneFilterChange(e.target.value as PhoneFilter)}
            className="px-2.5 py-1.5 border border-border/70 rounded-lg bg-card text-xs font-medium text-foreground focus:border-border focus:ring-1 focus:ring-ring outline-none transition-all cursor-pointer"
          >
            <option value="with_phone">{t("orders.incompletePhoneWith")}</option>
            <option value="no_phone">{t("orders.incompletePhoneWithout")}</option>
            <option value="all">{t("orders.incompletePhoneAll")}</option>
          </select>

          {/* Sort select */}
          <label htmlFor="incomplete-orders-sort" className="sr-only">
            {t("orders.incompleteSort")}
          </label>
          <select
            id="incomplete-orders-sort"
            value={sortValue}
            onChange={(e) => onSortValueChange(e.target.value as SortValue)}
            className="px-2.5 py-1.5 border border-border/70 rounded-lg bg-card text-xs font-medium text-foreground focus:border-border focus:ring-1 focus:ring-ring outline-none transition-all cursor-pointer"
          >
            <option value="priority">{t("orders.incompleteSortPriority")}</option>
            <option value="recent">{t("orders.incompleteSortLastUpdated")}</option>
            <option value="value_desc">{t("orders.incompleteSortValueDesc")}</option>
            <option value="value_asc">{t("orders.incompleteSortValueAsc")}</option>
          </select>

          {/* Limit select */}
          <label htmlFor="incomplete-orders-per-page" className="sr-only">
            {t("orders.incompletePerPage")}
          </label>
          <select
            id="incomplete-orders-per-page"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2 py-1.5 border border-border/70 rounded-lg bg-card text-xs font-medium text-foreground focus:border-border focus:ring-1 focus:ring-ring outline-none transition-all cursor-pointer font-mono tabular-nums"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg border border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-[0.98] transition-all"
            title={t("orders.incompleteRetry")}
            aria-label={t("orders.incompleteRetry")}
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncompleteOrdersFilterBar;
