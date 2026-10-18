import React from "react";
import { Clock, Calendar } from "lucide-react";
import { useDateFormat } from "../../../../hooks/useDateFormat";
import { formatDuration, formatRelativeDays } from "./sessionCardHelpers";

export interface SessionTelemetrySectionProps {
  durationSeconds?: number;
  sessionCount?: number;
  firstSeenAt?: string | null;
  createdAt?: string;
}

export const SessionTelemetrySection: React.FC<SessionTelemetrySectionProps> = ({
  durationSeconds,
  sessionCount,
  firstSeenAt,
  createdAt,
}) => {
  const { formatDate } = useDateFormat();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {/* Time spent */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-indigo-500" />
          <span>وقت الشراء</span>
        </div>
        <div className="mt-1 font-mono font-semibold tabular-nums text-foreground">
          {formatDuration(durationSeconds)}
        </div>
      </div>

      {/* Session count */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-sky-500" />
          <span>عدد الجلسات</span>
        </div>
        <div className="mt-1 font-mono font-semibold tabular-nums text-foreground">
          {sessionCount && sessionCount > 1
            ? `${sessionCount} جلسات`
            : "الجلسة الأولى"}
        </div>
      </div>

      {/* First visit date */}
      <div className="col-span-2 sm:col-span-1 rounded-lg border border-border/60 bg-muted/20 p-2.5">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-teal-500" />
          <span>أول زيارة للمتجر</span>
        </div>
        <div className="mt-1 font-semibold text-foreground">
          {firstSeenAt ? (
            <div>
              <span className="font-mono tabular-nums">{formatDate(firstSeenAt)}</span>
              <span className="text-[10px] font-normal text-muted-foreground mr-1">
                ({formatRelativeDays(firstSeenAt)})
              </span>
            </div>
          ) : createdAt ? (
            <div>
              <span className="font-mono tabular-nums">{formatDate(createdAt)}</span>
            </div>
          ) : (
            "غير محدد"
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionTelemetrySection;
