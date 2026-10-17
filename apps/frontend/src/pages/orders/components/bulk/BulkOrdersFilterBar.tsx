import React from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

interface BulkOrdersFilterBarProps {
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
    <div className="p-3.5 border-b border-border/70 bg-muted/20">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("orders.bulkSearchPlaceholder") || "بحث برقم العملية أو الاسم…"}
            className="w-full py-2 px-3 pl-8 text-xs sm:text-sm border border-border/70 rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono tabular-nums"
          />
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={15}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border/70 rounded-xl bg-background text-foreground text-xs sm:text-sm focus:ring-2 focus:ring-primary transition-all"
        >
          <option value="">{t("orders.allStatuses") || "جميع الحالات"}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {t(`orders.bulkStatus${s}`) || s}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border border-border/70 rounded-xl bg-background text-foreground text-xs sm:text-sm font-mono tabular-nums focus:ring-2 focus:ring-primary transition-all"
          title={t("orders.bulkFilterDate") || "من تاريخ"}
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border border-border/70 rounded-xl bg-background text-foreground text-xs sm:text-sm font-mono tabular-nums focus:ring-2 focus:ring-primary transition-all"
          title={t("orders.bulkFilterDate") || "إلى تاريخ"}
        />
      </div>
    </div>
  );
};
