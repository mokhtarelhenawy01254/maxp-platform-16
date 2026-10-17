import React from "react";
import { Search, X, RefreshCw, AlertTriangle, Lock, Unlock, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ToolInstallFilter,
  ToolSideEffectFilter,
  KNOWN_TOOL_GROUPS,
} from "./types";

interface ToolFilterBarProps {
  totalCount: number;
  equippedCount: number;
  unassignedCount: number;
  query: string;
  onQueryChange: (q: string) => void;
  selectedGroup: string;
  onSelectGroup: (g: string) => void;
  installFilter: ToolInstallFilter;
  onInstallFilterChange: (f: ToolInstallFilter) => void;
  sideEffectFilter: ToolSideEffectFilter;
  onSideEffectFilterChange: (s: ToolSideEffectFilter) => void;
  groupCounts: Record<string, number>;
  onRefresh: () => void;
  loading: boolean;
}

export const ToolFilterBar: React.FC<ToolFilterBarProps> = ({
  totalCount,
  equippedCount,
  unassignedCount,
  query,
  onQueryChange,
  selectedGroup,
  onSelectGroup,
  installFilter,
  onInstallFilterChange,
  sideEffectFilter,
  onSideEffectFilterChange,
  groupCounts,
  onRefresh,
  loading,
}) => {
  // Ordered groups for the horizontal tabs
  const groupKeys = [
    "all",
    "order",
    "product",
    "customer",
    "inventory",
    "sales",
    "shipping",
    "facebook",
    "smart_seller",
    "medical",
    "hotel",
    "governance",
    "knowledge_base",
    "hr",
    "system",
    "mcp",
    "other",
  ];

  return (
    <div className="space-y-3">
      {/* 1. Diagnostics Banner */}
      <div className="flex items-center justify-between rounded-xl bg-card border border-border/70 px-3.5 py-2 text-xs font-mono shadow-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
          <span className="font-semibold text-foreground">
            تشخيص الأدوات: {totalCount} أداة برمجية معتمدة ({equippedCount} مجهزة للوكلاء)
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          نواة MaxP Core 2026
        </span>
      </div>

      {/* 2. Top Header Row: Title + Equipped/Available Pills + Side-Effects Pills + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        {/* Title + Equipped vs Available Segmented Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center text-foreground shrink-0 shadow-xs">
              <Wrench className="size-3.5 text-primary" />
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              مستودع الأدوات البرمجية
            </h2>
          </div>

          {/* Distinction Filter Pills: Equipped vs Available vs All */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
            {/* Equipped Pill */}
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
              <span>المجهزة</span>
              <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 tabular-nums">
                {equippedCount}
              </span>
            </button>

            {/* Unassigned / Available Pill */}
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
              <span>المتاحة للتجهيز</span>
              <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-primary/10 text-primary tabular-nums">
                {unassignedCount}
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

          {/* Side Effects Segmented Pills (Read vs Write vs All) */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => onSideEffectFilterChange("all")}
              className={cn(
                "px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer active:scale-[0.98]",
                sideEffectFilter === "all"
                  ? "bg-card text-foreground shadow-xs font-semibold border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              كافة التأثيرات
            </button>
            <button
              type="button"
              onClick={() => onSideEffectFilterChange("read")}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer active:scale-[0.98]",
                sideEffectFilter === "read"
                  ? "bg-card text-sky-600 dark:text-sky-400 shadow-xs font-semibold border border-sky-500/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Unlock className="size-2.5" />
              <span>قراءة</span>
            </button>
            <button
              type="button"
              onClick={() => onSideEffectFilterChange("write")}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer active:scale-[0.98]",
                sideEffectFilter === "write"
                  ? "bg-card text-amber-600 dark:text-amber-400 shadow-xs font-semibold border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Lock className="size-2.5" />
              <span>تنفيذ/كتابة</span>
            </button>
          </div>
        </div>

        {/* Right Actions: Search + Refresh */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-56 lg:w-64">
            <Search className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="بحث في أسماء ووظائف الأدوات..."
              className="h-8 border-border/80 bg-background/50 pr-8 pl-7 text-xs focus-visible:ring-1 font-mono"
            />
            {query && (
              <button
                type="button"
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/80 rounded-lg cursor-pointer active:scale-[0.98]"
            title="تحديث الأدوات"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 3. Category Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto border-b border-border/60 pb-1 scrollbar-none text-xs">
        {groupKeys.map((key) => {
          const meta = KNOWN_TOOL_GROUPS[key] || {
            key,
            labelAr: key,
            icon: "",
            colorClass: "text-muted-foreground",
          };
          const isSelected = selectedGroup === key;
          const count = groupCounts[key] || 0;

          // Don't show tabs with 0 tools (except 'all')
          if (key !== "all" && count === 0) return null;

          return (
            <button
              key={key}
              onClick={() => onSelectGroup(key)}
              className={cn(
                "group inline-flex items-center gap-1.5 whitespace-nowrap pb-1.5 font-medium transition-all shrink-0 relative cursor-pointer active:scale-[0.98]",
                isSelected
                  ? "text-foreground font-bold border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{meta.labelAr}</span>
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
