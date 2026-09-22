import React from "react";
import {
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Table as TableIcon,
  X,
} from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { cn } from "../../../../lib/utils";
import {
  STATUS_FILTERS,
  type SortOption,
  type StatusFilter,
  type ViewMode,
} from "../types";

interface SpecialtyControlBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  statusCounts: Record<StatusFilter, number>;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
  onCreate: () => void;
  loading: boolean;
  totalCount: number;
  filteredCount: number;
}

export const SpecialtyControlBar: React.FC<SpecialtyControlBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  onCreate,
  loading,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="space-y-2.5 rounded-xl border border-border/60 bg-card p-3 shadow-xs">
      {/* Top row: Search, Sorting, View toggles & Primary Actions */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="specialties-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث بالاسم، الرابط، أو الوصف..."
            className="h-9 pr-9 pl-8 text-xs sm:text-sm rounded-lg"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="مسح البحث"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
          {/* Sort selection */}
          <div className="w-32 sm:w-36">
            <Select
              value={sortBy}
              onValueChange={(val) => onSortByChange(val as SortOption)}
            >
              <SelectTrigger className="h-9 text-xs rounded-lg">
                <SelectValue placeholder="الترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sortOrder">حسب الترتيب</SelectItem>
                <SelectItem value="name">حسب الاسم</SelectItem>
                <SelectItem value="companies">الأكثر شركات</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => onViewModeChange("grid")}
              aria-label="عرض البطاقات"
              title="عرض البطاقات"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => onViewModeChange("table")}
              aria-label="عرض الجدول"
              title="عرض الجدول"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Refresh button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 px-2.5 rounded-lg text-xs"
            aria-label="تحديث"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden md:inline mr-1">تحديث</span>
          </Button>

          {/* Create button */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onCreate}
            className="h-9 px-3 rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 ml-1" />
            إنشاء نشاط
          </Button>
        </div>
      </div>

      {/* Bottom row: Status Filter Tabs (Horizontal Scroll on Mobile) */}
      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {STATUS_FILTERS.map((filter) => {
            const count = statusCounts[filter.id] ?? 0;
            const isSelected = statusFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onStatusFilterChange(filter.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-97",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <span>{filter.label}</span>
                <Badge
                  variant={isSelected ? "outline" : "secondary"}
                  className={cn(
                    "h-4 px-1.5 text-[0.65rem] font-mono tabular-nums",
                    isSelected
                      ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Filter stats indicator */}
        {filteredCount !== totalCount && (
          <span className="hidden sm:inline-block shrink-0 text-[0.7rem] text-muted-foreground font-mono tabular-nums">
            عرض {filteredCount} من {totalCount}
          </span>
        )}
      </div>
    </div>
  );
};
