import React from "react";
import { Activity, Timer } from "lucide-react";

export interface RunningTimer {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  taskId: string;
  taskTitle: string;
  taskType: string;
  startTime: string;
  elapsedMinutes: number;
}

export const getTaskTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    BUG: "bg-destructive/10 text-destructive border-destructive/20",
    FEATURE: "bg-primary/10 text-primary border-primary/20",
    ENHANCEMENT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    HOTFIX: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    SECURITY: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    REFACTOR: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  };
  return colors[type] || "bg-muted text-muted-foreground border-border/40";
};

export const formatDuration = (minutes: number): string => {
  const days = Math.floor(minutes / 1440);
  const remainingMinutes = minutes % 1440;
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "يوم" : "أيام"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "ساعة" : "ساعات"}`);
  if (mins > 0 || parts.length === 0)
    parts.push(`${mins} ${mins === 1 ? "دقيقة" : "دقائق"}`);

  return parts.join(" و ");
};

interface TimeTrackingLiveTimersProps {
  runningTimers: RunningTimer[];
}

export function TimeTrackingLiveTimers({ runningTimers }: TimeTrackingLiveTimersProps) {
  if (!runningTimers || runningTimers.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-emerald-500" />
          <h2 className="text-xs font-semibold text-foreground font-mono">النشاط الحي المباشر</h2>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
          {runningTimers.length} يعملون الآن
        </span>
      </div>

      <div className="p-3 space-y-1.5">
        {runningTimers.map((timer) => (
          <div
            key={timer.id}
            className="flex items-center justify-between p-2 rounded-md border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                {timer.memberAvatar ? (
                  <img
                    src={timer.memberAvatar}
                    alt={timer.memberName}
                    className="size-7 rounded-full border border-border"
                  />
                ) : (
                  <div className="size-7 rounded-full flex items-center justify-center bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
                    {timer.memberName.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 size-2 bg-emerald-500 rounded-full ring-2 ring-card animate-pulse" />
              </div>

              <div>
                <p className="font-medium text-xs text-foreground">
                  {timer.memberName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate max-w-md font-mono">
                  {timer.taskTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${getTaskTypeColor(
                  timer.taskType,
                )}`}
              >
                {timer.taskType}
              </span>
              <div className="flex items-center gap-1 text-xs text-foreground font-mono tabular-nums">
                <Timer className="size-3.5 text-muted-foreground" />
                <span>{formatDuration(timer.elapsedMinutes)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
