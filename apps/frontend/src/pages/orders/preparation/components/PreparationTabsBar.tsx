import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, SlidersHorizontal, Search, X } from "lucide-react";
import { normalizeStatusToStage } from "../helpers";
import type { StageCounts } from "../types";

export interface PreparationTabsBarProps {
  activeFilter: string;
  statusCounts: Record<string, number>;
  stageCounts: StageCounts;
  filterTabs: { statusCode: string; name: string }[];
  visibleOrdersCount: number;
  localSearch: string;
  setLocalSearch: (val: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  hasAdvancedFilters: boolean;
  hasActiveFilters: boolean;
  resetAll: () => void;
  tabCodes: Set<string>;
  primaryTabByStage: Map<string, string>;
  unrepresentedCountsByStage: Record<string, number>;
  visibleFilterSections: string[];
  onFilterChange: (filter: string) => void;
}

export const PreparationTabsBar: React.FC<PreparationTabsBarProps> = ({
  activeFilter,
  statusCounts,
  stageCounts,
  filterTabs,
  visibleOrdersCount,
  localSearch,
  setLocalSearch,
  showAdvanced,
  setShowAdvanced,
  hasAdvancedFilters,
  hasActiveFilters,
  resetAll,
  primaryTabByStage,
  unrepresentedCountsByStage,
  visibleFilterSections,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 border-b border-border/70 p-2.5 sm:flex-row sm:items-center sm:justify-between bg-card/80">
      {/* Horizontal Scrollable Tabs */}
      {visibleFilterSections.includes("tabs") && (
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5 sm:pb-0 no-scrollbar">
          <button
            onClick={() => onFilterChange("ALL")}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition active:scale-[0.98] ${
              activeFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "border border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            }`}
          >
            <span>{t("preparation.filters.allStages", { count: "" }).replace(/\(\s*\)/, "").trim()}</span>
            <span
              className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums ${
                activeFilter === "ALL"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-foreground"
              }`}
            >
              {visibleOrdersCount}
            </span>
          </button>

          {filterTabs.map((tab) => {
            const mappedStage = normalizeStatusToStage(tab.statusCode);
            const hasDirectCount = statusCounts[tab.statusCode] !== undefined;
            const isPrimary = mappedStage ? primaryTabByStage.get(mappedStage) === tab.statusCode : false;
            const unrepresentedCount =
              hasDirectCount && isPrimary && mappedStage
                ? unrepresentedCountsByStage[mappedStage] || 0
                : 0;
            const count =
              (hasDirectCount
                ? statusCounts[tab.statusCode]
                : mappedStage && stageCounts[mappedStage] !== undefined
                ? stageCounts[mappedStage]
                : 0) + unrepresentedCount;
            const isActive = activeFilter === tab.statusCode;

            return (
              <button
                key={tab.statusCode}
                onClick={() => onFilterChange(tab.statusCode)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition active:scale-[0.98] ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "border border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
                title={tab.name}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-emerald-400" : "bg-muted-foreground/60"
                  }`}
                />
                <span>{tab.name}</span>
                <span
                  className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white"
                      : count > 0
                      ? "bg-muted text-foreground"
                      : "bg-muted/40 text-muted-foreground/60"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Advanced Filters Trigger */}
      {visibleFilterSections.includes("search") && (
        <div className="flex shrink-0 items-center gap-1.5 pt-1 sm:pt-0">
          <div className="relative flex-1 sm:w-56">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={t("preparation.filters.quickSearchPlaceholder")}
              className="h-9 w-full rounded-xl border border-border/70 bg-background/80 ps-8 pe-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition active:scale-[0.98] ${
              showAdvanced || hasAdvancedFilters
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "border border-border/70 bg-background/80 text-foreground hover:bg-muted"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{t("preparation.filters.advancedFilters")}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${
                showAdvanced ? "rotate-180" : ""
              }`}
            />
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetAll}
              title={t("common.reset")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted transition active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PreparationTabsBar;
