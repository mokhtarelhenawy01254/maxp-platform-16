import React from "react";
import { Search, X, Plus, RefreshCw, AlertTriangle, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SkillVertical, VERTICAL_CONFIG } from "./types";

interface SkillFilterBarProps {
  totalCount: number;
  equippedCount: number;
  uninstalledCount: number;
  query: string;
  onQueryChange: (q: string) => void;
  selectedVertical: SkillVertical;
  onSelectVertical: (v: SkillVertical) => void;
  installFilter: "all" | "installed" | "uninstalled";
  onInstallFilterChange: (f: "all" | "installed" | "uninstalled") => void;
  verticalCounts: Record<SkillVertical, number>;
  onNewSkill: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const SkillFilterBar: React.FC<SkillFilterBarProps> = ({
  totalCount,
  equippedCount,
  uninstalledCount,
  query,
  onQueryChange,
  selectedVertical,
  onSelectVertical,
  installFilter,
  onInstallFilterChange,
  verticalCounts,
  onNewSkill,
  onRefresh,
  loading,
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
      {/* 1. Diagnostics Banner */}
      <div className="flex items-center justify-between rounded-xl bg-card border border-border/70 px-3.5 py-2 text-xs font-mono shadow-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
          <span className="font-semibold text-foreground">
            تشخيص المهارات: {totalCount} مهارة معتمدة ({equippedCount} مجهزة ومفعلة للوكلاء)
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          نواة MaxP Core 2026
        </span>
      </div>

      {/* 2. Top Header Row: Title + Installed/Uninstalled Switcher + Search + New */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Title + Installed vs Uninstalled Segmented Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center text-foreground shrink-0 shadow-xs">
              <Layers className="size-3.5 text-primary" />
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              مستودع المهارات
            </h2>
          </div>

          {/* Distinction Filter Pills: Installed vs Uninstalled vs All */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
            {/* Installed Pill */}
            <button
              type="button"
              onClick={() => onInstallFilterChange("installed")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-[0.98]",
                installFilter === "installed"
                  ? "bg-card text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>المثبتة</span>
              <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 tabular-nums">
                {equippedCount}
              </span>
            </button>

            {/* Uninstalled / Available Pill */}
            <button
              type="button"
              onClick={() => onInstallFilterChange("uninstalled")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-[0.98]",
                installFilter === "uninstalled"
                  ? "bg-card text-primary border border-primary/30 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>المتاحة للتثبيت</span>
              <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-primary/10 text-primary tabular-nums">
                {uninstalledCount}
              </span>
            </button>

            {/* All Pill */}
            <button
              type="button"
              onClick={() => onInstallFilterChange("all")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-[0.98]",
                installFilter === "all"
                  ? "bg-card text-foreground border border-border/80 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>الكل</span>
              <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground tabular-nums">
                {totalCount}
              </span>
            </button>
          </div>
        </div>

        {/* Right Actions: Search + Refresh + (+ New) */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative w-48 sm:w-64">
            <Search className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="بحث في المهارات..."
              className="h-8 border-border/80 bg-background/50 pr-8 pl-7 text-xs focus-visible:ring-1 font-mono"
            />
            {query && (
              <button
                onClick={() => onQueryChange("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/80 rounded-lg active:scale-[0.98]"
            title="تحديث القائمة"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* + New Button */}
          <Button
            onClick={onNewSkill}
            className="h-8 px-3 text-xs font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs active:scale-[0.98]"
          >
            <Plus className="size-3.5" />
            <span>مهارة جديدة</span>
          </Button>
        </div>
      </div>

      {/* 3. Category Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto border-b border-border/60 pb-1 scrollbar-none text-xs">
        {verticals.map((v) => {
          const cfg = VERTICAL_CONFIG[v];
          const isSelected = selectedVertical === v;
          const count = verticalCounts[v] || 0;

          return (
            <button
              key={v}
              onClick={() => onSelectVertical(v)}
              className={cn(
                "group inline-flex items-center gap-1.5 whitespace-nowrap pb-1.5 font-medium transition-all shrink-0 relative cursor-pointer",
                isSelected
                  ? "text-foreground font-bold border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{cfg.labelAr}</span>
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  isSelected ? "text-foreground font-semibold" : "text-muted-foreground/70"
                )}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
