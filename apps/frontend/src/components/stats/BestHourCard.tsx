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
    <div className="bg-card p-4 sm:p-5 rounded-xl border border-border/70 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-muted-foreground text-xs font-semibold">أفضل وقت للإرسال</h4>
        <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Clock className="w-4 h-4" />
        </div>
      </div>
      {bestHour ? (
        <div>
          <p className="text-xl sm:text-2xl font-bold text-foreground mb-1 font-mono tabular-nums">
            {bestHour.hour === 0 ? '12:00 ص' : bestHour.hour === 12 ? '12:00 م' : bestHour.hour > 12 ? `${bestHour.hour - 12}:00 م` : `${bestHour.hour}:00 ص`}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <span className="font-mono tabular-nums">{bestHour.saved}</span>
            <span>رسالة محفوظة</span>
            <span className="text-muted-foreground/60 mx-1">•</span>
            <span>الأعلى حفظاً للرسائل</span>
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs font-medium">لا توجد بيانات كافية</p>
      )}
    </div>
  );
};

export default BestHourCard;
