import React from 'react';
import { Laptop, CheckCircle2, MinusCircle, AlertTriangle, HelpCircle } from 'lucide-react';

export interface AppUsageItem {
  appName: string;
  windowTitle?: string;
  category?: string;
  durationSeconds: number;
  entriesCount?: number;
}

interface AppUsageListProps {
  apps: AppUsageItem[];
  totalWorkSeconds?: number;
}

export const AppUsageList: React.FC<AppUsageListProps> = ({ apps = [], totalWorkSeconds = 0 }) => {
  const maxDuration = Math.max(...apps.map((a) => a.durationSeconds), 1);
  const totalDuration = apps.reduce((acc, a) => acc + (a.durationSeconds || 0), 0) || totalWorkSeconds || 1;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} س ${m} د`;
    return `${m} د`;
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'productive':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            <CheckCircle2 className="h-2.5 w-2.5" /> منتج
          </span>
        );
      case 'unproductive':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-400 ring-1 ring-inset ring-rose-500/20">
            <AlertTriangle className="h-2.5 w-2.5" /> غير منتج
          </span>
        );
      case 'neutral':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 ring-1 ring-inset ring-zinc-500/20">
            <MinusCircle className="h-2.5 w-2.5" /> محايد
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400 ring-1 ring-inset ring-sky-500/20">
            <HelpCircle className="h-2.5 w-2.5" /> غير مصنف
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-card-foreground shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Laptop className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            البرامج والتطبيقات المستخدمة ({apps.length})
          </h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          إجمالي وقت البرامج: {formatDuration(totalDuration)}
        </span>
      </div>

      {apps.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/40 text-xs text-muted-foreground">
          لا توجد بيانات برامج مسجلة لهذا اليوم
        </div>
      ) : (
        <div className="space-y-2.5">
          {apps.slice(0, 10).map((app, idx) => {
            const pct = Math.min(100, Math.round((app.durationSeconds / totalDuration) * 100));
            const barWidth = Math.min(100, Math.round((app.durationSeconds / maxDuration) * 100));

            return (
              <div
                key={idx}
                className="group relative rounded-lg border border-border/30 bg-zinc-900/40 p-2.5 transition-colors hover:border-border/60 hover:bg-zinc-900/70"
              >
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-[320px]">
                      {app.appName}
                    </span>
                    {getCategoryBadge(app.category)}
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-medium text-foreground">
                      {formatDuration(app.durationSeconds)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">({pct}%)</span>
                  </div>
                </div>

                {/* Window Title Subtext */}
                {app.windowTitle && app.windowTitle !== app.appName && (
                  <p className="mb-1.5 truncate text-[11px] text-zinc-400">
                    {app.windowTitle}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      app.category === 'productive'
                        ? 'bg-emerald-500'
                        : app.category === 'unproductive'
                        ? 'bg-rose-500'
                        : 'bg-sky-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppUsageList;
