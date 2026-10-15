import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  RefreshCw,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { useCurrency } from "../../../hooks/useCurrency";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface RegionItem {
  name: string;
  orders: number;
  revenue: number;
  deliveryRate: number;
  codAcceptanceRate: number;
}

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#EF4444"];

const RegionAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [regions, setRegions] = useState<RegionItem[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getRegionAnalytics(range?.startDate, range?.endDate);
      if (res?.success && res.data) {
        setRegions(res.data.regions || []);
      } else {
        setRegions([]);
      }
    } catch (err) {
      console.error("RegionAnalytics error:", err);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range]);

  const totalRevenue = useMemo(() => regions.reduce((sum, r) => sum + (r.revenue || 0), 0), [regions]);
  const totalOrders = useMemo(() => regions.reduce((sum, r) => sum + (r.orders || 0), 0), [regions]);
  const topRegion = useMemo(() => {
    if (regions.length === 0) return null;
    return [...regions].sort((a, b) => b.revenue - a.revenue)[0];
  }, [regions]);

  const avgDelivery = useMemo(() => {
    if (regions.length === 0) return 0;
    return regions.reduce((sum, r) => sum + (r.deliveryRate || 0), 0) / regions.length;
  }, [regions]);

  const cards = [
    { title: "إجمالي إيرادات المحافظات", val: formatPrice(totalRevenue), icon: DollarSign, color: "text-emerald-500", sub: `موزعة على ${regions.length} محافظة` },
    { title: "إجمالي الطلبيات المسجلة", val: totalOrders.toLocaleString("en-US"), icon: TrendingUp, color: "text-blue-500", sub: `متوسط الطلب: ${totalOrders > 0 ? formatPrice(totalRevenue / totalOrders) : formatPrice(0)}` },
    { title: "المحافظة الأعلى طلباً", val: topRegion?.name || "—", icon: MapPin, color: "text-primary", sub: topRegion ? `${topRegion.orders} طلب (${formatPrice(topRegion.revenue)})` : "لا توجد بيانات" },
    { title: "متوسط نسبة التسليم", val: `${avgDelivery.toFixed(1)}%`, icon: CheckCircle2, color: "text-indigo-500", sub: "معدل الإتمام عبر المحافظات" },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">تحليلات الأداء الجغرافي والمحافظات</h1>
            <p className="text-xs text-muted-foreground mt-0.5">توزيع حجم المبيعات، نسب التسليم، ومعدل قبول الدفع عند الاستلام جغرافياً</p>
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
              <div className="text-lg font-bold font-mono tabular-nums text-foreground truncate">{loading ? "..." : c.val}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Region Bar */}
        <div className="border border-border/70 rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" /> إجمالي الإيرادات حسب المحافظة
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={regions} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={90} />
                <Tooltip formatter={(val) => formatPrice(Number(val) || 0)} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                <Bar dataKey="revenue" fill="#10B981" name="الإيراد" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Distribution Pie */}
        <div className="border border-border/70 rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" /> حصة الطلبيات لكل محافظة
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={regions} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="orders" nameKey="name">
                  {regions.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table Chassis */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">سجل مؤشرات المحافظات</span>
          <span className="text-muted-foreground">عدد المناطق: <strong className="text-foreground font-mono">{regions.length}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">المحافظة / النطاق</th>
                <th className="py-2.5 px-3.5 text-center">عدد الطلبات</th>
                <th className="py-2.5 px-3.5 text-center">إجمالي الإيرادات</th>
                <th className="py-2.5 px-3.5 text-center">نسبة التسليم الناجح</th>
                <th className="py-2.5 px-3.5 text-center">قبول الدفع عند الاستلام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={5} className="py-4 px-3.5"><div className="h-4 bg-muted rounded w-3/4"></div></td></tr>
                ))
              ) : regions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">لا توجد بيانات جغرافية للفترة المحددة</p>
                  </td>
                </tr>
              ) : (
                regions.map((region, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-foreground text-sm flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      {region.name}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-foreground">
                      {region.orders.toLocaleString("en-US")}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(region.revenue)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                        {region.deliveryRate ? region.deliveryRate.toFixed(1) : "0.0"}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-bold">
                        {region.codAcceptanceRate ? region.codAcceptanceRate.toFixed(1) : "0.0"}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>إجمالي مبيعات المناطق: <strong className="text-foreground font-mono">{formatPrice(totalRevenue)}</strong></span>
          <span className="text-[11px]">مقارنة مؤشرات المحافظات تساعد في اختيار مناطق الإعلانات الأكثر ربحية وأقل ارتداداً</span>
        </div>
      </div>
    </div>
  );
};

export default RegionAnalytics;
