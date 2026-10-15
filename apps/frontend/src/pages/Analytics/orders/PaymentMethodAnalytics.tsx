import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  Banknote,
  Truck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  PieChart as PieIcon,
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

interface PaymentStats {
  methods: Array<{
    name: string;
    count: number;
    revenue: number;
    percentage: number;
    averageOrderValue: number;
  }>;
  totalOrders: number;
  codVsOnline: {
    cod: { count: number; revenue: number; percentage: number };
    online: { count: number; revenue: number; percentage: number };
  };
  successRate: number;
  dailyTrends: Array<{ date: string; cod: number; online: number }>;
}

const PaymentMethodAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsService.getPaymentMethodsAnalytics(range?.startDate, range?.endDate);
      if (res?.success && res.data) {
        const data = res.data || {};
        const methodsData = Array.isArray(data) ? data : data.methods || [];
        const codData = methodsData.filter((m: any) => (m.name || "").toLowerCase().includes("cod") || (m.name || "").includes("نقد"));
        const onlineData = methodsData.filter((m: any) => !(m.name || "").toLowerCase().includes("cod") && !(m.name || "").includes("نقد"));
        const codTotal = codData.reduce((sum: number, m: any) => sum + (m.count || 0), 0);
        const codRevenue = codData.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0);
        const onlineTotal = onlineData.reduce((sum: number, m: any) => sum + (m.count || 0), 0);
        const onlineRevenue = onlineData.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0);
        const totalCount = codTotal + onlineTotal;

        setStats({
          methods: methodsData,
          totalOrders: data.totalOrders || totalCount || 0,
          codVsOnline: {
            cod: { count: codTotal, revenue: codRevenue, percentage: totalCount > 0 ? (codTotal / totalCount) * 100 : 0 },
            online: { count: onlineTotal, revenue: onlineRevenue, percentage: totalCount > 0 ? (onlineTotal / totalCount) * 100 : 0 },
          },
          successRate: data.successRate || 95,
          dailyTrends: data.dailyTrends || [],
        });
      }
    } catch (err: any) {
      console.error("PaymentMethodAnalytics error:", err);
      setError(err?.message || "فشل تحميل إحصائيات وسائل الدفع");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range]);

  const codVsOnlineChartData = stats
    ? [
        { name: "عند الاستلام (COD)", value: stats.codVsOnline.cod.count, color: "#F59E0B" },
        { name: "الدفع الإلكتروني", value: stats.codVsOnline.online.count, color: "#10B981" },
      ]
    : [];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t("paymentAnalytics.title", "تحليل وسائل وبوابات الدفع")}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("paymentAnalytics.subtitle", "مقارنة الدفع عند الاستلام (COD) بالدفع الإلكتروني، وتوزيع الإيرادات")}
          </p>
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
              <span>إجمالي الطلبات المحصلة</span>
              <CreditCard className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{(stats?.totalOrders || 0).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1">عبر جميع وسائل الدفع</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>عند الاستلام (COD)</span>
              <Truck className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {stats?.codVsOnline?.cod?.percentage?.toFixed(1) || 0}%
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">
              {(stats?.codVsOnline?.cod?.count || 0).toLocaleString()} طلب ({formatPrice(stats?.codVsOnline?.cod?.revenue || 0)})
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>الدفع الإلكتروني (Online)</span>
              <Banknote className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats?.codVsOnline?.online?.percentage?.toFixed(1) || 0}%
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">
              {(stats?.codVsOnline?.online?.count || 0).toLocaleString()} طلب ({formatPrice(stats?.codVsOnline?.online?.revenue || 0)})
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>نسبة نجاح السداد</span>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">{stats?.successRate || 95}%</div>
            <div className="text-[11px] text-muted-foreground mt-1">معدل العمليات المكتملة</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">توزيع الطلبات: COD مقابل أونلاين</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">نسبة التحصيل</span>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={codVsOnlineChartData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value" nameKey="name">
                    {codVsOnlineChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} formatter={(val: any) => [Number(val).toLocaleString(), "طلب"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 pt-3 border-t border-border/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                <span className="text-muted-foreground">عند الاستلام:</span>
                <span className="font-mono font-semibold text-foreground">{(stats?.codVsOnline?.cod?.count || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <span className="text-muted-foreground">أونلاين:</span>
                <span className="font-mono font-semibold text-foreground">{(stats?.codVsOnline?.online?.count || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-foreground">حجم الطلبات حسب وسيلة الدفع</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{stats?.methods?.length || 0} وسائل</span>
            </div>
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.methods || []} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="currentColor" className="text-muted-foreground" fontSize={11} width={110} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} formatter={(val: any) => [Number(val).toLocaleString(), "طلب"]} />
                  <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Methods Table */}
      {stats?.methods && stats.methods.length > 0 && (
        <Card className="border-border/70 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">تفاصيل أداء وإيرادات وسائل الدفع</h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">تقرير تفصيلي</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="py-2.5 px-4 text-right font-medium">وسيلة الدفع</th>
                  <th className="py-2.5 px-4 text-center font-medium">عدد الطلبات</th>
                  <th className="py-2.5 px-4 text-center font-medium">حصة الطلبات %</th>
                  <th className="py-2.5 px-4 text-center font-medium">إجمالي الإيرادات</th>
                  <th className="py-2.5 px-4 text-left font-medium">متوسط السلة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {stats.methods.map((method, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground">{method.name}</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-foreground font-semibold">{method.count.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-muted-foreground">{method.percentage?.toFixed(1) || 0}%</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(method.revenue || 0)}</td>
                    <td className="py-2.5 px-4 text-left font-mono tabular-nums text-muted-foreground">{formatPrice(method.averageOrderValue || 0)}</td>
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

export default PaymentMethodAnalytics;
