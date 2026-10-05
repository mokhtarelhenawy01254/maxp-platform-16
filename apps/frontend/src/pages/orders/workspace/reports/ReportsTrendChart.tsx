import React, { useState } from 'react';
import { WorkspaceDailyTrendPoint } from '../types';

interface ReportsTrendChartProps {
  data: WorkspaceDailyTrendPoint[];
  isArabic: boolean;
}

export const ReportsTrendChart: React.FC<ReportsTrendChartProps> = ({ data, isArabic }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-xs text-muted-foreground">
        {isArabic ? 'لا توجد بيانات حركة للأيام المحددة' : 'No activity data for the selected period'}
      </div>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.contacted, d.confirmed, d.cancelled, 1)),
    5
  );

  return (
    <div className="relative flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-3.5 shadow-sm">
      {/* Chart Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">
            {isArabic ? 'حركة النشاط اليومي' : 'Daily Activity Trend'}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
            {data.length} {isArabic ? 'يوم' : 'days'}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>{isArabic ? 'تواصل' : 'Contacted'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{isArabic ? 'مؤكد' : 'Confirmed'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>{isArabic ? 'ملغي' : 'Cancelled'}</span>
          </div>
        </div>
      </div>

      {/* SVG / Bar Chart Container */}
      <div className="relative h-44 w-full pt-4">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="w-full border-b border-dashed border-foreground" />
          <div className="w-full border-b border-dashed border-foreground" />
          <div className="w-full border-b border-dashed border-foreground" />
          <div className="w-full border-b border-dashed border-foreground" />
        </div>

        {/* Bars Container */}
        <div className="relative flex h-36 items-end justify-between gap-1 sm:gap-2 px-1">
          {data.map((point, idx) => {
            const contactedHeight = Math.max(3, (point.contacted / maxValue) * 100);
            const confirmedHeight = Math.max(3, (point.confirmed / maxValue) * 100);
            const cancelledHeight = Math.max(3, (point.cancelled / maxValue) * 100);

            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={point.date}
                className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 z-20 whitespace-nowrap rounded-md border border-border/80 bg-popover px-2.5 py-1 text-[11px] font-semibold text-popover-foreground shadow-md transition-all">
                    <div className="text-[10px] text-muted-foreground pb-0.5">
                      {point.date} ({point.dayName})
                    </div>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-blue-500 font-bold">{point.contacted} تواصل</span>
                      <span>•</span>
                      <span className="text-emerald-500 font-bold">{point.confirmed} مؤكد</span>
                      <span>•</span>
                      <span className="text-rose-500 font-bold">{point.cancelled} ملغي</span>
                    </div>
                  </div>
                )}

                {/* Grouped Bars */}
                <div className="flex w-full items-end justify-center gap-0.5 sm:gap-1 max-w-[48px] h-full pb-1">
                  {/* Contacted Bar */}
                  <div
                    style={{ height: `${point.contacted === 0 ? 2 : contactedHeight}%` }}
                    className={`w-full rounded-t transition-all ${
                      point.contacted > 0
                        ? 'bg-blue-500/80 hover:bg-blue-500'
                        : 'bg-muted/40'
                    }`}
                  />
                  {/* Confirmed Bar */}
                  <div
                    style={{ height: `${point.confirmed === 0 ? 2 : confirmedHeight}%` }}
                    className={`w-full rounded-t transition-all ${
                      point.confirmed > 0
                        ? 'bg-emerald-500/80 hover:bg-emerald-500'
                        : 'bg-muted/40'
                    }`}
                  />
                  {/* Cancelled Bar */}
                  <div
                    style={{ height: `${point.cancelled === 0 ? 2 : cancelledHeight}%` }}
                    className={`w-full rounded-t transition-all ${
                      point.cancelled > 0
                        ? 'bg-rose-500/80 hover:bg-rose-500'
                        : 'bg-muted/40'
                    }`}
                  />
                </div>

                {/* X Axis Label */}
                <div className="mt-1 text-[10px] font-medium text-muted-foreground truncate max-w-full text-center tabular-nums">
                  {point.dayName || point.date.slice(5)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
