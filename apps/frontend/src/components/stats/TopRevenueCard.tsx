import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

interface TopRevenueCardProps {
  stats: any;
}

const TopRevenueCard: React.FC<TopRevenueCardProps> = ({ stats }) => {
  const topRevenueHour = useMemo(() => {
    if (!stats?.hourlyStats?.length) return null;
    return [...stats.hourlyStats].sort((a: any, b: any) => b.revenue - a.revenue)[0];
  }, [stats?.hourlyStats]);

  return (
    <div className="bg-card p-4 sm:p-5 rounded-xl border border-border/70 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-muted-foreground text-xs font-semibold">ساعة الذروة (مبيعات)</h4>
        <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>
      {topRevenueHour && topRevenueHour.revenue > 0 ? (
        <div>
          <p className="text-xl sm:text-2xl font-bold text-foreground mb-1 font-mono tabular-nums">
            {topRevenueHour.hour === 0 ? '12:00 ص' : topRevenueHour.hour === 12 ? '12:00 م' : topRevenueHour.hour > 12 ? `${topRevenueHour.hour - 12}:00 م` : `${topRevenueHour.hour}:00 ص`}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <span className="font-mono tabular-nums">{topRevenueHour.revenue.toLocaleString()}</span>
            <span>ج.م</span>
            <span className="text-muted-foreground/60 mx-1">•</span>
            <span>الأعلى مبيعاً</span>
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs font-medium">لا توجد بيانات مبيعات</p>
      )}
    </div>
  );
};

export default TopRevenueCard;
