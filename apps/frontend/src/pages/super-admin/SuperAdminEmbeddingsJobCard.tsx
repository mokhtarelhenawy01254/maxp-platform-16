import React from "react";
import { Clock, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

export interface JobState {
  status: "idle" | "running" | "done" | "error";
  started_at: number | null;
  finished_at: number | null;
  total: number;
  done: number;
  errors: number;
  company_id: string | null;
  last_error: string | null;
  last_db_update: string | null;
}

export function fmtTs(ts: number | null, iso?: string | null): string {
  const d = ts ? new Date(ts * 1000) : iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fmtDuration(start: number | null, end: number | null): string {
  if (!start || !end) return "";
  const secs = Math.round(end - start);
  if (secs < 60) return `${secs}ث`;
  return `${Math.floor(secs / 60)}د ${secs % 60}ث`;
}

export function nextScheduledTime(hour: number, minute: number): string {
  const now = new Date();
  const cairo = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const next = new Date(cairo);
  next.setHours(hour, minute, 0, 0);
  if (next <= cairo) next.setDate(next.getDate() + 1);
  return next.toLocaleString("ar-EG", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_CONFIG = {
  idle:    { label: "في الانتظار",  color: "bg-muted text-muted-foreground border-border/60", icon: <Clock className="size-3" /> },
  running: { label: "جارٍ الآن",   color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20", icon: <RefreshCw className="size-3 animate-spin" /> },
  done:    { label: "اكتمل",        color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20", icon: <CheckCircle className="size-3" /> },
  error:   { label: "خطأ",          color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20", icon: <AlertCircle className="size-3" /> },
};

export function JobCard({
  job,
  scheduleHour,
  scheduleMinute,
}: {
  job: JobState | undefined;
  scheduleHour: number;
  scheduleMinute: number;
}) {
  const statusCfg = STATUS_CONFIG[job?.status ?? "idle"];
  const isRunning = job?.status === "running";
  const lastRunDisplay = fmtTs(job?.started_at ?? null, null);
  const lastRunFallback = !job?.started_at && job?.last_db_update
    ? `آخر تحديث: ${fmtTs(null, job.last_db_update)}`
    : null;

  return (
    <div className="rounded-lg border border-border/70 bg-card/60 p-3 space-y-2.5">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">حالة المهمة المجدولة</span>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono border", statusCfg.color)}>
          {statusCfg.icon}
          {statusCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-md bg-muted/20 border border-border/40 p-2">
          <p className="text-[10px] text-muted-foreground">الحالة</p>
          <p className="font-semibold text-foreground text-xs mt-0.5">{statusCfg.label}</p>
        </div>
        <div className="rounded-md bg-muted/20 border border-border/40 p-2">
          <p className="text-[10px] text-muted-foreground">آخر تشغيل</p>
          <p className="font-mono text-xs text-foreground truncate mt-0.5">{lastRunFallback || lastRunDisplay}</p>
        </div>
        <div className="rounded-md bg-muted/20 border border-border/40 p-2">
          <p className="text-[10px] text-muted-foreground">انتهى في</p>
          <p className="font-mono text-xs text-foreground truncate mt-0.5">
            {fmtTs(job?.finished_at ?? null, null)}
            {job?.started_at && job?.finished_at ? (
              <span className="text-muted-foreground mr-1 text-[10px]">
                ({fmtDuration(job.started_at, job.finished_at)})
              </span>
            ) : null}
          </p>
        </div>
        <div className="rounded-md bg-muted/20 border border-border/40 p-2">
          <p className="text-[10px] text-muted-foreground">الموعد القادم</p>
          <p className="font-mono text-xs text-foreground truncate mt-0.5">{nextScheduledTime(scheduleHour, scheduleMinute)}</p>
        </div>
      </div>

      {isRunning && job && job.total > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
            <span>تم: {job.done} / {job.total}</span>
            <span>أخطاء: {job.errors}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${Math.round((job.done / job.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {job?.last_error && (
        <p className="text-[11px] font-mono text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
          آخر خطأ: {job.last_error}
        </p>
      )}
    </div>
  );
}
