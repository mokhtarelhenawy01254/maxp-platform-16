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
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            <Utensils className="h-3 w-3" /> {label}
          </span>
        );
      case 'SHORT_BREAK':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400 ring-1 ring-inset ring-sky-500/20">
            <Coffee className="h-3 w-3" /> {label}
          </span>
        );
      case 'EXTENDED_ABSENCE':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400 ring-1 ring-inset ring-rose-500/20">
            <AlertTriangle className="h-3 w-3" /> {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-500/20">
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/25">
            <Coffee className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              سجل وتفاصيل الاستراحات وفترات التوقف (Breaks & Pauses)
            </h3>
            <p className="text-xs text-muted-foreground">
              حصر فترات التوقف التي تزيد عن 5 دقائق متصلة ومطابقتها مع مواعيد الدوام
            </p>
          </div>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 font-medium text-zinc-300 ring-1 ring-inset ring-border/30 tabular-nums">
            <Coffee className="h-3.5 w-3.5 text-amber-400" />
            <span>{totalCount > 0 ? `أخذ ${totalCount} استراحات اليوم` : 'لا توجد استراحات مجمعة'}</span>
          </span>
          {totalCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-1 font-medium text-amber-300 ring-1 ring-inset ring-amber-500/20 tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              <span>إجمالي المدة: {formatDuration(totalMinutes)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Breaks Table / Empty State */}
      {breaks.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/30 bg-zinc-950/30">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-border/30 bg-zinc-900/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">توقيت الاستراحة</th>
                <th className="px-3 py-2 font-semibold">المدة الفعلية</th>
                <th className="px-3 py-2 font-semibold">التصنيف والسبب المرجح</th>
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
                  <tr key={b.breakNumber} className="transition-colors hover:bg-zinc-900/40">
                    <td className="px-3 py-2.5 font-bold text-foreground tabular-nums">
                      {b.breakNumber}
                    </td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums font-mono">
                      من {startStr} إلى {endStr}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-amber-300 tabular-nums">
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
          لا توجد فترات انقطاع أو استراحات متصلة تزيد عن 5 دقائق مسجلة لهذا اليوم
        </div>
      )}
    </div>
  );
};

export default BreakDetailsCard;
