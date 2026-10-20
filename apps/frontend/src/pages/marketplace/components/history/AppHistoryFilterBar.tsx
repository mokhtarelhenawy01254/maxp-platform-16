import React from "react";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "../../../../components/ui/input";
import { cn } from "../../../../lib/utils";
import type { AppHistoryFilterType, AppHistoryStats } from "../../types/appHistoryTypes";

interface AppHistoryFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  actionFilter: AppHistoryFilterType;
  onActionFilter: (filter: AppHistoryFilterType) => void;
  stats: AppHistoryStats;
}

export function AppHistoryFilterBar({
  search,
  onSearchChange,
  actionFilter,
  onActionFilter,
  stats,
}: AppHistoryFilterBarProps) {
  return (
    <div className="p-2 sm:p-3 rounded-2xl border border-border/40 bg-card/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث باسم التطبيق، اسم الموظف المنفذ، أو البريد الإلكتروني..."
          className="pr-9 pl-3 h-10 rounded-xl border-border/40 text-xs bg-background/80"
        />
      </div>

      <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0 text-xs font-semibold self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onActionFilter("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all",
            actionFilter === "ALL"
              ? "bg-background text-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          الكل ({stats.totalActions})
        </button>
        <button
          type="button"
          onClick={() => onActionFilter("INSTALL_APP")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
            actionFilter === "INSTALL_APP"
              ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CheckCircle2 size={13} />
          <span>تثبيت ({stats.totalInstalls})</span>
        </button>
        <button
          type="button"
          onClick={() => onActionFilter("UNINSTALL_APP")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
            actionFilter === "UNINSTALL_APP"
              ? "bg-background text-rose-600 dark:text-rose-400 shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <XCircle size={13} />
          <span>إلغاء تثبيت ({stats.totalUninstalls})</span>
        </button>
      </div>
    </div>
  );
}
