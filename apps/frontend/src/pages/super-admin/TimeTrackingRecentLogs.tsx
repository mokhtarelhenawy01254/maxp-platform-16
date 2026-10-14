import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, DollarSign } from "lucide-react";
import { formatDuration, getTaskTypeColor } from "./TimeTrackingLiveTimers";

export interface TimeLog {
  id: string;
  taskId: string;
  taskTitle: string;
  taskType: string;
  taskPriority: string;
  taskStatus: string;
  projectName: string | null;
  projectColor: string | null;
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  startTime: string;
  endTime: string;
  duration: number;
  durationHours: string;
  description: string | null;
  isBillable: boolean;
}

interface TimeTrackingRecentLogsProps {
  timeLogs: TimeLog[];
}

export function TimeTrackingRecentLogs({ timeLogs }: TimeTrackingRecentLogsProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <h2 className="text-xs font-semibold text-foreground font-mono">
            سجلات الوقت الأخيرة
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {timeLogs.length} سجل
        </span>
      </div>

      <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
        {timeLogs.length > 0 ? (
          timeLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/super-admin/dev-tasks/${log.taskId}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs text-foreground truncate">
                    {log.taskTitle}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {log.memberName}
                  </p>
                </div>
                <div className="text-left font-mono shrink-0">
                  <p className="font-bold text-xs text-foreground tabular-nums">
                    {formatDuration(log.duration)}
                  </p>
                  {log.isBillable && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      <DollarSign className="size-2.5 mr-0.5" />
                      فوترة
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                <span
                  className={`px-1 py-0.5 rounded border ${getTaskTypeColor(
                    log.taskType,
                  )}`}
                >
                  {log.taskType}
                </span>
                {log.projectName && (
                  <span className="px-1 py-0.5 rounded bg-muted border border-border/40 font-sans">
                    {log.projectName}
                  </span>
                )}
                <span className="tabular-nums">
                  {new Date(log.startTime).toLocaleString("ar-EG", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center py-10 text-xs text-muted-foreground font-mono">
            لا توجد سجلات في هذه الفترة
          </p>
        )}
      </div>
    </div>
  );
}
