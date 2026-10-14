import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "../../components/ui/input";

interface DevGoalsFilterBarProps {
  search: string;
  setSearch: (s: string) => void;
  filterType: string;
  setFilterType: (t: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterPriority: string;
  setFilterPriority: (p: string) => void;
  filterQuarter: string;
  setFilterQuarter: (q: string) => void;
}

export function DevGoalsFilterBar({
  search,
  setSearch,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
  filterQuarter,
  setFilterQuarter,
}: DevGoalsFilterBarProps) {
  const hasActiveFilters = Boolean(
    filterType || filterStatus || filterPriority || filterQuarter || search,
  );

  return (
    <div className="bg-card rounded-lg border border-border/70 p-2.5 sm:p-3 shadow-xs">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="بحث في الأهداف والمسؤولين..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-3 pr-8 text-xs font-mono bg-background border-border/70"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-8 border border-border/70 rounded-md px-2 text-xs bg-background text-foreground font-mono"
        >
          <option value="">كل الأنواع</option>
          <option value="COMPANY">هدف شركة</option>
          <option value="TEAM">هدف فريق</option>
          <option value="INDIVIDUAL">هدف فردي</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-8 border border-border/70 rounded-md px-2 text-xs bg-background text-foreground font-mono"
        >
          <option value="">كل الحالات</option>
          <option value="ACTIVE">نشط</option>
          <option value="COMPLETED">مكتمل</option>
          <option value="ON_HOLD">معلق</option>
          <option value="CANCELLED">ملغي</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-8 border border-border/70 rounded-md px-2 text-xs bg-background text-foreground font-mono"
        >
          <option value="">كل الأولويات</option>
          <option value="LOW">منخفضة</option>
          <option value="MEDIUM">متوسطة</option>
          <option value="HIGH">عالية</option>
          <option value="CRITICAL">حرجة</option>
        </select>

        <select
          value={filterQuarter}
          onChange={(e) => setFilterQuarter(e.target.value)}
          className="h-8 border border-border/70 rounded-md px-2 text-xs bg-background text-foreground font-mono"
        >
          <option value="">كل الفترات (Quarters)</option>
          <option value="Q1-2026">Q1 2026</option>
          <option value="Q2-2026">Q2 2026</option>
          <option value="Q3-2026">Q3 2026</option>
          <option value="Q4-2026">Q4 2026</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setFilterType("");
              setFilterStatus("");
              setFilterPriority("");
              setFilterQuarter("");
              setSearch("");
            }}
            className="text-muted-foreground hover:text-foreground text-xs font-mono flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
          >
            <X className="size-3.5" />
            <span>إعادة ضبط</span>
          </button>
        )}
      </div>
    </div>
  );
}
