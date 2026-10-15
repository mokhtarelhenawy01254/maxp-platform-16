import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Boxes,
  AlertTriangle,
  TrendingUp,
  PackageX,
  Archive,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface StockStats {
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    threshold: number;
  }>;
  fastMovingProducts: Array<{
    id: string;
    name: string;
    salesVelocity: number;
  }>;
  overstockedProducts: Array<{
    id: string;
    name: string;
    stock: number;
    avgSales: number;
  }>;
  totalLowStock: number;
  totalOutOfStock: number;
}

const StockAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<StockStats | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getStockForecastAnalytics(
        range?.period,
      );
      if (response?.success) {
        const data = response.data || {};
        setStats({
          lowStockProducts: data.lowStockProducts || [],
          fastMovingProducts: data.fastMovingProducts || [],
          overstockedProducts: data.overstockedProducts || [],
          totalLowStock: data.totalLowStock || 0,
          totalOutOfStock: data.totalOutOfStock || 0,
        });
      }
    } catch (err: any) {
      setError(err?.message || "فشل تحميل توقعات وحركة المخزون");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) {
      fetchData();
    }
  }, [range]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t("stockAnalytics.title", "توقعات ومؤشرات المخزون")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("stockAnalytics.subtitle", "مراقبة النواقص، معدل دوران الأصناف، وتنبؤات إعادة الطلب")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector onRangeChange={setRange} />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-mono border-border/70"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="h-7 text-xs border-destructive/30">
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Summary Telemetry Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>أوشك على النفاد</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {loading ? "..." : (stats?.totalLowStock || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              منتجات تحت حد إعادة الطلب
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>نفد من المخزون</span>
              <PackageX className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {loading ? "..." : (stats?.totalOutOfStock || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              أصناف رصيدها صفر حالياً
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>سريعة الحركة</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : (stats?.fastMovingProducts?.length || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              أعلى سرعة دوران وسحب
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>فائض / راكد</span>
              <Archive className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : (stats?.overstockedProducts?.length || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              أصناف تتجاوز كفاية الشهور
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Replenishment Alert Table */}
      {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
        <Card className="border-amber-500/30 bg-card overflow-hidden shadow-sm">
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-foreground">
                تنبيهات النواقص وإعادة الطلب العاجلة
              </h3>
            </div>
            <span className="font-mono font-medium text-amber-600 dark:text-amber-400 tabular-nums">
              {stats.lowStockProducts.length} صنف يتطلب توريداً
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/70 text-[11px] font-medium">
                <tr>
                  <th className="py-2.5 px-3.5">المنتج</th>
                  <th className="py-2.5 px-3.5 text-center">الرصيد الحالي</th>
                  <th className="py-2.5 px-3.5 text-center">الحد الأدنى (Threshold)</th>
                  <th className="py-2.5 px-3.5 text-left">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {stats.lowStockProducts.slice(0, 10).map((product) => (
                  <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-foreground">{product.name}</td>
                    <td className="py-2.5 px-3.5 text-center font-mono tabular-nums font-bold text-rose-500">
                      {product.stock}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono tabular-nums text-muted-foreground">
                      {product.threshold}
                    </td>
                    <td className="py-2.5 px-3.5 text-left">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">
                        {product.stock === 0 ? "نفد كلياً" : "حرج جداً"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Fast Moving Velocity Chart */}
      {stats?.fastMovingProducts && stats.fastMovingProducts.length > 0 && (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  سرعة سحب الأصناف الأكثر طلباً (Sales Velocity)
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                أعلى 10 أصناف نشاطاً
              </span>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.fastMovingProducts.slice(0, 10)}
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
                    width={130}
                    tickFormatter={(val) => val.length > 18 ? val.slice(0, 18) + "…" : val}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(val: any) => [val, "معدل السحب"]}
                  />
                  <Bar
                    dataKey="salesVelocity"
                    fill="#10B981"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overstocked Products Table */}
      {stats?.overstockedProducts && stats.overstockedProducts.length > 0 && (
        <Card className="border-border/70 bg-card overflow-hidden shadow-sm">
          <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-foreground">
                المخزون الفائض والراكد وتغطية الأشهر
              </h3>
            </div>
            <span className="text-muted-foreground font-mono tabular-nums">
              {stats.overstockedProducts.length} صنف
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/70 text-[11px] font-medium">
                <tr>
                  <th className="py-2.5 px-3.5">المنتج</th>
                  <th className="py-2.5 px-3.5 text-center">الرصيد المتاح</th>
                  <th className="py-2.5 px-3.5 text-center">متوسط المبيعات الشهري</th>
                  <th className="py-2.5 px-3.5 text-left">شهور التغطية المقدرة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {stats.overstockedProducts.map((product) => {
                  const monthsToSell =
                    product.avgSales > 0
                      ? Math.round(product.stock / product.avgSales)
                      : 999;
                  return (
                    <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3.5 font-medium text-foreground">{product.name}</td>
                      <td className="py-2.5 px-3.5 text-center font-mono tabular-nums text-foreground font-semibold">
                        {product.stock.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono tabular-nums text-muted-foreground">
                        {product.avgSales}
                      </td>
                      <td className="py-2.5 px-3.5 text-left font-mono tabular-nums">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          {monthsToSell > 12 ? "+12 شهر" : `${monthsToSell} شهر`}
                        </span>
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

export default StockAnalytics;
