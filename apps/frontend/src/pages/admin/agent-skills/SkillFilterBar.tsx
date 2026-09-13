import React from "react";
import { Search, X, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SkillVertical, VERTICAL_CONFIG } from "./types";

interface SkillFilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedVertical: SkillVertical;
  onSelectVertical: (v: SkillVertical) => void;
  safetyFilter: "all" | "autonomous" | "approval" | "equipped";
  onSafetyFilterChange: (f: "all" | "autonomous" | "approval" | "equipped") => void;
  viewMode: "grid" | "matrix";
  onViewModeChange: (m: "grid" | "matrix") => void;
  verticalCounts: Record<SkillVertical, number>;
  totalFiltered: number;
}

export const SkillFilterBar: React.FC<SkillFilterBarProps> = ({
  query,
  onQueryChange,
  selectedVertical,
  onSelectVertical,
  safetyFilter,
  onSafetyFilterChange,
  viewMode,
  onViewModeChange,
  verticalCounts,
  totalFiltered,
}) => {
  const verticals: SkillVertical[] = [
    "all",
    "sales",
    "support",
    "medical",
    "hotels",
    "education",
    "marketing",
    "inventory",
    "management",
  ];

  return (
    <div className="space-y-3">
      {/* 1. Category Vertical Pills - Horizontal Scrollable */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
        {verticals.map((v) => {
          const cfg = VERTICAL_CONFIG[v];
          const isSelected = selectedVertical === v;
          const count = verticalCounts[v] || 0;

          return (
            <button
              key={v}
              onClick={() => onSelectVertical(v)}
              className={cn(
                "group inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs scale-100"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/80"
              )}
            >
              <span className="text-sm leading-none">{cfg.icon}</span>
              <span>{cfg.labelAr}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[0.65rem] font-mono",
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground group-hover:bg-background"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Search & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-border/70 bg-card/60 p-2 sm:p-2.5 backdrop-blur-sm">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="ابحث بالاسم، الوصف، أو أسماء الأدوات..."
            className="h-9 border-none bg-muted/40 pr-9 pl-8 text-xs sm:text-sm focus-visible:ring-1"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filters & View Switchers */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Safety Filter Toggle */}
          <div className="flex items-center rounded-xl bg-muted/50 p-0.5 border border-border/60">
            <button
              onClick={() => onSafetyFilterChange("all")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                safetyFilter === "all"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              الكل
            </button>
            <button
              onClick={() => onSafetyFilterChange("autonomous")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors flex items-center gap-1",
                safetyFilter === "autonomous"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="مهارات تنفذ تلقائياً"
            >
              <span>⚡</span>
              <span className="hidden md:inline">تشغيل ذاتي</span>
            </button>
            <button
              onClick={() => onSafetyFilterChange("approval")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors flex items-center gap-1",
                safetyFilter === "approval"
                  ? "bg-background text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="مهارات تتطلب موافقة التاجر"
            >
              <span>🛡️</span>
              <span className="hidden md:inline">موافقة التاجر</span>
            </button>
            <button
              onClick={() => onSafetyFilterChange("equipped")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors flex items-center gap-1",
                safetyFilter === "equipped"
                  ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="مهارات مجهزة لوكلاء حاليين"
            >
              <span>🤖</span>
              <span className="hidden md:inline">مسندة</span>
            </button>
          </div>

          {/* View Mode Toggle: Grid vs Matrix */}
          <div className="flex items-center rounded-xl bg-muted/50 p-0.5 border border-border/60">
            <button
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "flex size-7 items-center justify-center rounded-lg transition-colors",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="عرض الكروت الذكية (Grid)"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange("matrix")}
              className={cn(
                "flex size-7 items-center justify-center rounded-lg transition-colors",
                viewMode === "matrix"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="عرض المصفوفة الفائقة (Matrix View)"
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
