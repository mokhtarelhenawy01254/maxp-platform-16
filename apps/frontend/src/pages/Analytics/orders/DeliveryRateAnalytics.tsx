import React, { useState, useEffect } from "react";
import {
  Truck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Building2,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface DeliveryStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  dailyTrends: Array<{ date: string; successful: number; failed: number; rate: number }>;
  regionPerformance: Array<{ region: string; deliveryRate: number; avgTime: number }>;
  shippingCompanies: Array<{ company: string; deliveryRate: number; orders: number }>;
}

const DeliveryRateAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<DeliveryStats | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getDeliveryRateAnalytics(range?.period, range?.startDate, range?.endDate);
      if (res?.success && res.data) {
        setStats(res.data);
      } else {
        setStats(null);
      }
    } catch (err) {
      console.error("DeliveryRateAnalytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range]);

  const cards = [
    { title: "إجمالي الشحنات المسلمة", val: (stats?.totalDeliveries || 0).toLocaleString("en-US"), icon: Truck, color: "text-blue-500", sub: `${stats?.successfulDeliveries || 0} شحنة ناجحة` },
    { title: "نسبة نجاح التوصيل العامة", val: `${(stats?.deliveryRate || 0).toFixed(1)}%`, icon: CheckCircle2, color: "text-emerald-500", sub: "معدل الإتمام النهائي" },
    { title: "متوسط سرعة التوصيل", val: `${(stats?.averageDeliveryTime || 0).toFixed(1)} يوم`, icon: Clock, color: "text-amber-500", sub: "من الشحن حتى الاستلام" },
    { title: "شحنات متعثرة / راجعة", val: (stats?.failedDeliveries || 0).toLocaleString("en-US"), icon: XCircle, color: "text-rose-500", sub: "فشل استلام أو رفض", alert: true },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">تحليلات سرعة ونسب نجاح الشحن</h1>
            <p className="text-xs text-muted-foreground">معدلات التوصيل الفعلي، سرعة التسليم، ومقارنة أداء شركات الشحن</p>
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

      {/* Daily Trends Line Chart */}
      {stats?.dailyTrends && stats.dailyTrends.length > 0 && (
        <div className="border border-border/70 rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-emerald-500" /> تطور نسبة التوصيل اليومية (%)
          </h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={stats.dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="date" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }} />
                <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} name="نسبة التسليم %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Regional & Courier Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Regional Performance Chart */}
        <div className="border border-border/70 rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> نسبة النجاح حسب المحافظات
          </h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={stats?.regionPerformance || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} domain={[0, 100]} />
                <YAxis dataKey="region" type="category" stroke="currentColor" className="text-muted-foreground" fontSize={11} width={90} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }} />
                <Bar dataKey="deliveryRate" fill="#10B981" name="نسبة التسليم %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Carrier Comparison Table */}
        <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" /> كفاءة شركات الشحن المعتمدة
              </span>
              <span className="text-muted-foreground font-mono tabular-nums">{stats?.shippingCompanies?.length || 0} شركات</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
                  <tr>
                    <th className="py-2.5 px-3.5">شركة الشحن</th>
                    <th className="py-2.5 px-3.5 text-center">الشحنات المسندة</th>
                    <th className="py-2.5 px-3.5 text-center">نسبة التسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {!stats?.shippingCompanies || stats.shippingCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-muted-foreground">
                        لا توجد إحصائيات لشركات الشحن
                      </td>
                    </tr>
                  ) : (
                    stats.shippingCompanies.map((c, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3.5 font-medium text-foreground text-sm flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.company}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono font-bold text-foreground tabular-nums">
                          {c.orders.toLocaleString("en-US")}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold tabular-nums">
                            {c.deliveryRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-2.5 bg-muted/10 border-t border-border/70 text-[11px] text-muted-foreground">
            توجيه الشحنات التلقائي يعتمد على تقييم نسبة التسليم وسرعة المناديب
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryRateAnalytics;
