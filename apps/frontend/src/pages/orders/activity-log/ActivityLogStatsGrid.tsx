import React from "react";
import { Activity, Clock, Users, Shield } from "lucide-react";

interface ActivityLogStatsGridProps {
  totalCount: number;
  todayCount: number;
  actorsCount: number;
  displayedCount: number;
}

export const ActivityLogStatsGrid: React.FC<ActivityLogStatsGridProps> = ({
  totalCount,
  todayCount,
  actorsCount,
  displayedCount,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border/70 bg-card/40 divide-x divide-x-reverse divide-border/60">
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-muted-foreground font-medium">إجمالي الحركات</div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5 text-foreground">
            {totalCount.toLocaleString("ar-EG")}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border/60">
          <Activity className="w-4 h-4" />
        </div>
      </div>

      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-muted-foreground font-medium">حركات اليوم</div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5 text-primary">
            {todayCount.toLocaleString("ar-EG")}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-muted-foreground font-medium">الموظفون الفاعلون</div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5 text-foreground">
            {actorsCount > 0 ? actorsCount.toLocaleString("ar-EG") : "—"}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
          <Users className="w-4 h-4" />
        </div>
      </div>

      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-muted-foreground font-medium">المعروض حالياً</div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight mt-0.5 text-foreground">
            {displayedCount.toLocaleString("ar-EG")}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border/60">
          <Shield className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
