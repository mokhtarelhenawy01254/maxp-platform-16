import React from "react";
import { AlertTriangle, Clock, PauseCircle, ShieldAlert } from "lucide-react";

export interface TaskEscalationBadgeProps {
  escalationLevel?: number | null;
  dueDate?: string | Date | null;
  status?: string | null;
  snoozedUntil?: string | Date | null;
  className?: string;
}

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED"]);

export const TaskEscalationBadge: React.FC<TaskEscalationBadgeProps> = ({
  escalationLevel = 0,
  dueDate,
  status,
  snoozedUntil,
  className = "",
}) => {
  const normalizedStatus = String(status || "").toUpperCase();
  if (TERMINAL_STATUSES.has(normalizedStatus)) {
    return null;
  }

  const now = Date.now();
  const snoozeMs = snoozedUntil ? new Date(snoozedUntil).getTime() : NaN;
  if (Number.isFinite(snoozeMs) && snoozeMs > now) {
    return (
      <span
        data-testid="task-escalation-badge"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border ${className}`}
        title={`مؤجل حتى ${new Date(snoozeMs).toLocaleDateString("ar-EG")}`}
      >
        <PauseCircle className="w-3 h-3" />
        <span>مؤجل</span>
      </span>
    );
  }

  const level = Number(escalationLevel || 0);
  const dueMs = dueDate ? new Date(dueDate).getTime() : NaN;
  const isOverdue = Number.isFinite(dueMs) && dueMs < now;

  if (level >= 3) {
    return (
      <span
        data-testid="task-escalation-badge"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/15 text-destructive border border-destructive/30 ${className}`}
      >
        <ShieldAlert className="w-3 h-3" />
        <span>L3 • تصعيد للمالك</span>
      </span>
    );
  }

  if (level === 2) {
    return (
      <span
        data-testid="task-escalation-badge"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30 ${className}`}
      >
        <AlertTriangle className="w-3 h-3" />
        <span>L2 • تصعيد للمدير</span>
      </span>
    );
  }

  if (level === 1) {
    return (
      <span
        data-testid="task-escalation-badge"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 ${className}`}
      >
        <Clock className="w-3 h-3" />
        <span>L1 • تذكير متأخر</span>
      </span>
    );
  }

  if (isOverdue) {
    const overdueHours = Math.max(1, Math.floor((now - dueMs) / (60 * 60 * 1000)));
    const label = overdueHours >= 24 ? `متأخرة ${Math.floor(overdueHours / 24)}ي` : `متأخرة ${overdueHours}س`;
    return (
      <span
        data-testid="task-escalation-badge"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 ${className}`}
      >
        <Clock className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  }

  return null;
};

export default TaskEscalationBadge;
