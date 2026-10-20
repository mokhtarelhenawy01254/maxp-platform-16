import React from "react";
import {
  Search, X, CheckCircle2, Clock, ArrowUpDown,
  LayoutGrid, List, CheckSquare, Square
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StatusFilter, SortOption, MyAppsStats } from "../../types/myAppsTypes";
import type { InstalledApp } from "@/types/marketplace";

interface MyAppsFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  apps: InstalledApp[];
  filteredCount: number;
  stats: MyAppsStats;
  isAllVisibleSelected: boolean;
  onToggleSelectAllVisible: () => void;
}

export const MyAppsFiltersBar: React.FC<MyAppsFiltersBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  apps,
  filteredCount,
  stats,
  isAllVisibleSelected,
  onToggleSelectAllVisible,
}) => {
  const hasCancelled = apps.some((a) => a.status === "CANCELLED");
  const hasExpired = apps.some((a) => a.status === "EXPIRED");

  return (
    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث بالاسم، الفئة، أو الوصف..."
          className="h-10 pr-10 pl-10 rounded-xl bg-card border-border/40 text-xs sm:text-sm focus-visible:ring-primary/20"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Status Segmented Buttons */}
      <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0 text-xs font-semibold">
        <button
          type="button"
          onClick={() => onStatusFilterChange("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all",
            statusFilter === "ALL" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          الكل ({apps.length})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("ACTIVE")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
            statusFilter === "ACTIVE" ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckCircle2 size={12} />
          النشطة ({stats.active})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("TRIAL")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
            statusFilter === "TRIAL" ? "bg-background text-amber-600 dark:text-amber-400 shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock size={12} />
          تجريبية ({stats.trial})
        </button>
        {hasCancelled && (
          <button
            type="button"
            onClick={() => onStatusFilterChange("CANCELLED")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              statusFilter === "CANCELLED" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            ملغاة ({apps.filter((a) => a.status === "CANCELLED").length})
          </button>
        )}
        {hasExpired && (
          <button
            type="button"
            onClick={() => onStatusFilterChange("EXPIRED")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              statusFilter === "EXPIRED" ? "bg-background text-destructive shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            منتهية ({apps.filter((a) => a.status === "EXPIRED").length})
          </button>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/40 bg-card text-xs font-bold text-muted-foreground shrink-0">
        <ArrowUpDown size={13} className="text-muted-foreground shrink-0" />
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortOption)}
          className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
        >
          <option value="newest">الأحدث تثبيتاً</option>
          <option value="name">أبجدياً (أ-ي)</option>
          <option value="usage">الأعلى استهلاكاً</option>
          <option value="trial_ending">أقرب لانتهاء التجربة</option>
        </select>
      </div>

      {/* View Mode Switcher */}
      <div className="hidden sm:flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0">
        <button
          type="button"
          data-testid="grid-view-btn"
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
          title="عرض شبكي (Grid View)"
        >
          <LayoutGrid size={15} />
        </button>
        <button
          type="button"
          data-testid="list-view-btn"
          onClick={() => onViewModeChange("list")}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            viewMode === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
          title="عرض قائمة (List View)"
        >
          <List size={15} />
        </button>
      </div>

      {/* Bulk Select Visible */}
      {filteredCount > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleSelectAllVisible}
          data-testid="select-all-btn"
          className={cn(
            "h-10 rounded-xl text-xs font-bold gap-1.5 px-3 border-border/40 transition-all shrink-0",
            isAllVisibleSelected
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-muted-foreground hover:text-foreground bg-card"
          )}
          title={isAllVisibleSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
        >
          {isAllVisibleSelected ? (
            <CheckSquare size={14} className="text-primary" />
          ) : (
            <Square size={14} />
          )}
          <span className="hidden sm:inline">
            {isAllVisibleSelected ? "إلغاء التحديد" : "تحديد الكل"}
          </span>
        </Button>
      )}
    </div>
  );
};
