import React from "react";
import { Flame, Target } from "lucide-react";

export interface TaskControlBarMetricChipsProps {
  todayTasksCount?: number;
  showTodayStrip?: boolean;
  onToggleTodayStrip?: () => void;
  goalsCount?: number;
  showGoalsStrip?: boolean;
  onToggleGoalsStrip?: () => void;
}

export const TaskControlBarMetricChips: React.FC<TaskControlBarMetricChipsProps> = ({
  todayTasksCount,
  showTodayStrip,
  onToggleTodayStrip,
  goalsCount,
  showGoalsStrip,
  onToggleGoalsStrip,
}) => {
  return (
    <div className="hidden xl:flex items-center gap-1.5">
      {todayTasksCount !== undefined && (
        <button
          type="button"
          onClick={onToggleTodayStrip}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-all active:scale-[0.98] ${
            showTodayStrip
              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
          }`}
          title="تبديل عرض شريط مهام اليوم"
        >
          <Flame className="size-3.5 text-amber-500 shrink-0" />
          <span>مهام اليوم</span>
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0 text-[10px] font-bold font-mono tabular-nums">
            {todayTasksCount}
          </span>
        </button>
      )}

      {goalsCount !== undefined && (
        <button
          type="button"
          onClick={onToggleGoalsStrip}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-all active:scale-[0.98] ${
            showGoalsStrip
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
          }`}
          title="تبديل عرض شريط أهداف العمل"
        >
          <Target className="size-3.5 text-primary shrink-0" />
          <span>أهداف العمل</span>
          <span className="rounded-full bg-primary/15 px-1.5 py-0 text-[10px] font-bold font-mono tabular-nums">
            {goalsCount}
          </span>
        </button>
      )}
    </div>
  );
};
