import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  XCircle,
  DollarSign,
  ClipboardCheck,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Tag,
  TrendingDown,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { useCurrency } from "../../../hooks/useCurrency";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface CancellationSummary {
  totalCancelledOrders: number;
  regularOrders: number;
  guestOrders: number;
  totalLostRevenue: number;
  averageCancelledOrderValue: number;
  withReason: number;
  withoutReason: number;
  autoCancelled: number;
  reviewedByAgent: number;
}

interface CancellationOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  reason: string;
  reasonCategory: string;
  cancelledBy: string;
  reviewUrl: string;
}

interface CancellationAnalyticsData {
  summary: CancellationSummary;
  reasonBreakdown: Array<{ reason: string; count: number; percentage: number; lostRevenue: number }>;
  categoryBreakdown: Array<{ category: string; count: number; percentage: number; lostRevenue: number }>;
  orders: CancellationOrderRow[];
}

const emptyData: CancellationAnalyticsData = {
  summary: { totalCancelledOrders: 0, regularOrders: 0, guestOrders: 0, totalLostRevenue: 0, averageCancelledOrderValue: 0, withReason: 0, withoutReason: 0, autoCancelled: 0, reviewedByAgent: 0 },
  reasonBreakdown: [],
  categoryBreakdown: [],
  orders: [],
};

const categoryBadgeStyle = (category: string) => {
  const m: Record<string, string> = {
    "تعذر التواصل": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    "طلب العميل": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    "طلب مكرر": "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
    "مشكلة مخزون": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    "مشكلة شحن": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    "مشكلة دفع أو سعر": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  };
  return m[category] || "bg-muted text-muted-foreground border border-border/70";
};

const CancellationAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [data, setData] = useState<CancellationAnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsService.getCancellationAnalytics(range?.period, range?.startDate, range?.endDate);
      setData(res?.success && res?.data ? res.data : emptyData);
    } catch (err: any) {
      console.error("CancellationAnalytics error:", err);
      setError("تعذر تحميل تحليل الإلغاءات");
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (range) fetchData();
  }, [range, fetchData]);

  const summary = data.summary;
  const reasonChartData = useMemo(
    () => data.reasonBreakdown.slice(0, 8).map((r) => ({ ...r, chartLabel: r.reason.length > 25 ? `${r.reason.slice(0, 22)}…` : r.reason })),
    [data.reasonBreakdown],
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-rose-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">تحليل أسباب الإلغاءات</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">تحليل معدل الإلغاء المالي، أسباب تراجع العملاء، وقائمة الطلبات الملغاة للمراجعة</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <PeriodSelector onRangeChange={setRange} />
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9 px-3 gap-1.5 text-xs border-border/70 text-muted-foreground hover:text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>
          <Button variant="outline" size="sm" onClick={fetchData} className="h-7 text-xs">إعادة المحاولة</Button>
        </div>
      )}

      {/* Telemetry Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي الطلبات الملغاة</span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{summary.totalCancelledOrders.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{summary.regularOrders} أساسي + {summary.guestOrders} زائر</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي الإيراد المفقود</span>
              <DollarSign className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">{formatPrice(summary.totalLostRevenue)}</div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">متوسط {formatPrice(summary.averageCancelledOrderValue)} للطلب</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>ملغاة بسبب محدد</span>
              <ClipboardCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{summary.withReason.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">مقابل {summary.withoutReason} بدون سبب مسجل</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>مراجعة فريق المبيعات</span>
              <Tag className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{summary.reviewedByAgent.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">{summary.autoCancelled} إلغاء تلقائي بواسطة النظام</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Breakdown: Chart & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold text-foreground">أعلى أسباب الإلغاء تكراراً</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">أبرز 8 أسباب</span>
            </div>
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonChartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                  <YAxis dataKey="chartLabel" type="category" stroke="currentColor" className="text-muted-foreground" fontSize={11} width={110} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} formatter={(val: any, name: string) => [name === "lostRevenue" ? formatPrice(Number(val)) : val, name === "lostRevenue" ? "الخسارة" : "عدد الطلبات"]} />
                  <Bar dataKey="count" name="count" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-foreground">تصنيفات أسباب الإلغاء</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{data.categoryBreakdown.length} تصنيفات</span>
            </div>
            <div className="space-y-2">
              {data.categoryBreakdown.map((row) => (
                <div key={row.category} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${categoryBadgeStyle(row.category)}`}>{row.category}</span>
                    <span className="text-xs text-muted-foreground font-mono">{row.percentage?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono tabular-nums font-semibold text-foreground">{row.count} طلب</span>
                    <span className="font-mono tabular-nums text-muted-foreground">({formatPrice(row.lostRevenue)})</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cancelled Orders Table */}
      {data.orders && data.orders.length > 0 && (
        <Card className="border-border/70 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">أحدث الطلبات الملغاة للمراجعة</h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{data.orders.length} طلب</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="py-2.5 px-4 text-right font-medium">رقم الطلب</th>
                  <th className="py-2.5 px-4 text-right font-medium">العميل</th>
                  <th className="py-2.5 px-4 text-center font-medium">المبلغ</th>
                  <th className="py-2.5 px-4 text-center font-medium">سبب الإلغاء</th>
                  <th className="py-2.5 px-4 text-center font-medium">ألغي بواسطة</th>
                  <th className="py-2.5 px-4 text-left font-medium">مراجعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.orders.slice(0, 15).map((order) => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-foreground">{order.orderNumber}</td>
                    <td className="py-2.5 px-4 text-foreground">
                      <div>{order.customerName}</div>
                      {order.customerPhone && <div className="text-[10px] text-muted-foreground font-mono dir-ltr text-right">{order.customerPhone}</div>}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">{formatPrice(order.total)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${categoryBadgeStyle(order.reasonCategory)}`}>
                        {order.reason || order.reasonCategory || "غير محدد"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-muted-foreground">{order.cancelledBy || "النظام"}</td>
                    <td className="py-2.5 px-4 text-left">
                      {order.reviewUrl ? (
                        <Link to={order.reviewUrl} className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-500 font-medium">
                          عرض <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CancellationAnalytics;
