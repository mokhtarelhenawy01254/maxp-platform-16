import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  RotateCcw,
  AlertCircle,
  TrendingDown,
  DollarSign,
  Package,
  MapPin,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import { useCurrency } from "../../../hooks/useCurrency";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface ReturnSummary {
  totalOrders: number;
  totalReturns: number;
  returnRate: number;
  totalLostRevenue: number;
  avgReturnValue: number;
}

interface ProductReturn {
  name: string;
  returns: number;
  lostRevenue: number;
}

interface RegionReturn {
  name: string;
  returns: number;
  lostRevenue: number;
}

interface ReturnsData {
  summary: ReturnSummary;
  topReturnedProducts: ProductReturn[];
  returnsByRegion: RegionReturn[];
}

const ReturnsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [data, setData] = useState<ReturnsData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getReturnsAnalytics(
        range?.startDate,
        range?.endDate,
      );
      if (response?.success && response.data) {
        setData(response.data);
      } else {
        setData({
          summary: { totalOrders: 0, totalReturns: 0, returnRate: 0, totalLostRevenue: 0, avgReturnValue: 0 },
          topReturnedProducts: [],
          returnsByRegion: [],
        });
      }
    } catch (err: any) {
      console.error("ReturnsAnalytics error:", err);
      setError(err?.message || "فشل تحميل إحصائيات المرتجعات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) {
      fetchData();
    }
  }, [range]);

  const summary = data?.summary || {
    totalOrders: 0,
    totalReturns: 0,
    returnRate: 0,
    totalLostRevenue: 0,
    avgReturnValue: 0,
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-rose-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t("returnsAnalytics.title", "تحليل المرتجعات والإلغاءات")}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("returnsAnalytics.subtitle", "تتبع أسباب المرتجعات، الخسائر المالية، ومعدلات الرجوع بالمنتج والمنطقة")}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <PeriodSelector onRangeChange={setRange} />
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

      {/* Telemetry Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي المرتجعات</span>
              <RotateCcw className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {summary.totalReturns.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>من أصل</span>
              <span className="font-mono">{summary.totalOrders.toLocaleString()}</span>
              <span>طلب كلي</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>معدل المرتجعات</span>
              <TrendingDown className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {summary.returnRate.toFixed(1)}%
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              نسبة الشحنات المسترجعة
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>الإيراد المفقود</span>
              <DollarSign className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {formatPrice(summary.totalLostRevenue)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              قيمة البضائع العائدة
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>متوسط قيمة المرتجع</span>
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {formatPrice(summary.avgReturnValue)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              للكل شحنة مسترجعة
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Returned Products */}
        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold text-foreground">أعلى المنتجات مرتجعاً</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {(data?.topReturnedProducts || []).length} أصناف
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.topReturnedProducts || []}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                    width={110}
                    tickFormatter={(val) => val.length > 15 ? val.slice(0, 15) + "…" : val}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: any, name: string) => [
                      name === "lostRevenue" ? formatPrice(Number(value)) : value,
                      name === "lostRevenue" ? "الخسارة" : "عدد المرتجعات",
                    ]}
                  />
                  <Bar dataKey="returns" name="returns" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Returns by Region */}
        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">المرتجعات حسب المنطقة</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {(data?.returnsByRegion || []).length} محافظات
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.returnsByRegion || []}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                  <YAxis
                    dataKey="name"
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
                    formatter={(value: any, name: string) => [
                      name === "lostRevenue" ? formatPrice(Number(value)) : value,
                      name === "lostRevenue" ? "الخسارة" : "عدد المرتجعات",
                    ]}
                  />
                  <Bar dataKey="returns" name="returns" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Top Returned Products Table */}
      {data?.topReturnedProducts && data.topReturnedProducts.length > 0 && (
        <Card className="border-border/70 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">تفاصيل المنتجات الأكثر ارتداداً</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="py-2.5 px-4 text-right font-medium">اسم المنتج</th>
                  <th className="py-2.5 px-4 text-center font-medium">عدد المرتجعات</th>
                  <th className="py-2.5 px-4 text-left font-medium">الخسارة التقديرية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.topReturnedProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground">{p.name}</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-rose-500 font-semibold">
                      {p.returns.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono tabular-nums text-muted-foreground">
                      {formatPrice(p.lostRevenue || 0)}
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

export default ReturnsAnalytics;
