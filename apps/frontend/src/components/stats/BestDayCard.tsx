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
    <div className="bg-card p-4 sm:p-5 rounded-xl border border-border/70 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-muted-foreground text-xs font-semibold">أفضل يوم</h4>
        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          <Calendar className="w-4 h-4" />
        </div>
      </div>
      {bestDay ? (
        <div>
          <p className="text-xl sm:text-2xl font-bold text-foreground mb-1 font-mono tabular-nums">
            {bestDay.dayName || 'غير محدد'}
          </p>
          <p className="text-xs text-primary font-medium flex items-center gap-1">
            <span className="font-mono tabular-nums">{bestDay.count}</span>
            <span>رسالة مرسلة</span>
            <span className="text-muted-foreground/60 mx-1">•</span>
            <span>الأكثر نشاطاً</span>
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs font-medium">لا توجد بيانات كافية</p>
      )}
    </div>
  );
};

export default BestDayCard;
