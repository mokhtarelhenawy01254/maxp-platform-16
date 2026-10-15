import React from "react";
import { Calendar, Clock, TrendingUp, AlertTriangle } from "lucide-react";

export interface ScheduledOrderStats {
  total: number;
  pending: number;
  upcoming: number;
  overdue: number;
}

interface ScheduledOrderStatsStripProps {
  stats: ScheduledOrderStats;
}

export const ScheduledOrderStatsStrip: React.FC<ScheduledOrderStatsStripProps> = ({ stats }) => {
  return (
    <section className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-muted/10">
      <div className="p-3 rounded-md border border-border/60 bg-card">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-medium">إجمالي الطلبات المجدولة</span>
          <Calendar className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-1 text-base sm:text-lg font-bold font-mono text-foreground tabular-nums">
          {(stats?.total ?? 0).toLocaleString()}
        </div>
      </div>

      <div className="p-3 rounded-md border border-border/60 bg-card">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-medium">قيد الانتظار</span>
          <Clock className="h-4 w-4 text-blue-500" />
        </div>
        <div className="mt-1 text-base sm:text-lg font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
          {(stats?.pending ?? 0).toLocaleString()}
        </div>
      </div>

      <div className="p-3 rounded-md border border-border/60 bg-card">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-medium">قادمة (7 أيام)</span>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="mt-1 text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
          {(stats?.upcoming ?? 0).toLocaleString()}
        </div>
      </div>

      <div className="p-3 rounded-md border border-border/60 bg-card">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-medium">متأخرة</span>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="mt-1 text-base sm:text-lg font-bold font-mono text-destructive tabular-nums">
          {(stats?.overdue ?? 0).toLocaleString()}
        </div>
      </div>
    </section>
  );
};
