import React from "react";
import { History, BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface QueueMetric {
  id: string;
  completed: number;
  failed: number;
  timestamp: string;
}

interface QueueAnalyticsChartProps {
  history: QueueMetric[];
  timeRange: "1" | "7";
  setTimeRange: (val: "1" | "7") => void;
}

export function QueueAnalyticsChart({
  history,
  timeRange,
  setTimeRange,
}: QueueAnalyticsChartProps) {
  const chartData = history.map((item) => ({
    ...item,
    time: new Date(item.timestamp).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    date: new Date(item.timestamp).toLocaleDateString("ar-EG", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  return (
    <Card className="lg:col-span-8 rounded-lg border border-border/70 bg-card overflow-hidden shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-foreground">
            تحليلات الأداء التاريخية
          </CardTitle>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border/40">
          <button
            onClick={() => setTimeRange("1")}
            className={`text-xs font-mono px-2 py-0.5 rounded transition-colors ${
              timeRange === "1"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            24 ساعة
          </button>
          <button
            onClick={() => setTimeRange("7")}
            className={`text-xs font-mono px-2 py-0.5 rounded transition-colors ${
              timeRange === "7"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            7 أيام
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="h-[320px] w-full">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                  opacity={0.5}
                />
                <XAxis
                  dataKey={timeRange === "1" ? "time" : "date"}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  minTickGap={40}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                    padding: "10px",
                    fontSize: "12px",
                  }}
                  labelStyle={{
                    fontWeight: "bold",
                    marginBottom: "6px",
                    color: "var(--color-foreground)",
                  }}
                />
                <Legend align="right" verticalAlign="top" height={36} iconType="circle" />
                <Area
                  type="monotone"
                  name="الناجحة"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                />
                <Area
                  type="monotone"
                  name="الفاشلة"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border/70">
              <BarChart3 className="size-10 mb-2 opacity-20" />
              <p className="font-medium text-xs font-mono text-foreground">
                جاري جمع البيانات التاريخية...
              </p>
              <p className="text-[11px] mt-0.5 font-mono text-muted-foreground">
                ستظهر البيانات فور اكتمال أول عملية تسجيل آلي
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
