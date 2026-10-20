import React from "react";
import { ArrowDownToLine, Trash2, History } from "lucide-react";
import type { AppHistoryStats } from "../../types/appHistoryTypes";

interface AppHistoryKpiCardsProps {
  stats: AppHistoryStats;
}

export function AppHistoryKpiCards({ stats }: AppHistoryKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-2xl border border-border/40 bg-card/60 p-3.5 sm:p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">إجمالي عمليات التثبيت</p>
          <p className="text-2xl font-black text-foreground tabular-nums font-mono">{stats.totalInstalls}</p>
        </div>
        <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
          <ArrowDownToLine className="size-5" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/60 p-3.5 sm:p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">إجمالي عمليات الإلغاء</p>
          <p className="text-2xl font-black text-foreground tabular-nums font-mono">{stats.totalUninstalls}</p>
        </div>
        <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
          <Trash2 className="size-5" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/60 p-3.5 sm:p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">إجمالي الحركات المسجلة</p>
          <p className="text-2xl font-black text-foreground tabular-nums font-mono">{stats.totalActions}</p>
        </div>
        <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
          <History className="size-5" />
        </div>
      </div>
    </div>
  );
}
