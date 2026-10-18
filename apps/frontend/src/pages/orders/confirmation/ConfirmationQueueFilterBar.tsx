import React from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import type { FilterOption } from "./types";

export interface ConfirmationQueueFilterBarProps {
  searchInput: string;
  setSearchInput: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sourceFilter: string;
  setSourceFilter: (val: string) => void;
  onlyUnassigned: boolean;
  setOnlyUnassigned: React.Dispatch<React.SetStateAction<boolean>>;
  statusOptions: FilterOption[];
  sourceOptions: FilterOption[];
  activeQueueFilterCount: number;
  statusFilterLabel: string;
  sourceFilterLabel: string;
  onOpenMobileFilters: () => void;
  setPage: (val: number) => void;
}

export const ConfirmationQueueFilterBar: React.FC<ConfirmationQueueFilterBarProps> = ({
  searchInput,
  setSearchInput,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  onlyUnassigned,
  setOnlyUnassigned,
  statusOptions,
  sourceOptions,
  activeQueueFilterCount,
  statusFilterLabel,
  sourceFilterLabel,
  onOpenMobileFilters,
  setPage,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs">
      <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row">
        {/* Search input */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={String(t("orders.searchPlaceholder", { defaultValue: "بحث باسم العميل، الهاتف، أو رقم الطلب..." }))}
            className="h-10 w-full rounded-xl border border-border/70 bg-background py-2 pl-3 pr-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Mobile filter button */}
        <button
          type="button"
          onClick={onOpenMobileFilters}
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs sm:text-sm font-bold text-primary sm:hidden active:scale-95 transition-all"
        >
          <FunnelIcon className="h-4 w-4" />
          <span>{t("orders.filter", { defaultValue: "تصفية الفلاتر" })}</span>
          {activeQueueFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold font-mono tabular-nums text-primary-foreground">
              {activeQueueFilterCount}
            </span>
          )}
        </button>

        {/* Desktop Filter Controls */}
        <div className="hidden gap-2 flex-wrap sm:flex items-center">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 border border-border/70 rounded-xl bg-background text-foreground text-xs sm:text-sm focus:border-primary focus:outline-none transition-colors"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 border border-border/70 rounded-xl bg-background text-foreground text-xs sm:text-sm focus:border-primary focus:outline-none transition-colors"
          >
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOnlyUnassigned((prev) => !prev)}
            className={`h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold border flex items-center gap-2 active:scale-95 transition-all ${
              onlyUnassigned
                ? "bg-primary text-primary-foreground border-transparent shadow-xs"
                : "bg-background text-foreground border-border/70 hover:bg-muted"
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            <span>{t("orders.unassigned", { defaultValue: "غير مخصص" })}</span>
          </button>
        </div>
      </div>

      {/* Mobile Active Filter Chips */}
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-muted-foreground sm:hidden">
        <span className="rounded-lg bg-muted px-2.5 py-1 text-foreground font-semibold">
          {statusFilterLabel}
        </span>
        <span className="rounded-lg bg-muted px-2.5 py-1 text-foreground font-semibold">
          {sourceFilterLabel}
        </span>
        {onlyUnassigned && (
          <span className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 font-bold">
            {t("orders.unassigned", { defaultValue: "غير مخصص" })}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConfirmationQueueFilterBar;
