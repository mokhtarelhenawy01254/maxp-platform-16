import React from "react";
import { PlusIcon, TargetIcon, ZapIcon } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type { GoalOption } from "../types";

export interface GoalProgressStripProps {
  goals: GoalOption[];
  onOpenCreateGoal: () => void;
}

const goalTypeBadgeMap: Record<string, { label: string; className: string }> = {
  DAILY: { label: "يومي", className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  WEEKLY: { label: "أسبوعي", className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  MONTHLY: { label: "شهري", className: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  STRATEGIC: { label: "استراتيجي", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  COMPANY: { label: "شركة", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  DEPARTMENT: { label: "قسم", className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  PROJECT: { label: "مشروع", className: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  EMPLOYEE: { label: "موظف", className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};

export const GoalProgressStrip: React.FC<GoalProgressStripProps> = ({
  goals,
  onOpenCreateGoal,
}) => {
  if (!goals || goals.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-card/60 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TargetIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">
              أهداف العمل ومؤشرات الأداء
            </p>
            <p className="text-[11px] text-muted-foreground">
              اربط مهامك اليومية بأهداف محددة وتتبع التقدم التلقائي من النظام.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenCreateGoal}
          className="h-7 shrink-0 rounded-lg border-primary/30 bg-primary/5 px-2.5 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <PlusIcon className="mr-1 size-3.5" />
          أنشئ هدف
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <TargetIcon className="size-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            أهداف العمل النشطة ({goals.length})
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenCreateGoal}
          className="h-6 gap-1 px-2 text-[11px] font-medium text-primary hover:bg-primary/10 hover:text-primary"
        >
          <PlusIcon className="size-3" />
          أنشئ هدف
        </Button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
        {goals.map((goal) => {
          const rawProgress = typeof goal.progress === "number" ? goal.progress : 0;
          const progress = Math.min(100, Math.max(0, Math.round(rawProgress)));
          const typeMeta = goalTypeBadgeMap[goal.goalType] || {
            label: goal.goalType,
            className: "border-border/60 bg-muted/50 text-foreground",
          };

          const targetNum = goal.targetValue ?? goal.target ?? 0;
          const currentNum = goal.currentValue ?? 0;
          const unitStr = goal.unit ? ` ${goal.unit}` : "";

          return (
            <div
              key={goal.id}
              className="flex min-w-[240px] max-w-[300px] shrink-0 flex-col justify-between rounded-xl border border-border/60 bg-card/80 p-2.5 shadow-sm transition-all hover:border-border"
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-1.5">
                  <span
                    className="truncate text-xs font-medium text-foreground"
                    title={goal.title}
                  >
                    {goal.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 rounded-full px-1.5 py-0 text-[10px] font-medium leading-4 ${typeMeta.className}`}
                  >
                    {typeMeta.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="tabular-nums font-mono font-medium text-foreground">
                    {currentNum} / {targetNum}
                    <span className="text-muted-foreground">{unitStr}</span>
                  </span>
                  <span className="tabular-nums font-mono font-semibold text-primary">
                    {progress}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
