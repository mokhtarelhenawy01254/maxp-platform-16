import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Clock, TrendingUp } from "lucide-react";
import { DailyOrdersSummaryResponse } from "./types";

interface DailyOrdersHourlyChartProps {
  timeline: DailyOrdersSummaryResponse["timeline"];
  isSingleDay: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border/60 bg-popover/95 p-2.5 shadow-md backdrop-blur-md text-xs">
        <p className="font-semibold text-foreground mb-1 tabular-nums">
          {data.date ? `${data.date} (${data.label})` : `الساعة ${data.label}`}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">عدد الطلبات:</span>
            <span className="font-bold text-primary tabular-nums">
              {data.ordersCount.toLocaleString()} طلب
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">قيمة المبيعات:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {data.gmv.toLocaleString()} ج.م
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const DailyOrdersHourlyChart: React.FC<DailyOrdersHourlyChartProps> = ({
  timeline,
  isSingleDay,
}) => {
  const totalInChart = timeline.reduce((acc, curr) => acc + curr.ordersCount, 0);

  return (
    <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {isSingleDay ? (
              <Clock className="size-3.5" />
            ) : (
              <TrendingUp className="size-3.5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {isSingleDay
                ? "توزيع الطلبات على مدار ساعات اليوم"
                : "مسار حركة الطلبات في الفترة المحددة"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isSingleDay
                ? "نبض المبيعات المباشر من منتصف الليل حتى نهاية اليوم"
                : "توزيع كميات الطلبات يوماً بيوم"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">
              إجمالي المعاملات المسجلة:
            </span>
            <span className="font-bold tabular-nums text-foreground">
              {totalInChart.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="h-[220px] w-full">
        {timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timeline}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border) / 0.5)"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                interval={isSingleDay ? 2 : "preserveStartEnd"}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="ordersCount"
                stroke="var(--primary)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#ordersGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            لا توجد طلبات مسجلة في هذا النطاق الزمني
          </div>
        )}
      </div>
    </div>
  );
};
