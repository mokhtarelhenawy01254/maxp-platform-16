import React, { useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { BarChart3, Star, Package, ArrowUpRight } from "lucide-react";
import ResponsiveContainer from "../../components/ui/DeferredResponsiveContainer";
import { useCurrency } from "../../hooks/useCurrency";
import { TopProduct, getTopProductImage, getTopProductPurchases } from "./storeAnalyticsDashboard.utils";

interface ChartDataPoint {
  date: string;
  visits: number;
  purchases: number;
  revenue: number;
  rate: number;
}

interface StoreAnalyticsChartsProps {
  chartData: ChartDataPoint[];
  topProducts: TopProduct[];
}

const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-border/80 bg-popover/95 p-2.5 text-xs shadow-md backdrop-blur"
    >
      {label && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color || entry.stroke }}
          />
          <span>{entry.name}:</span>
          <span className="font-mono font-bold text-foreground tabular-nums">
            {Number(entry.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export const StoreAnalyticsCharts: React.FC<StoreAnalyticsChartsProps> = ({
  chartData,
  topProducts,
}) => {
  const { formatPrice } = useCurrency();
  const [chartMode, setChartMode] = useState<"volume" | "conversion">("volume");

  const starProduct = topProducts[0] ?? null;
  const runnerUpProducts = starProduct ? topProducts.slice(1, 6) : topProducts.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
      {/* 1. Trend Chart (7 cols) */}
      <div className="lg:col-span-7 rounded-lg border border-border/70 bg-card p-4 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" /> الاتجاه الزمني للأداء
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              متابعة تطور الزيارات والطلبات والإيرادات عبر الأيام
            </p>
          </div>

          <div className="inline-flex rounded-md bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setChartMode("volume")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                chartMode === "volume"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              حجم النشاط
            </button>
            <button
              type="button"
              onClick={() => setChartMode("conversion")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                chartMode === "conversion"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              معدل التحويل %
            </button>
          </div>
        </div>

        <div className="h-[270px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {chartMode === "volume" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
                <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="visits"
                  name="الزيارات"
                  stroke="#2563EB"
                  fill="url(#visitsFill)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="purchases"
                  name="الطلبات"
                  stroke="#10B981"
                  fillOpacity={0}
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
                <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="معدل التحويل (%)"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Top Products Section (5 cols) */}
      <div className="lg:col-span-5 rounded-lg border border-border/70 bg-card p-4 shadow-none flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> المنتجات الأكثر تحويلاً ومبيعاً
            </h3>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              أفضل {topProducts.length} منتجات
            </span>
          </div>

          {topProducts.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">
              لا توجد مبيعات منتجات مسجلة في هذه الفترة.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Star Product Card */}
              {starProduct && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {getTopProductImage(starProduct) ? (
                      <img
                        src={getTopProductImage(starProduct)!}
                        alt={starProduct.name}
                        className="h-9 w-9 rounded object-cover border border-amber-500/20 shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block mb-0.5">
                        المنتج النجم الأقوى
                      </span>
                      <p className="text-xs font-semibold text-foreground truncate max-w-[170px]">
                        {starProduct.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-left font-mono tabular-nums">
                    <span className="text-xs font-bold text-foreground block">
                      {formatPrice(starProduct.revenue || 0)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {getTopProductPurchases(starProduct)} طلب
                    </span>
                  </div>
                </div>
              )}

              {/* Runner Up Products */}
              <div className="space-y-1.5">
                {runnerUpProducts.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="flex items-center justify-between gap-2 p-2 rounded border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-muted-foreground w-4 text-center">
                        {idx + 2}
                      </span>
                      <p className="text-xs font-medium text-foreground truncate max-w-[180px]">
                        {p.name}
                      </p>
                    </div>
                    <div className="text-left font-mono tabular-nums">
                      <span className="text-xs font-bold text-foreground">
                        {formatPrice(p.revenue || 0)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {getTopProductPurchases(p)} طلب
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
          يتم ترتيب المنتجات بناءً على مساهمتها في إجمالي الإيرادات وحجم التحويلات الناجحة.
        </div>
      </div>
    </div>
  );
};

export default StoreAnalyticsCharts;
