import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  RotateCcw,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Tag,
  TrendingDown,
  ShoppingBag,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import { useCurrency } from "../../../hooks/useCurrency";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  ReturnReasonsAnalyticsData,
  STATUS_META,
  PALETTE,
} from "./returnReasonsTypes";
import { ReturnReasonsStatsBar } from "./ReturnReasonsStatsBar";
import { ReturnReasonsDetailsTabs } from "./ReturnReasonsDetailsTabs";

const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const DEFAULT_RANGE: PeriodRange = (() => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { period: "30", startDate: toISODate(start), endDate: toISODate(end) };
})();

const emptyData: ReturnReasonsAnalyticsData = {
  summary: {
    totalReturns: 0,
    totalOrders: 0,
    returnRate: 0,
    totalRefundValue: 0,
    avgReturnValue: 0,
    withReasonCount: 0,
    withoutReasonCount: 0,
    resolvedCount: 0,
    resolutionRate: 0,
    topReason: null,
    topCategory: null,
  },
  reasonBreakdown: [],
  categoryBreakdown: [],
  statusBreakdown: [],
  dailyTrend: [],
  byProduct: [],
  recentReturns: [],
};

const getStatusMeta = (status: string) =>
  STATUS_META[status] || {
    label: status,
    color: "#94A3B8",
    pill: "border-border/70 text-muted-foreground bg-muted",
  };

const truncateLabel = (value: string, max = 22) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const ReturnReasonsAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [range, setRange] = useState<PeriodRange>(DEFAULT_RANGE);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<ReturnReasonsAnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getReturnReasonsAnalytics(
        range?.period,
        range?.startDate,
        range?.endDate,
        category || undefined,
        status || undefined,
      );
      const result = response as
        | { success?: boolean; data?: ReturnReasonsAnalyticsData }
        | null
        | undefined;
      setData(result?.success && result.data ? result.data : emptyData);
    } catch (err: any) {
      console.error("ReturnReasonsAnalytics error:", err);
      setError("تعذر تحميل تحليل أسباب المرتجعات");
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [range, category, status]);

  useEffect(() => {
    if (range) {
      fetchData();
    }
  }, [range, category, status, fetchData]);

  const categoryOptions = useMemo(
    () => data.categoryBreakdown.map((row) => row.category),
    [data.categoryBreakdown],
  );

  const statusOptions = useMemo(
    () => data.statusBreakdown.map((row) => row.status),
    [data.statusBreakdown],
  );

  const reasonChartData = useMemo(
    () =>
      data.reasonBreakdown.slice(0, 8).map((row) => ({
        ...row,
        chartLabel: truncateLabel(row.reason),
      })),
    [data.reasonBreakdown],
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-rose-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              أسباب المرتجعات التفصيلية
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            توزيع أسباب الإرجاع، التصنيفات، ومؤشرات تسوية الشحنات للمراجعة الفورية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector onRangeChange={setRange} />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">كل الحالات</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {getStatusMeta(opt).label}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">كل التصنيفات</option>
            {categoryOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs border-border/70 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="h-7 text-xs">
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Merged insight banner + Telemetry KPIs */}
      <ReturnReasonsStatsBar summary={data.summary} />

      {/* Top Reasons Chart & Categories List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Reasons Chart */}
        <Card className="lg:col-span-2 border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  أكثر الأسباب تكراراً (أعلى 8 أسباب)
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {data.reasonBreakdown.length} سبب مسجل
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reasonChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                  <YAxis
                    dataKey="chartLabel"
                    type="category"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                    width={110}
                  />
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
                  <Bar dataKey="count" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  تصنيفات الإرجاع
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                تجميع الأسباب
              </span>
            </div>

            <div className="space-y-3">
              {data.categoryBreakdown.slice(0, 8).map((row, index) => (
                <div key={row.category}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{row.category}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      <b className="text-foreground">{row.count}</b> ({row.percentage}%)
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(row.percentage, 100)}%`,
                        backgroundColor: PALETTE[index % PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Status / Trend / Products */}
      <ReturnReasonsDetailsTabs
        statusBreakdown={data.statusBreakdown}
        dailyTrend={data.dailyTrend}
        byProduct={data.byProduct}
        totalReturns={data.summary.totalReturns}
      />

      {/* Recent Returns Table */}
      {data.recentReturns && data.recentReturns.length > 0 && (
        <Card className="border-border/70 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                أحدث طلبات الإرجاع للمراجعة
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {data.recentReturns.length} طلب
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="py-2.5 px-4 text-right font-medium">الطلب</th>
                  <th className="py-2.5 px-4 text-right font-medium">العميل</th>
                  <th className="py-2.5 px-4 text-center font-medium">المنطقة</th>
                  <th className="py-2.5 px-4 text-right font-medium">السبب</th>
                  <th className="py-2.5 px-4 text-center font-medium">الحالة</th>
                  <th className="py-2.5 px-4 text-center font-medium">قيمة الاسترداد</th>
                  <th className="py-2.5 px-4 text-left font-medium">مراجعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.recentReturns.slice(0, 15).map((row) => {
                  const meta = getStatusMeta(row.status);
                  return (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-foreground">
                        {row.orderNumber}
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        <div>{row.customerName}</div>
                        {row.customerPhone && (
                          <div className="text-[10px] text-muted-foreground font-mono dir-ltr text-right">
                            {row.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center text-muted-foreground">
                        {row.region || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        <div className="line-clamp-1">{row.reason}</div>
                        <span className="inline-flex text-[10px] text-muted-foreground">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${meta.pill}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                        {formatPrice(row.refundAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-left">
                        {row.reviewUrl ? (
                          <Link
                            to={row.reviewUrl}
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-500 font-medium"
                          >
                            عرض
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReturnReasonsAnalytics;
