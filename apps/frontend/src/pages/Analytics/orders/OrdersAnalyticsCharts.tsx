import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { Card, CardContent } from "../../../components/ui/card";

export interface TrendEntry {
  date: string;
  orders: number;
}

interface OrdersAnalyticsChartsProps {
  trendData: TrendEntry[];
  trendView: "daily" | "weekly" | "monthly";
  onTrendViewChange: (view: "daily" | "weekly" | "monthly") => void;
  totalOrders: number;
  codOrders: number;
  prepaidOrders: number;
}

export const OrdersAnalyticsCharts: React.FC<OrdersAnalyticsChartsProps> = ({
  trendData,
  trendView,
  onTrendViewChange,
  totalOrders,
  codOrders,
  prepaidOrders,
}) => {
  return (
    <div className="space-y-4">
      {/* Trend Chart */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              اتجاه الطلبات والنشاط الزمني
            </h3>
            <div className="flex gap-1.5">
              {(["daily", "weekly", "monthly"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => onTrendViewChange(view)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                    trendView === view
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {view === "daily" ? "يومي" : view === "weekly" ? "أسبوعي" : "شهري"}
                </button>
              ))}
            </div>
          </div>
          {trendData.length > 0 ? (
            <div className="min-w-0 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis
                    dataKey="date"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    name="الطلبات"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10 text-xs">لا توجد بيانات للاتجاهات في هذه الفترة</p>
          )}
        </CardContent>
      </Card>

      {/* COD vs Prepaid Chart */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            الدفع عند الاستلام مقابل الدفع المسبق
          </h3>
          {totalOrders > 0 ? (
            <div className="min-w-0 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "الدفع عند الاستلام", value: codOrders },
                    { name: "الدفع المسبق", value: prepaidOrders },
                  ]}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis
                    type="number"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-10 text-xs">لا توجد بيانات للعرض</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
