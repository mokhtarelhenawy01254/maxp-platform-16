import React from "react";
import { Search, X, RefreshCw, AlertTriangle, Lock, Unlock } from "lucide-react";
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
      {/* 1. Diagnostics Banner (Image 1 Style: > ⚠️ Tool diagnostics: ...) */}
      <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300 font-mono">
        <div className="flex items-center gap-2">
          <span>&gt;</span>
          <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-semibold">
            تشخيص الأدوات: {totalCount} أداة برمجية معتمدة ({equippedCount} مجهزة ومفعلة للوكلاء)، 0 أخطاء تكامل
          </span>
        </div>
        <span className="text-[0.7rem] text-amber-700 dark:text-amber-400/80 hidden sm:inline">
          نواة MaxP Core 2026
        </span>
      </div>

      {/* 2. Top Header Row: Title + Equipped/Available Pills + Side-Effects Pills + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        {/* Title + Equipped vs Available Segmented Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            مستودع الأدوات البرمجية
          </h2>

          {/* Distinction Filter Pills: Equipped vs Available vs All */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60 text-xs">
            {/* Equipped Pill */}
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
              <span>المجهزة للوكلاء</span>
              <span className="font-mono text-[0.7rem] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {equippedCount}
              </span>
            </button>

            {/* Unassigned / Available Pill */}
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
              <span>المتاحة للتجهيز</span>
              <span className="font-mono text-[0.7rem] px-1.5 py-0.2 rounded-md bg-primary/10 text-primary">
                {unassignedCount}
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

          {/* Side Effects Segmented Pills (Read vs Write vs All) */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/30 border border-border/50 text-[0.7rem]">
            <button
              type="button"
              onClick={() => onSideEffectFilterChange("all")}
              className={cn(
                "px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer",
                sideEffectFilter === "all"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              كافة التأثيرات
            </button>
            <button
              type="button"
              onClick={() => onSideEffectFilterChange("read")}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer",
                sideEffectFilter === "read"
                  ? "bg-card text-sky-600 dark:text-sky-400 shadow-2xs font-bold"
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
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer",
                sideEffectFilter === "write"
                  ? "bg-card text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
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
              className="h-8 border-border/80 bg-muted/30 pr-8 pl-7 text-xs focus-visible:ring-1"
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground border-border/80 rounded-lg cursor-pointer"
            title="تحديث الأدوات"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 3. Minimalist Category Tabs with Active Underline (Image 2 Style) */}
      <div className="flex items-center gap-4 overflow-x-auto border-b border-border/60 pb-px scrollbar-none text-xs">
        {groupKeys.map((key) => {
          const meta = KNOWN_TOOL_GROUPS[key] || {
            key,
            labelAr: key,
            icon: "🔧",
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
                "group inline-flex items-center gap-1.5 whitespace-nowrap pb-2.5 font-bold transition-all shrink-0 relative cursor-pointer",
                isSelected
                  ? "text-foreground font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{meta.icon}</span>
              <span>{meta.labelAr}</span>
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
