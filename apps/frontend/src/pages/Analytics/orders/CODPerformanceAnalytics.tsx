import React, { useState, useEffect } from "react";
import {
  Banknote,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Clock,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface CODStats {
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  pendingOrders: number;
  successRate: number;
  cancellationRate: number;
  returnRate: number;
  totalRevenue: number;
  lostRevenue: number;
  avgOrderValue: number;
  regionalPerformance: Array<{
    region: string;
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    successRate: number;
    cancellationRate: number;
  }>;
}

const CODPerformanceAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<CODStats | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getCODPerformanceAnalytics(range?.period, range?.startDate, range?.endDate);
      if (res?.success && res.data) {
        setStats(res.data);
      } else {
        setStats(null);
      }
    } catch (err) {
      console.error("CODPerformanceAnalytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range]);

  const cards = [
    { title: "طلبيات الدفع عند الاستلام", val: (stats?.totalOrders || 0).toLocaleString("en-US"), icon: Banknote, color: "text-blue-500", sub: `قيد المعالجة: ${stats?.pendingOrders || 0}` },
    { title: "نسبة التحصيل والنجاح", val: `${(stats?.successRate || 0).toFixed(1)}%`, icon: CheckCircle2, color: "text-emerald-500", sub: `${stats?.deliveredOrders || 0} طلب تم تسليمه` },
    { title: "نسبة الإلغاء والرفض", val: `${(stats?.cancellationRate || 0).toFixed(1)}%`, icon: XCircle, color: "text-rose-500", sub: `${stats?.cancelledOrders || 0} طلب ملغي`, alert: true },
    { title: "الإيرادات المحصلة", val: formatPrice(stats?.totalRevenue || 0), icon: TrendingUp, color: "text-emerald-500", sub: `مفقود: ${formatPrice(stats?.lostRevenue || 0)}` },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">تحليلات كفاءة الدفع عند الاستلام (COD)</h1>
            <p className="text-xs text-muted-foreground">معدلات التسليم الفعلي، الإلغاءات، وتحصيل مبيعات الشحن</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector onRangeChange={setRange} />
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 gap-1.5 text-xs font-mono border-border/70">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} /> تحديث
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="border-border/70 shadow-sm bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{c.title}</span><c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              </div>
              <div className={`text-xl font-bold font-mono tabular-nums ${c.alert ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                {loading ? "..." : c.val}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Ribbon: Delivery Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 border border-border/70 rounded-xl bg-card p-2.5 shadow-sm text-xs">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20">
          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-muted-foreground text-[11px]">في انتظار الاستلام</div>
            <div className="font-mono font-bold text-foreground text-sm tabular-nums">{stats?.pendingOrders || 0}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20">
          <RotateCcw className="h-4 w-4 text-orange-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-muted-foreground text-[11px]">مرتجعات المشترين</div>
            <div className="font-mono font-bold text-foreground text-sm tabular-nums">{stats?.returnedOrders || 0} ({((stats?.returnRate || 0)).toFixed(1)}%)</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-muted-foreground text-[11px]">متوسط قيمة الطلب (AOV)</div>
            <div className="font-mono font-bold text-foreground text-sm tabular-nums">{formatPrice(stats?.avgOrderValue || 0)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20">
          <Truck className="h-4 w-4 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-muted-foreground text-[11px]">الطلبيات المسلمة</div>
            <div className="font-mono font-bold text-foreground text-sm tabular-nums">{stats?.deliveredOrders || 0}</div>
          </div>
        </div>
      </div>

      {/* Visual Chart & Region Performance Table */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> أداء الدفع عند الاستلام حسب المناطق والمحافظات
          </h3>
          <span className="text-muted-foreground">المحافظات: <strong className="text-foreground font-mono">{stats?.regionalPerformance?.length || 0}</strong></span>
        </div>

        {stats?.regionalPerformance && stats.regionalPerformance.length > 0 && (
          <div className="p-4 border-b border-border/60">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={stats.regionalPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                  <YAxis dataKey="region" type="category" stroke="currentColor" className="text-muted-foreground" fontSize={11} width={130} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }} />
                  <Bar dataKey="deliveredOrders" fill="#10B981" name="مسلم بنجاح" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="cancelledOrders" fill="#EF4444" name="ملغي / مرفوض" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">المنطقة / المحافظة</th>
                <th className="py-2.5 px-3.5 text-center">إجمالي الطلبات</th>
                <th className="py-2.5 px-3.5 text-center">المسلم بنجاح</th>
                <th className="py-2.5 px-3.5 text-center">الملغي / المرفوض</th>
                <th className="py-2.5 px-3.5 text-center">نسبة النجاح</th>
                <th className="py-2.5 px-3.5 text-center">نسبة الإلغاء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={6} className="py-4 px-3.5"><div className="h-4 bg-muted rounded w-3/4"></div></td></tr>
                ))
              ) : !stats?.regionalPerformance || stats.regionalPerformance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">لا توجد بيانات إقليمية متاحة</p>
                  </td>
                </tr>
              ) : (
                stats.regionalPerformance.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-foreground text-sm flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.region}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-foreground tabular-nums">
                      {row.totalOrders.toLocaleString("en-US")}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {row.deliveredOrders.toLocaleString("en-US")}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                      {row.cancelledOrders.toLocaleString("en-US")}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold tabular-nums">
                        {row.successRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-bold tabular-nums">
                        {row.cancellationRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>إجمالي المحصل: <strong className="text-foreground font-mono tabular-nums">{formatPrice(stats?.totalRevenue || 0)}</strong></span>
          <span className="text-[11px]">تحليل الأداء يساعد في تخصيص شركات الشحن المناسبة لكل نطاق جغرافي</span>
        </div>
      </div>
    </div>
  );
};

export default CODPerformanceAnalytics;
