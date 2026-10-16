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
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-none transition-colors hover:border-border sm:p-4.5">
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
        <h4 className="text-xs font-semibold tracking-tight text-muted-foreground">ساعة الذروة (مبيعات)</h4>
        <div className="flex size-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
          <TrendingUp className="size-3.5" />
        </div>
      </div>
      {topRevenueHour && topRevenueHour.revenue > 0 ? (
        <div className="space-y-1.5">
          <p className="font-mono text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">
            {topRevenueHour.hour === 0
              ? '12:00 ص'
              : topRevenueHour.hour === 12
                ? '12:00 م'
                : topRevenueHour.hour > 12
                  ? `${topRevenueHour.hour - 12}:00 م`
                  : `${topRevenueHour.hour}:00 ص`}
          </p>
          <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-500 tabular-nums">
            <span className="font-semibold">{topRevenueHour.revenue.toLocaleString()}</span>
            <span className="font-sans text-muted-foreground">ج.م</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="font-sans text-[11px] text-muted-foreground">الأعلى مبيعاً</span>
          </div>
        </div>
      ) : (
        <p className="text-xs font-medium text-muted-foreground/80">لا توجد بيانات مبيعات</p>
      )}
    </div>
  );
};

export default TopRevenueCard;
