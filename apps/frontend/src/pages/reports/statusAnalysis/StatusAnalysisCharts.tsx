import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { TrendingUp, Package } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  chartData: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export const StatusAnalysisCharts: React.FC<Props> = ({ chartData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Time Trend Area Chart */}
      <Card className="col-span-1 lg:col-span-2 bg-card border-border/70 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>التوجه الزمني للطلبات والقيم (Trend Analysis)</span>
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              مقارنة حجم الطلبات مع الإيرادات
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(17, 24, 39, 0.95)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    name="عدد الطلبات"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="rgba(99, 102, 241, 0.15)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="القيمة (ج.م)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="rgba(16, 185, 129, 0.15)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                لا توجد بيانات زمنية كافية للعرض
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Progress Distribution */}
      <Card className="bg-card border-border/70 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span>توزيع مراحل المعالجة</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">تمت المعالجة والإنجاز</span>
              <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">70%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "70%" }} />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">قيد المراجعة والمتابعة</span>
              <span className="font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">20%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: "20%" }} />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">متأخر يتطلب إجراءً</span>
              <span className="font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">10%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-rose-500 h-2 rounded-full" style={{ width: "10%" }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
