import React from 'react';
import { Clock, MousePointer, Keyboard, CheckCircle2 } from 'lucide-react';

interface ActivityLog {
  id?: string;
  intervalStart: string | Date;
  intervalEnd: string | Date;
  mouseEvents?: number;
  keyboardEvents?: number;
  activeSeconds?: number;
  activityScore?: number;
  status?: string;
}

interface ActivityTimelineBarProps {
  activities: ActivityLog[];
  workStartHour?: number;
  workEndHour?: number;
}

export const ActivityTimelineBar: React.FC<ActivityTimelineBarProps> = ({
  activities = [],
  workStartHour = 8,
  workEndHour = 18,
}) => {
  const sorted = [...activities].sort(
    (a, b) => new Date(a.intervalStart).getTime() - new Date(b.intervalStart).getTime()
  );

  const totalActiveMinutes = Math.round(
    activities.reduce((acc, curr) => acc + (curr.activeSeconds || 0), 0) / 60
  );
  const totalMouse = activities.reduce((acc, curr) => acc + (curr.mouseEvents || 0), 0);
  const totalKeyboard = activities.reduce((acc, curr) => acc + (curr.keyboardEvents || 0), 0);

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-card-foreground shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            المخطط الزمني لنشاط الجهاز خلال اليوم
          </h3>
        </div>

        {/* Telemetry Summary Badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 font-medium tabular-nums">
            <CheckCircle2 className="h-3 w-3" />
            نشط: {Math.floor(totalActiveMinutes / 60)}س {totalActiveMinutes % 60}د
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted dark:bg-zinc-800 px-2 py-0.5 text-foreground dark:text-zinc-300 ring-1 ring-inset ring-border/40 tabular-nums">
            <MousePointer className="h-3 w-3 text-sky-600 dark:text-sky-400" />
            {totalMouse.toLocaleString('ar-EG')} نقرة
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted dark:bg-zinc-800 px-2 py-0.5 text-foreground dark:text-zinc-300 ring-1 ring-inset ring-border/40 tabular-nums">
            <Keyboard className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            {totalKeyboard.toLocaleString('ar-EG')} ضغطة
          </span>
        </div>
      </div>

      {/* Timeline Blocks Container */}
      <div className="space-y-1.5 pt-2" dir="ltr">
        {/* Visual Blocks Grid */}
        <div className="flex h-8 w-full gap-[2px] rounded-lg bg-muted/60 dark:bg-zinc-950/60 p-1 ring-1 ring-border/40">
          {sorted.length === 0 ? (
            <div className="flex w-full items-center justify-center text-xs text-muted-foreground">
              لا توجد فترات نشاط مسجلة خلال هذا اليوم
            </div>
          ) : (
            sorted.map((act, idx) => {
              const start = new Date(act.intervalStart);
              const timeStr = start.toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const score = act.activityScore || 0;
              const isIdle = act.status === 'idle' || score < 20;

              return (
                <div
                  key={act.id || idx}
                  className={`group relative flex-1 rounded-[2px] transition-all hover:scale-110 hover:z-10 ${
                    isIdle
                      ? 'bg-amber-500/80 hover:bg-amber-400'
                      : score > 60
                      ? 'bg-emerald-500 hover:bg-emerald-400'
                      : 'bg-sky-500/80 hover:bg-sky-400'
                  }`}
                  title={`${timeStr} | النشاط: ${score}% | ماوس: ${act.mouseEvents || 0} | كيبورد: ${act.keyboardEvents || 0}`}
                >
                  {/* Floating Micro Tooltip on Hover */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 flex-col items-center rounded-md bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 shadow-lg ring-1 ring-border/40 group-hover:flex z-30 whitespace-nowrap">
                    <span className="font-semibold text-sky-400">{timeStr}</span>
                    <span className="text-[10px] text-zinc-400">
                      نشاط: {score}% | {isIdle ? 'خمول / توقف' : 'عمل مستمر'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Hour Axis Labels */}
        <div className="flex justify-between px-1 text-[10px] text-muted-foreground tabular-nums">
          <span>08:00 ص</span>
          <span>11:00 ص</span>
          <span>02:00 م</span>
          <span>05:00 م</span>
          <span>08:00 م</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-500" />
          <span>إنتاجية مرتفعة (&gt;60%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-sky-500/80" />
          <span>نشاط معتدل (20-60%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-amber-500/80" />
          <span>توقف / استراحة (&lt;20%)</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityTimelineBar;
