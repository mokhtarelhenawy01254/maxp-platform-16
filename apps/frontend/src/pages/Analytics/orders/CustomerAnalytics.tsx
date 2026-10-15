import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  UserCheck,
  Repeat,
  DollarSign,
  ShoppingBag,
  Star,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { useCurrency } from "../../../hooks/useCurrency";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface CustomerStats {
  totalCustomers: number;
  repeatCustomers: number;
  newCustomers: number;
  repeatRate: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    orders: number;
    totalSpent: number;
    lastOrderDate: string;
  }>;
  customerSegments: Array<{ segment: string; count: number; revenue: number }>;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const CustomerAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsService.getCustomerQualityAnalytics(
        range?.period,
        range?.startDate,
        range?.endDate,
      );
      if (res?.success) {
        const d = res.data || {};
        setStats({
          totalCustomers: d.totalCustomers || 0,
          repeatCustomers: d.repeatCustomers || 0,
          newCustomers: d.newCustomers || 0,
          repeatRate: d.repeatRate || 0,
          averageOrderValue: d.averageOrderValue || 0,
          customerLifetimeValue: d.customerLifetimeValue || 0,
          topCustomers: d.topCustomers || [],
          customerSegments: d.segments || [
            { segment: t("customerAnalytics.vip", "عملاء VIP"), count: 0, revenue: 0 },
            { segment: t("customerAnalytics.active", "نشطون"), count: 0, revenue: 0 },
            { segment: t("customerAnalytics.atRisk", "معرضون للفقد"), count: 0, revenue: 0 },
            { segment: t("customerAnalytics.lost", "مفقودون"), count: 0, revenue: 0 },
          ],
        });
      }
    } catch (err: any) {
      console.error("CustomerAnalytics error:", err);
      setError(err?.message || "فشل تحميل إحصائيات وجودة العملاء");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range]);

  const customerDistributionData = stats
    ? [
        { name: t("customerAnalytics.repeatCustomers", "عملاء متكررون"), value: stats.repeatCustomers },
        { name: t("customerAnalytics.newCustomers", "عملاء جدد"), value: stats.newCustomers },
      ]
    : [];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t("customerAnalytics.title", "تحليل وجودة العملاء")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("customerAnalytics.subtitle", "معدلات تكرار الشراء، القيمة الدائمة للعملاء (LTV)، وتصنيف الشرائح")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector onRangeChange={setRange} />
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 gap-1.5 text-xs font-mono border-border/70">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="h-7 text-xs border-destructive/30">إعادة المحاولة</Button>
        </div>
      )}

      {/* Telemetry Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>إجمالي قاعدة العملاء</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground">{(stats?.totalCustomers || 0).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">إجمالي العملاء المسجلين</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>عملاء متكررون</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{(stats?.repeatCustomers || 0).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-mono tabular-nums">معدل تكرار {stats?.repeatRate?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>متوسط السلة (AOV)</span>
              <ShoppingBag className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground">{formatPrice(stats?.averageOrderValue || 0)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">لكل طلب مسجل</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>القيمة الدائمة (LTV)</span>
              <DollarSign className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">{formatPrice(stats?.customerLifetimeValue || 0)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">العائد التراكمي المتوقع</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Customer Distribution & Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-foreground">توزيع العملاء (جدد مقابل متكررون)</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">نسبة الولاء</span>
            </div>
            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={customerDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" nameKey="name">
                    {customerDistributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} formatter={(val: any) => [Number(val).toLocaleString(), "عميل"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 pt-2.5 border-t border-border/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                <span className="text-muted-foreground">متكرر:</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">{(stats?.repeatCustomers || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span className="text-muted-foreground">جديد:</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">{(stats?.newCustomers || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">شرائح سلوك وتفاعل العملاء</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">تصنيف المحفظة</span>
            </div>
            <div className="h-[265px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.customerSegments || []} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="segment" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} formatter={(val: any) => [Number(val).toLocaleString(), "عميل"]} />
                  <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Leaderboard Table */}
      {stats?.topCustomers && stats.topCustomers.length > 0 && (
        <Card className="border-border/70 bg-card overflow-hidden shadow-sm">
          <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-foreground">كبار العملاء الأكثر إنفاقاً (VIPs)</h3>
            </div>
            <span className="text-muted-foreground font-mono tabular-nums">أعلى {stats.topCustomers.length} عملاء</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/70 text-[11px] font-medium">
                <tr>
                  <th className="py-2.5 px-3.5 text-center font-medium w-12">#</th>
                  <th className="py-2.5 px-3.5 font-medium">اسم العميل</th>
                  <th className="py-2.5 px-3.5 font-medium">البريد الإلكتروني</th>
                  <th className="py-2.5 px-3.5 text-center font-medium">عدد الطلبات</th>
                  <th className="py-2.5 px-3.5 text-center font-medium">إجمالي الإنفاق</th>
                  <th className="py-2.5 px-3.5 text-left font-medium">آخر طلب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {stats.topCustomers.map((customer, index) => (
                  <tr key={customer.id || index} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 text-center font-mono text-muted-foreground">{index + 1}</td>
                    <td className="py-2.5 px-3.5 font-medium text-foreground">{customer.name}</td>
                    <td className="py-2.5 px-3.5 text-muted-foreground font-mono dir-ltr text-right">{customer.email || "-"}</td>
                    <td className="py-2.5 px-3.5 text-center font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">{customer.orders}</td>
                    <td className="py-2.5 px-3.5 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(customer.totalSpent)}</td>
                    <td className="py-2.5 px-3.5 text-left font-mono tabular-nums text-muted-foreground">
                      {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US") : "-"}
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

export default CustomerAnalytics;
