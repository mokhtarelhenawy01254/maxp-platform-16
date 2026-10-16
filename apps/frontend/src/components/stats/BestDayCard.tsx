import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface BestDayCardProps {
  stats: any;
}

const BestDayCard: React.FC<BestDayCardProps> = ({ stats }) => {
  const bestDay = useMemo(() => {
    if (!stats?.weekdayStats?.length) return null;
    return [...stats.weekdayStats].sort((a: any, b: any) => b.count - a.count)[0];
  }, [stats?.weekdayStats]);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-none transition-colors hover:border-border sm:p-4.5">
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
        <h4 className="text-xs font-semibold tracking-tight text-muted-foreground">أفضل يوم</h4>
        <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Calendar className="size-3.5" />
        </div>
      </div>
      {bestDay ? (
        <div className="space-y-1.5">
          <p className="font-mono text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">
            {bestDay.dayName || 'غير محدد'}
          </p>
          <div className="flex items-center gap-1.5 font-mono text-xs text-primary tabular-nums">
            <span className="font-semibold">{bestDay.count}</span>
            <span className="font-sans text-muted-foreground">رسالة مرسلة</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="font-sans text-[11px] text-muted-foreground">الأكثر نشاطاً</span>
          </div>
        </div>
      ) : (
        <p className="text-xs font-medium text-muted-foreground/80">لا توجد بيانات كافية</p>
      )}
    </div>
  );
};

export default BestDayCard;
