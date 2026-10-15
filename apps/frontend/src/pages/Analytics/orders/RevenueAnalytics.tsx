import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  RotateCcw,
  ShoppingBag,
  RefreshCw,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface RevenueStats {
  grossRevenue: number;
  netRevenue: number;
  refunds: number;
  averageOrderValue: number;
  revenueGrowth: number;
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
}

const RevenueAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<RevenueStats | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [storeData, dailyData] = await Promise.all([
        analyticsService.getStoreAnalytics(range?.period, range?.startDate, range?.endDate),
        analyticsService.getDailyAnalytics(range?.period, range?.startDate, range?.endDate),
      ]);

      if (storeData?.success) {
        const data = storeData.data || {};
        setStats({
          grossRevenue: data.totalRevenue || 0,
          netRevenue: (data.totalRevenue || 0) - (data.refundedAmount || 0),
          refunds: data.refundedAmount || 0,
          averageOrderValue: data.averageOrderValue || 0,
          revenueGrowth: data.revenueGrowth || 0,
          dailyRevenue: Array.isArray(dailyData?.data) ? dailyData.data : [],
        });
      } else {
        setStats(null);
      }
    } catch (err) {
      console.error("RevenueAnalytics error:", err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range]);

  const cards = [
    { title: "إجمالي الإيرادات (Gross)", val: formatPrice(stats?.grossRevenue || 0), icon: DollarSign, color: "text-emerald-500", sub: "قبل احتساب أي استرجاعات" },
    { title: "صافي الإيرادات (Net)", val: formatPrice(stats?.netRevenue || 0), icon: TrendingUp, color: "text-blue-500", sub: "بعد خصم المرتجعات" },
    { title: "المرتجعات والتعويضات", val: formatPrice(stats?.refunds || 0), icon: RotateCcw, color: "text-rose-500", sub: "شحنات مسترجعة تم تسويتها", alert: (stats?.refunds || 0) > 0 },
    { title: "متوسط قيمة الطلب (AOV)", val: formatPrice(stats?.averageOrderValue || 0), icon: ShoppingBag, color: "text-primary", sub: `معدل النمو: +${stats?.revenueGrowth || 0}%` },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">تحليلات الإيرادات والتدفق النقدي</h1>
            <p className="text-xs text-muted-foreground mt-0.5">تتبع المبيعات الإجمالية، المرتجعات، وتطور الإيرادات عبر الفترات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector onRangeChange={setRange} />
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 gap-1.5 text-xs font-mono">
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
              <div className="text-lg font-bold font-mono tabular-nums text-foreground">{loading ? "..." : c.val}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visual Area Chart */}
      {stats?.dailyRevenue && stats.dailyRevenue.length > 0 && (
        <div className="border border-border/70 rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" /> منحنى تطور الإيرادات اليومية
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={stats.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => formatPrice(Number(val) || 0)} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.25} name="الإيرادات" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Records Ledger Table */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">سجل الإيرادات اليومية</span>
          <span className="text-muted-foreground">الأيام المسجلة: <strong className="text-foreground font-mono">{stats?.dailyRevenue?.length || 0}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">التاريخ</th>
                <th className="py-2.5 px-3.5 text-center">عدد الطلبيات</th>
                <th className="py-2.5 px-3.5 text-center">إجمالي الإيرادات اليومية</th>
                <th className="py-2.5 px-3.5 text-center">متوسط قيمة الطلب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={4} className="py-4 px-3.5"><div className="h-4 bg-muted rounded w-3/4"></div></td></tr>
                ))
              ) : !stats?.dailyRevenue || stats.dailyRevenue.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">لا توجد بيانات إيرادات للفترة المحددة</p>
                  </td>
                </tr>
              ) : (
                stats.dailyRevenue.map((d, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-muted-foreground text-xs flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                      {d.date}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-foreground">
                      {d.orders.toLocaleString("en-US")}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(d.revenue)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono text-muted-foreground">
                      {formatPrice(d.orders > 0 ? d.revenue / d.orders : 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>إجمالي الإيرادات: <strong className="text-foreground font-mono">{formatPrice(stats?.grossRevenue || 0)}</strong></span>
          <span className="text-[11px]">يتم احتساب النمو بمقارنة الفترة الحالية بالفترة السابقة المكافئة</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
