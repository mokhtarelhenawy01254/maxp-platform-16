import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ResponsiveContainer from "../../../../components/ui/DeferredResponsiveContainer";

interface DailyTrendItem {
  date: string;
  orders?: number;
  revenue?: number;
  totalPurchases?: number;
  totalRevenue?: number;
}

interface OverviewDualTrendChartProps {
  data: DailyTrendItem[];
  formatPrice: (val: number) => string;
}

const formatShortDate = (rawDate?: string): string => {
  if (!rawDate) return "";
  const trimmed = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed.slice(5);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${month}-${day}`;
  }
  const datePart = trimmed.split("T")[0] || trimmed;
  return datePart.length >= 10 ? datePart.slice(5, 10) : datePart;
};

const formatFullDate = (rawDate?: string): string => {
  if (!rawDate) return "";
  const trimmed = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return trimmed.split("T")[0] || trimmed;
};

export const OverviewDualTrendChart: React.FC<OverviewDualTrendChartProps> = ({
  data,
  formatPrice,
}) => {
  const [metricMode, setMetricMode] = useState<"orders" | "revenue">("orders");

  const formattedData = (Array.isArray(data) ? data : []).map((d) => ({
    ...d,
    orders: Number(d.orders ?? d.totalPurchases ?? 0),
    revenue: Number(d.revenue ?? d.totalRevenue ?? 0),
    shortDate: formatShortDate(d.date),
    fullDate: formatFullDate(d.date),
  }));

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-white/10 dark:bg-[#121214]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
            اتجاه الأداء اليومي للطلبات
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            تطور حجم الطلبات والإيرادات عبر مدار الفترة المحددة
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-white/10 p-0.5 bg-gray-50 dark:bg-gray-800/60 text-xs">
          <button
            type="button"
            onClick={() => setMetricMode("orders")}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              metricMode === "orders"
                ? "bg-white dark:bg-[#1e1e24] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            حجم الطلبات
          </button>
          <button
            type="button"
            onClick={() => setMetricMode("revenue")}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              metricMode === "revenue"
                ? "bg-white dark:bg-[#1e1e24] text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            الإيرادات المالية
          </button>
        </div>
      </div>

      <div className="min-w-0 h-[240px] sm:h-[260px]">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
            لا توجد بيانات حركة يومية للفترة المحددة
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={formattedData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradientOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="trendGradientRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="stroke-gray-100 dark:stroke-white/5"
              />
              <XAxis
                dataKey="shortDate"
                stroke="currentColor"
                className="stroke-gray-400 dark:stroke-gray-500 text-[11px]"
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                stroke="currentColor"
                className="stroke-gray-400 dark:stroke-gray-500 text-[11px]"
                tickLine={false}
                allowDecimals={metricMode === "revenue"}
                tickFormatter={(val) => {
                  const num = Number(val) || 0;
                  if (metricMode === "revenue") {
                    return num >= 1000
                      ? `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k`
                      : String(Math.round(num));
                  }
                  return String(Math.round(num));
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  fontSize: "12px",
                  backgroundColor: "rgba(18, 18, 20, 0.95)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                }}
                formatter={(val: any) =>
                  metricMode === "revenue"
                    ? [formatPrice(Number(val) || 0), "الإيراد"]
                    : [`${Number(val) || 0} طلب`, "الطلبات"]
                }
                labelFormatter={(label, payload) => {
                  const full = payload?.[0]?.payload?.fullDate;
                  return `التاريخ: ${full || label}`;
                }}
              />
              {metricMode === "orders" ? (
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#trendGradientOrders)"
                  name="الطلبات"
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#trendGradientRevenue)"
                  name="الإيرادات"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default OverviewDualTrendChart;
