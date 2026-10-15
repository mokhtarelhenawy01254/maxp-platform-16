import React, { useState, useEffect, useMemo } from "react";
import {
  Ticket,
  RefreshCw,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface CouponItem {
  code: string;
  usageCount: number;
  discountAmount: number;
  revenue: number;
}

const CouponsAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [totalDiscounts, setTotalDiscounts] = useState(0);
  const [totalCouponOrders, setTotalCouponOrders] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getCouponsAnalytics(range?.startDate, range?.endDate);
      if (res?.success && res.data) {
        setCoupons(res.data.coupons || []);
        setTotalDiscounts(res.data.totalDiscounts || 0);
        setTotalCouponOrders(res.data.totalCouponOrders || 0);
      } else {
        setCoupons([]);
        setTotalDiscounts(0);
        setTotalCouponOrders(0);
      }
    } catch (err) {
      console.error("CouponsAnalytics error:", err);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range]);

  const totalRevenue = useMemo(() => coupons.reduce((sum, c) => sum + (c.revenue || 0), 0), [coupons]);
  const roi = useMemo(() => {
    if (totalDiscounts <= 0) return 0;
    return Math.round(((totalRevenue - totalDiscounts) / totalDiscounts) * 100);
  }, [totalRevenue, totalDiscounts]);

  const cards = [
    { title: "إجمالي الخصومات الممنوحة", val: formatPrice(totalDiscounts), icon: Percent, color: "text-rose-500", sub: `موزعة على ${coupons.length} كوبون نشط` },
    { title: "الطلبيات المستخدمة لكوبونات", val: totalCouponOrders.toLocaleString("en-US"), icon: Ticket, color: "text-blue-500", sub: `متوسط الخصم للطلب: ${totalCouponOrders > 0 ? formatPrice(totalDiscounts / totalCouponOrders) : formatPrice(0)}` },
    { title: "الإيرادات الناتجة عن الكوبونات", val: formatPrice(totalRevenue), icon: DollarSign, color: "text-emerald-500", sub: "مبيعات محققة بفضل العروض" },
    { title: "العائد الاستثماري (ROI)", val: `${roi}%`, icon: TrendingUp, color: "text-primary", sub: "معدل العائد لكل جنيه خصم" },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">تحليلات الكوبونات والخصومات الترويجية</h1>
            <p className="text-xs text-muted-foreground">تتبع استخدام أكواد الخصم، العائد التجاري، ونفقات التخفيضات</p>
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
              <div className="text-xl font-bold font-mono tabular-nums text-foreground">{loading ? "..." : c.val}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visual Chart: Top Coupons */}
      {coupons.length > 0 && (
        <div className="border border-border/70 rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-500" /> أكثر الكوبونات استخداماً
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={coupons.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                <YAxis dataKey="code" type="category" stroke="currentColor" className="text-muted-foreground" fontSize={11} width={110} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }} />
                <Bar dataKey="usageCount" fill="#8B5CF6" name="عدد الاستخدامات" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Table Chassis */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">جدول تفاصيل الكوبونات الفعالة</span>
          <span className="text-muted-foreground">عدد الأكواد: <strong className="text-foreground font-mono tabular-nums">{coupons.length}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">رمز الكوبون</th>
                <th className="py-2.5 px-3.5 text-center">مرات الاستخدام</th>
                <th className="py-2.5 px-3.5 text-center">إجمالي الخصم</th>
                <th className="py-2.5 px-3.5 text-center">الإيراد الناتج</th>
                <th className="py-2.5 px-3.5 text-center">حالة العائد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={5} className="py-4 px-3.5"><div className="h-4 bg-muted rounded w-3/4"></div></td></tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <Ticket className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">لم يتم استخدام كوبونات في الفترة المحددة</p>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon, idx) => {
                  const isHighDiscount = coupon.discountAmount > coupon.revenue * 0.3;
                  return (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-foreground text-sm flex items-center gap-1.5">
                        <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                        {coupon.code}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-foreground tabular-nums">
                        {coupon.usageCount.toLocaleString("en-US")}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatPrice(coupon.discountAmount)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatPrice(coupon.revenue)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {isHighDiscount ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            <AlertTriangle className="h-3 w-3" /> خصم مرتفع ({Math.round((coupon.discountAmount / (coupon.revenue || 1)) * 100)}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> أداء ربحي ممتاز
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>إجمالي الخصومات: <strong className="text-foreground font-mono tabular-nums">{formatPrice(totalDiscounts)}</strong></span>
          <span className="text-[11px]">مراقبة نسبة الخصم تمنع استنزاف هوامش الربح مع الحفاظ على الحافز البيعي</span>
        </div>
      </div>
    </div>
  );
};

export default CouponsAnalytics;
