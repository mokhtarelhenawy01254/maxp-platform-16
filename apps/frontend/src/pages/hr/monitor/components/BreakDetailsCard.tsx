import React from 'react';
import { Coffee, Clock, AlertTriangle, CheckCircle2, Moon, Utensils } from 'lucide-react';

export interface BreakItem {
  breakNumber: number;
  startTime: string;
  endTime: string;
  startTimeStr?: string;
  endTimeStr?: string;
  durationSeconds: number;
  durationMinutes: number;
  reasonType: 'SCHEDULED_LUNCH' | 'SHORT_BREAK' | 'EXTENDED_ABSENCE' | 'UNLOGGED_INACTIVITY';
  reasonLabel: string;
}

export interface BreaksSummaryData {
  totalBreaksCount: number;
  totalBreakSeconds: number;
  totalBreakMinutes: number;
  breaks: BreakItem[];
}

interface BreakDetailsCardProps {
  breaksSummary?: BreaksSummaryData;
}

export const BreakDetailsCard: React.FC<BreakDetailsCardProps> = ({ breaksSummary }) => {
  const breaks = breaksSummary?.breaks || [];
  const totalCount = breaksSummary?.totalBreaksCount || 0;
  const totalMinutes = breaksSummary?.totalBreakMinutes || 0;

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h} س ${m} د`;
    return `${m} دقيقة`;
  };

  const getReasonBadge = (type: BreakItem['reasonType'], label: string) => {
    switch (type) {
      case 'SCHEDULED_LUNCH':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium">
            <Utensils className="h-3 w-3" /> {label}
          </span>
        );
      case 'SHORT_BREAK':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-sky-50 text-sky-700 border border-sky-200 dark:border-transparent dark:bg-sky-500/10 dark:text-sky-400 px-2 py-0.5 text-[11px] font-medium">
            <Coffee className="h-3 w-3" /> {label}
          </span>
        );
      case 'EXTENDED_ABSENCE':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:border-transparent dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 text-[11px] font-medium">
            <AlertTriangle className="h-3 w-3" /> {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:border-transparent dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 text-[11px] font-medium">
            <Moon className="h-3 w-3" /> {label}
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              سجل وتفاصيل فترات التوقف والخمول (Inactivity & Pauses)
            </h3>
            <p className="text-xs text-muted-foreground">
              حصر فترات الخمول والتوقف عن استخدام الجهاز التي تزيد عن 5 دقائق متصلة
            </p>
          </div>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted dark:bg-zinc-800 px-2.5 py-1 font-medium text-foreground dark:text-zinc-300 ring-1 ring-inset ring-border/40 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>{totalCount > 0 ? `${totalCount} فترات توقف مسجلة اليوم` : 'لا توجد فترات توقف'}</span>
          </span>
          {totalCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:border-transparent dark:bg-amber-500/10 dark:text-amber-300 px-2.5 py-1 font-medium tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              <span>إجمالي وقت التوقف: {formatDuration(totalMinutes)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Breaks Table / Empty State */}
      {breaks.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/40 bg-card dark:bg-zinc-950/30">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-border/40 bg-muted/50 dark:bg-zinc-900/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">توقيت التوقف</th>
                <th className="px-3 py-2 font-semibold">المدة الفعلية</th>
                <th className="px-3 py-2 font-semibold">طبيعة التوقف والحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {breaks.map((b) => {
                const startStr = b.startTimeStr || new Date(b.startTime).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const endStr = b.endTimeStr || new Date(b.endTime).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={b.breakNumber} className="transition-colors hover:bg-muted/50 dark:hover:bg-zinc-900/40">
                    <td className="px-3 py-2.5 font-bold text-foreground tabular-nums">
                      {b.breakNumber}
                    </td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums font-mono">
                      من {startStr} إلى {endStr}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-amber-600 dark:text-amber-300 tabular-nums">
                      {formatDuration(b.durationMinutes)}
                    </td>
                    <td className="px-3 py-2.5">
                      {getReasonBadge(b.reasonType, b.reasonLabel)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-center rounded-lg border border-dashed border-border/40 p-4 text-xs text-muted-foreground">
          لا توجد فترات خمول أو توقف متصل تزيد عن 5 دقائق مسجلة لهذا اليوم
        </div>
      )}
    </div>
  );
};

export default BreakDetailsCard;
