import React from "react";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import DeferredResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { DailyTrendEntry } from "./types";

interface OrdersVelocityChartProps {
  data: DailyTrendEntry[];
  trendMetric: "orders" | "revenue";
  setTrendMetric: (metric: "orders" | "revenue") => void;
  formatPrice: (amount: number) => string;
}

export const OrdersVelocityChart: React.FC<OrdersVelocityChartProps> = ({
  data,
  trendMetric,
  setTrendMetric,
  formatPrice,
}) => {
  if (!data || data.length <= 1) return null;

  return (
    <div className="border-b border-zinc-200/80 dark:border-white/[0.08] p-3 sm:p-4 bg-white dark:bg-[#0a0a0c]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-zinc-150 dark:border-white/[0.06] gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ChartBarIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              مسار وسرعة تنفيذ الطلبات اليومية
            </h2>
            <p className="text-[11px] text-zinc-400">تطور حجم الطلبات والإيرادات المحققة على مدار الفترة المحددة</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/60 dark:border-white/[0.05] text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTrendMetric("orders")}
            className={`px-3 py-1 rounded-md transition-all duration-150 font-semibold active:scale-[0.98] ${
              trendMetric === "orders"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            الطلبات اليومية
          </button>
          <button
            type="button"
            onClick={() => setTrendMetric("revenue")}
            className={`px-3 py-1 rounded-md transition-all duration-150 font-semibold active:scale-[0.98] ${
              trendMetric === "revenue"
                ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            الإيرادات اليومية
          </button>
        </div>
      </div>

      <div className="h-52 sm:h-60 w-full">
        <DeferredResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chassisOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="chassisRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
            <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "rgba(13, 13, 16, 0.95)",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: "11px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
              }}
              formatter={(value: any) =>
                trendMetric === "revenue" ? [formatPrice(Number(value)), "الإيراد"] : [value, ""]
              }
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
            {trendMetric === "orders" ? (
              <>
                <Area type="monotone" dataKey="orders" name="إجمالي الطلبات" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#chassisOrders)" />
                <Area type="monotone" dataKey="delivered" name="المسلّم" stroke="#10b981" strokeWidth={1.75} fill="none" />
                <Area type="monotone" dataKey="cancelled" name="الملغي" stroke="#f43f5e" strokeWidth={1.25} fill="none" />
                <Area type="monotone" dataKey="returned" name="المرتجع" stroke="#f59e0b" strokeWidth={1.25} fill="none" />
              </>
            ) : (
              <Area type="monotone" dataKey="revenue" name="الإيراد اليومي" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#chassisRevenue)" />
            )}
          </AreaChart>
        </DeferredResponsiveContainer>
      </div>
    </div>
  );
};

export default OrdersVelocityChart;
