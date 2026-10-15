import React from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type { Task, TaskStatus } from "../types";

interface TodayTasksFocusStripProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onOpenTaskDetails: (task: Task) => void;
  onSelectTodayFilter?: () => void;
}

export const TodayTasksFocusStrip: React.FC<TodayTasksFocusStripProps> = ({
  tasks,
  onTaskStatusChange,
  onOpenTaskDetails,
  onSelectTodayFilter,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter tasks that are due today or overdue & still open
  const todayTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = t.dueDate.slice(0, 10);
      const isOpen = t.status !== "completed" && t.status !== "cancelled";
      return due === todayStr || (due < todayStr && isOpen);
    });
  }, [tasks, todayStr]);

  const completedTodayCount = todayTasks.filter((t) => t.status === "completed").length;
  const pendingTodayCount = todayTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;

  if (todayTasks.length === 0) {
    return null;
  }

  const allDone = pendingTodayCount === 0 && todayTasks.length > 0;

  return (
    <section
      aria-label="مهام اليوم"
      className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.04] via-card to-card p-3 sm:p-3.5 shadow-sm transition-all"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Header / counter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {allDone ? (
              <Sparkles className="size-4 text-emerald-500 animate-spin-slow" />
            ) : (
              <Flame className="size-4 text-amber-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                مهام اليوم المستحقة
              </h2>
              <Badge
                variant="outline"
                className={`rounded-full px-2 py-0 text-[11px] font-semibold ${
                  allDone
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-primary/25 bg-primary/10 text-primary"
                }`}
              >
                {completedTodayCount} من {todayTasks.length} مكتمل
              </Badge>
            </div>
          </div>
        </div>

        {/* View all today action */}
        {onSelectTodayFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSelectTodayFilter}
            className="h-7 gap-1 text-xs text-primary hover:text-primary/80 self-start sm:self-auto"
          >
            <span>عرض كل مهام اليوم ({todayTasks.length})</span>
            <ArrowRight className="size-3 rtl:rotate-180" />
          </Button>
        ) : null}
      </div>

      {/* Task pills list */}
      <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {todayTasks.slice(0, 6).map((task) => {
          const isDone = task.status === "completed";
          const isOverdue = task.dueDate && task.dueDate.slice(0, 10) < todayStr && !isDone;

          return (
            <div
              key={task.id}
              className={`group flex items-center justify-between gap-2 rounded-xl border p-2 transition-all ${
                isDone
                  ? "border-border/40 bg-muted/30 opacity-70"
                  : isOverdue
                  ? "border-rose-500/25 bg-rose-500/[0.03] hover:border-rose-500/40"
                  : "border-border/60 bg-card hover:border-primary/30 hover:bg-card/90"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onTaskStatusChange(
                      task.id,
                      isDone ? "in_progress" : "completed",
                    )
                  }
                  title={isDone ? "تعليم كغير مكتمل" : "إنجاز المهمة الآن"}
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                >
                  {isDone ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <Circle className="size-4 hover:scale-110 transition-transform" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTaskDetails(task)}
                  className="min-w-0 flex-1 text-right focus:outline-none"
                >
                  <p
                    className={`truncate text-xs font-medium transition-colors ${
                      isDone
                        ? "line-through text-muted-foreground"
                        : "text-foreground group-hover:text-primary"
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {task.projectName ? (
                      <span className="truncate max-w-[120px]">{task.projectName}</span>
                    ) : null}
                    {task.assignedToName ? (
                      <>
                        <span>•</span>
                        <span className="truncate">{task.assignedToName}</span>
                      </>
                    ) : null}
                  </div>
                </button>
              </div>

              {isOverdue ? (
                <span className="shrink-0 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                  متأخرة
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
