import React from "react";
import { useTranslation } from "react-i18next";
import { Search, ChevronDown, Calendar } from "lucide-react";

export interface BulkOrdersFilterBarProps {
  search: string;
  setSearch: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  statusOptions: string[];
}

export const BulkOrdersFilterBar: React.FC<BulkOrdersFilterBarProps> = ({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  statusOptions,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-3 sm:p-3.5 border-b border-border/70 bg-card/40">
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={15}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("orders.bulkSearchPlaceholder", { defaultValue: "بحث برقم العملية أو الاسم..." })}
            className="w-full h-10 py-2 ps-9 pe-3 text-xs sm:text-sm border border-border/70 rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono tabular-nums text-start"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            aria-label={t("orders.allStatuses", { defaultValue: "جميع الحالات" })}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 appearance-none pe-8 ps-3 border border-border/70 rounded-xl bg-background text-foreground text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="">{t("orders.allStatuses", { defaultValue: "جميع الحالات" })}</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {t(`orders.bulkStatus${s}`, { defaultValue: s })}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Date From */}
        <div className="relative">
          <input
            type="date"
            aria-label={t("orders.fromDate", { defaultValue: "من تاريخ" })}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 px-3 border border-border/70 rounded-xl bg-background text-foreground text-xs sm:text-sm font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            title={t("orders.fromDate", { defaultValue: "من تاريخ" })}
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <input
            type="date"
            aria-label={t("orders.toDate", { defaultValue: "إلى تاريخ" })}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 px-3 border border-border/70 rounded-xl bg-background text-foreground text-xs sm:text-sm font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            title={t("orders.toDate", { defaultValue: "إلى تاريخ" })}
          />
        </div>
      </div>
    </div>
  );
};

export default BulkOrdersFilterBar;
