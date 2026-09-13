import React from "react";
import { Search, X, Plus, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
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
      {/* 1. Diagnostics Banner (Image 1 Style: > ⚠️ Skill diagnostics: ...) */}
      <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300 font-mono">
        <div className="flex items-center gap-2">
          <span>&gt;</span>
          <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-semibold">
            تشخيص المهارات: {totalCount} مهارة معتمدة ({equippedCount} مجهزة ومفعلة للوكلاء)، 0 أخطاء تكامل
          </span>
        </div>
        <span className="text-[0.7rem] text-amber-700 dark:text-amber-400/80 hidden sm:inline">
          نواة MaxP Core 2026
        </span>
      </div>

      {/* 2. Top Header Row: Title + Installed/Uninstalled Switcher + Search + New */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Title + Installed vs Uninstalled Segmented Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            مستودع المهارات
          </h2>

          {/* Distinction Filter Pills: Installed vs Uninstalled vs All */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60 text-xs">
            {/* Installed Pill */}
            <button
              type="button"
              onClick={() => onInstallFilterChange("installed")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                installFilter === "installed"
                  ? "bg-card text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>المثبتة</span>
              <span className="font-mono text-[0.7rem] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {equippedCount}
              </span>
            </button>

            {/* Uninstalled / Available Pill */}
            <button
              type="button"
              onClick={() => onInstallFilterChange("uninstalled")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                installFilter === "uninstalled"
                  ? "bg-card text-primary border border-primary/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>المتاحة للتثبيت</span>
              <span className="font-mono text-[0.7rem] px-1.5 py-0.2 rounded-md bg-primary/10 text-primary">
                {uninstalledCount}
              </span>
            </button>

            {/* All Pill */}
            <button
              type="button"
              onClick={() => onInstallFilterChange("all")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                installFilter === "all"
                  ? "bg-card text-foreground border border-border/80 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>الكل</span>
              <span className="font-mono text-[0.7rem] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground">
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
              className="h-8 border-border/80 bg-muted/30 pr-8 pl-7 text-xs focus-visible:ring-1"
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/80 rounded-lg"
            title="تحديث القائمة"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* + New Button (Image 1 Style) */}
          <Button
            onClick={onNewSkill}
            className="h-8 px-3 text-xs font-bold gap-1 bg-foreground text-background hover:bg-foreground/90 rounded-lg shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>مهارة جديدة</span>
          </Button>
        </div>
      </div>

      {/* 3. Minimalist Category Tabs with Active Underline (Image 2 Style) */}
      <div className="flex items-center gap-4 overflow-x-auto border-b border-border/60 pb-px scrollbar-none text-xs">
        {verticals.map((v) => {
          const cfg = VERTICAL_CONFIG[v];
          const isSelected = selectedVertical === v;
          const count = verticalCounts[v] || 0;

          return (
            <button
              key={v}
              onClick={() => onSelectVertical(v)}
              className={cn(
                "group inline-flex items-center gap-1.5 whitespace-nowrap pb-2.5 font-bold transition-all shrink-0 relative",
                isSelected
                  ? "text-foreground font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{cfg.labelAr}</span>
              <span
                className={cn(
                  "font-mono text-[0.7rem]",
                  isSelected ? "text-foreground" : "text-muted-foreground/70"
                )}
              >
                ({count})
              </span>

              {/* Active Underline Indicator */}
              {isSelected && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
