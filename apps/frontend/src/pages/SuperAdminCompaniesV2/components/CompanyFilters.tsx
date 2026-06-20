import { useState, useEffect } from "react";
import { Search, ArrowDownUp, Filter, X } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Separator } from "../../../components/ui/separator";
import { cn } from "../../../lib/utils";
import {
  FOLLOW_UP_SAVED_VIEWS, STATUS_FILTERS, PLAN_FILTERS, FUNNEL_STAGE_FILTERS, SORT_OPTIONS, PAGE_SIZE_OPTIONS, DEFAULT_SORT,
} from "../constants";
import { FacebookLookup } from "./FacebookLookup";
import type { QuickStats } from "../types";

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-xs font-black transition-all duration-150",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "border-border/60 bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground dark:bg-slate-950",
      )}
    >
      {children}
    </button>
  );
}

interface CompanyFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  savedView: string;
  onSavedViewChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  plan: string;
  onPlanChange: (v: string) => void;
  funnelStage: string;
  onFunnelStageChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  rowsPerPage: string;
  onRowsPerPageChange: (v: string) => void;
  onClearAll: () => void;
  stats: QuickStats;
  totalResults: number;
  filterCount: number;
  activeFilterLabels: (string | null)[];
  onOpenView: (v: string) => void;
  facebookLookup: {
    query: string;
    onQueryChange: (v: string) => void;
    onSearch: () => void;
    onClear: () => void;
    loading: boolean;
    error: string;
    searched: boolean;
    results: import("../types").FacebookPageResult[];
  };
  collapsed?: boolean;
}

export function CompanyFilters({
  search, onSearchChange, savedView, onSavedViewChange,
  status, onStatusChange, plan, onPlanChange,
  funnelStage, onFunnelStageChange, sort, onSortChange,
  rowsPerPage, onRowsPerPageChange, onClearAll,
  stats, totalResults, filterCount,
  activeFilterLabels, onOpenView,
  facebookLookup, collapsed,
}: CompanyFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => { if (localSearch !== search) onSearchChange(localSearch); }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);
  useEffect(() => { setLocalSearch(search); }, [search]);

  const savedViewCounts: Record<string, number> = {
    ALL: stats.totalCompanies,
    FOLLOW_UP_NOW: stats.followUpNow,
    MY_TODAY: stats.myDueToday,
    ESCALATION_DUE: stats.escalationDue + stats.urgentEscalationDue,
    STALE_72H: stats.stale72h,
  };
  const funnelStageCounts: Record<string, number> = {
    ALL: stats.trackedCompanies + stats.untrackedCompanies,
    registered_no_start: stats.registeredNoStart,
    onboarding_in_progress: stats.onboardingInProgress,
    activation_in_progress: stats.activationInProgress,
    activated: stats.activated,
    untracked: stats.untrackedCompanies,
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="group relative flex-1">
          <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            aria-label="بحث الشركات"
            name="company-search"
            autoComplete="off"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="ابحث..."
            className="h-8 rounded-lg border-border/60 bg-white pr-9 text-xs shadow-sm transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/5 dark:bg-slate-950"
          />
          {localSearch && (
            <button
              type="button"
              aria-label="مسح البحث"
              onClick={() => { setLocalSearch(""); onSearchChange(""); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger aria-label="ترتيب الشركات" className="h-8 min-w-0 rounded-lg border-border/60 bg-white text-xs shadow-sm lg:min-w-[12rem]">
              <div className="flex items-center gap-2">
                <ArrowDownUp className="size-4 text-primary" aria-hidden="true" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={rowsPerPage} onValueChange={onRowsPerPageChange}>
            <SelectTrigger aria-label="عدد الشركات في الصفحة" className="h-8 min-w-0 rounded-lg border-border/60 bg-white text-xs shadow-sm lg:min-w-[7rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt} / صفحة</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FOLLOW_UP_SAVED_VIEWS.map((opt) => (
          <FilterChip key={opt.value} active={savedView === opt.value} onClick={() => onOpenView(opt.value)}>
            {opt.label}
            <span className={cn(
              "mr-1.5 rounded-full px-1.5 py-0.5 text-xs font-black",
              savedView === opt.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {savedViewCounts[opt.value] ?? 0}
            </span>
          </FilterChip>
        ))}
      </div>

      <div className={cn("overflow-hidden transition-all duration-200", collapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[900px] opacity-100")}>
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-muted/20 p-0.5">
              {STATUS_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={status === opt.value}
                  onClick={() => onStatusChange(opt.value)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-bold transition-all",
                    status === opt.value ? "bg-white text-foreground shadow-sm dark:bg-slate-800" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-muted/20 p-0.5">
              {PLAN_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={plan === opt.value}
                  onClick={() => onPlanChange(opt.value)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-bold transition-all",
                    plan === opt.value ? "bg-white text-foreground shadow-sm dark:bg-slate-800" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Filter className="size-3.5 shrink-0 text-muted-foreground" />
            {FUNNEL_STAGE_FILTERS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={funnelStage === opt.value}
                onClick={() => onFunnelStageChange(opt.value)}
                className={cn(
                  "shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all",
                  funnelStage === opt.value
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {opt.label} ({funnelStageCounts[opt.value] ?? 0})
              </button>
            ))}
          </div>

          {(filterCount > 0 || search) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">الفلاتر النشطة:</span>
              {search ? <Badge variant="secondary" className="rounded-full bg-primary/5 text-primary border-primary/10 px-3 py-1 text-xs">البحث: {search}</Badge> : null}
              {activeFilterLabels.filter(Boolean).map((label) => (
                <Badge key={label} variant="secondary" className="rounded-full bg-primary/5 text-primary border-primary/10 px-3 py-1 text-xs">{label}</Badge>
              ))}
              <Button type="button" variant="ghost" size="sm" className="h-7 rounded-full text-xs font-black text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={onClearAll}>
                مسح الفلاتر
              </Button>
            </div>
          )}
        </div>

        <div className="mt-2 rounded-lg border border-border/40 bg-muted/10 p-0.5">
          <FacebookLookup
          query={facebookLookup.query}
          onQueryChange={facebookLookup.onQueryChange}
          onSearch={facebookLookup.onSearch}
          onClear={facebookLookup.onClear}
          loading={facebookLookup.loading}
          error={facebookLookup.error}
          searched={facebookLookup.searched}
          results={facebookLookup.results}
        />
      </div>
      </div>
    </div>
  );
}
