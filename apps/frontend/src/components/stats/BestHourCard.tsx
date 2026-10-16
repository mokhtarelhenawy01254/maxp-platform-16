import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';

interface BestHourCardProps {
  stats: any;
}

const BestHourCard: React.FC<BestHourCardProps> = ({ stats }) => {
  const bestHour = useMemo(() => {
    if (!stats?.hourlyStats?.length) return null;
    return [...stats.hourlyStats].sort((a: any, b: any) => b.saved - a.saved)[0];
  }, [stats?.hourlyStats]);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-none transition-colors hover:border-border sm:p-4.5">
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
        <h4 className="text-xs font-semibold tracking-tight text-muted-foreground">أفضل وقت للإرسال</h4>
        <div className="flex size-7 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-500">
          <Clock className="size-3.5" />
        </div>
      </div>
      {bestHour ? (
        <div className="space-y-1.5">
          <p className="font-mono text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">
            {bestHour.hour === 0
              ? '12:00 ص'
              : bestHour.hour === 12
                ? '12:00 م'
                : bestHour.hour > 12
                  ? `${bestHour.hour - 12}:00 م`
                  : `${bestHour.hour}:00 ص`}
          </p>
          <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-500 tabular-nums">
            <span className="font-semibold">{bestHour.saved}</span>
            <span className="font-sans text-muted-foreground">رسالة محفوظة</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="font-sans text-[11px] text-muted-foreground">الأعلى حفظاً للرسائل</span>
          </div>
        </div>
      ) : (
        <p className="text-xs font-medium text-muted-foreground/80">لا توجد بيانات كافية</p>
      )}
    </div>
  );
};

export default BestHourCard;
