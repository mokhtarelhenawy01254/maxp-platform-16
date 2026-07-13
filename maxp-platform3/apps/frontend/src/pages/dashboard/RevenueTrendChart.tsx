import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
} from "recharts";
import DeferredResponsiveContainer from "../../components/ui/DeferredResponsiveContainer";
import type { RevenueHistoryPoint } from "./types";

type ChartView = "revenue" | "orders";

type RevenueTrendChartProps = {
  data: RevenueHistoryPoint[];
  title: string;
  revenueLabel: string;
  ordersLabel: string;
  emptyLabel: string;
  formatRevenue: (value: number) => string;
};

export default function RevenueTrendChart({
  data,
  title,
  revenueLabel,
  ordersLabel,
  emptyLabel,
  formatRevenue,
}: RevenueTrendChartProps) {
  const [view, setView] = useState<ChartView>("revenue");
  const hasOrders = data.some((d) => d.orders !== undefined);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" role="img" aria-label={emptyLabel}>
        <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <span className="text-sm">{emptyLabel}</span>
      </div>
    );
  }

  const activeKey = view === "revenue" ? "revenue" : "orders";
  const activeColor = view === "revenue" ? "var(--color-success)" : "var(--color-primary)";
  const activeLabel = view === "revenue" ? revenueLabel : ordersLabel;
  const showBrush = chartData.length > 30;

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {hasOrders && (
          <div className="inline-flex rounded-lg border border-border/50 overflow-hidden text-xs">
            {(["revenue", "orders"] as ChartView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={
                  "px-3 py-1.5 font-medium transition-colors " +
                  (view === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground")
                }
                aria-pressed={view === v}
              >
                {v === "revenue" ? revenueLabel : ordersLabel}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-[280px]">
        <DeferredResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis dataKey="date" className="text-xs text-gray-500 dark:text-gray-400" tickMargin={8} />
            <YAxis
              className="text-xs text-gray-500 dark:text-gray-400"
              tickFormatter={(v: number) => (view === "revenue" ? formatRevenue(v) : v.toLocaleString())}
              tickMargin={8}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
                color: "var(--color-card-foreground)",
              }}
              formatter={(value: number, name: string) => [
                name === revenueLabel ? formatRevenue(value) : value.toLocaleString(),
                name,
              ]}
            />
            <Area
              type="monotone"
              dataKey={activeKey}
              stroke={activeColor}
              fill={activeColor}
              fillOpacity={0.15}
              name={activeLabel}
              strokeWidth={2}
            />
            {showBrush && (
              <Brush
                dataKey="date"
                height={20}
                stroke={activeColor}
                travellerWidth={8}
                fill="color-mix(in srgb, var(--color-border) 20%, transparent)"
              />
            )}
          </AreaChart>
        </DeferredResponsiveContainer>
      </div>
    </>
  );
}
