import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { useCurrency } from "../../../hooks/useCurrency";
import { Card, CardContent } from "../../../components/ui/card";
import {
  StatusRow,
  TrendRow,
  ProductRow,
  STATUS_META,
  PALETTE,
} from "./returnReasonsTypes";

interface Props {
  statusBreakdown: StatusRow[];
  dailyTrend: TrendRow[];
  byProduct: ProductRow[];
  totalReturns: number;
}

const getStatusMeta = (status: string) =>
  STATUS_META[status] || {
    label: status,
    color: "#94A3B8",
    pill: "border-border/70 text-muted-foreground bg-muted",
  };

export const ReturnReasonsDetailsTabs: React.FC<Props> = ({
  statusBreakdown,
  dailyTrend,
  byProduct,
  totalReturns,
}) => {
  const { formatPrice } = useCurrency();
  const [tab, setTab] = useState<"status" | "trend" | "products">("status");

  const statusChartData = statusBreakdown.map((row) => ({
    ...row,
    name: getStatusMeta(row.status).label,
    color: getStatusMeta(row.status).color,
  }));

  return (
    <Card className="border-border/70 bg-card overflow-hidden">
      <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          تفاصيل مؤشرات المرتجعات
        </h3>
        <div className="inline-flex rounded-lg bg-muted/50 p-1 border border-border/70 text-xs">
          <button
            type="button"
            onClick={() => setTab("status")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              tab === "status"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            حالات المعالجة
          </button>
          <button
            type="button"
            onClick={() => setTab("trend")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              tab === "trend"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الاتجاه اليومي
          </button>
          <button
            type="button"
            onClick={() => setTab("products")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              tab === "products"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            المنتجات الأكثر رجوعاً
          </button>
        </div>
      </div>

      <CardContent className="p-5">
        {/* Tab 1: Status Donut */}
        {tab === "status" && (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(val: any) => [Number(val).toLocaleString(), "حالة"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {totalReturns.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground">مرتجع</span>
              </div>
            </div>

            <div className="w-full space-y-2">
              {statusChartData.map((row) => {
                const meta = getStatusMeta(row.status);
                return (
                  <div
                    key={row.status}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20 text-xs"
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-semibold text-foreground">
                        {row.count.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ({row.percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Daily Trend Area Chart */}
        {tab === "trend" && (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dailyTrend}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  className="text-muted-foreground"
                  fontSize={10}
                />
                <YAxis
                  stroke="currentColor"
                  className="text-muted-foreground"
                  fontSize={11}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(val: any) => [Number(val).toLocaleString(), "مرتجع"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fill="url(#retGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tab 3: Products Cards */}
        {tab === "products" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {byProduct.slice(0, 5).map((row, index) => {
              const max = byProduct[0]?.count || 1;
              return (
                <div
                  key={row.product}
                  className="p-3 rounded-lg border border-border/70 bg-card flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                    >
                      {index + 1}
                    </span>
                    <span className="font-mono font-bold text-xs text-foreground">
                      {row.count.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-2" title={row.product}>
                    {row.product}
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="h-1 rounded-full bg-muted overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(row.count / max) * 100}%`,
                          backgroundColor: PALETTE[index % PALETTE.length],
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatPrice(row.refundAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
