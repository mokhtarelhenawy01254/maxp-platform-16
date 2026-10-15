import React, { useState, useEffect, useMemo } from "react";
import {
  FolderTree,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Layers,
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
import { useCurrency } from "../../../hooks/useCurrency";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface CategoryStatItem {
  name: string;
  orders: number;
  revenue: number;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#EF4444", "#84CC16"];

const CategoriesAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [categories, setCategories] = useState<CategoryStatItem[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getCategoriesAnalytics(range?.startDate, range?.endDate);
      if (res?.success && res.data) {
        let list: CategoryStatItem[] = [];
        if (Array.isArray(res.data)) list = res.data;
        else if (Array.isArray(res.data.categories)) list = res.data.categories;
        else if (typeof res.data === "object") {
          list = Object.values(res.data).filter((item: any) => item && typeof item === "object" && item.name);
        }
        setCategories(list);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error("CategoriesAnalytics error:", err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range]);

  const totalRevenue = useMemo(() => categories.reduce((sum, c) => sum + (c.revenue || 0), 0), [categories]);
  const totalOrders = useMemo(() => categories.reduce((sum, c) => sum + (c.orders || 0), 0), [categories]);
  const topCategory = useMemo(() => {
    if (categories.length === 0) return null;
    return [...categories].sort((a, b) => b.revenue - a.revenue)[0];
  }, [categories]);

  const cards = [
    { title: "إجمالي إيرادات التصنيفات", val: formatPrice(totalRevenue), icon: DollarSign, color: "text-emerald-500", sub: `موزعة على ${categories.length} تصنيف` },
    { title: "إجمالي الطلبيات", val: totalOrders.toLocaleString("en-US"), icon: ShoppingBag, color: "text-blue-500", sub: `متوسط الطلب: ${totalOrders > 0 ? formatPrice(totalRevenue / totalOrders) : formatPrice(0)}` },
    { title: "التصنيف الأكثر مبيعاً", val: topCategory?.name || "—", icon: TrendingUp, color: "text-primary", sub: topCategory ? formatPrice(topCategory.revenue) : "لا توجد بيانات" },
    { title: "متوسط إيراد التصنيف", val: categories.length > 0 ? formatPrice(totalRevenue / categories.length) : formatPrice(0), icon: Layers, color: "text-indigo-500", sub: "معدل العائد لكل فئة" },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <FolderTree className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">تحليلات المبيعات حسب التصنيفات</h1>
            <p className="text-xs text-muted-foreground mt-0.5">مقارنة أداء الفئات وتوزيع الإيرادات وكميات الطلبات</p>
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
        {/* Revenue Pie */}
        <div className="border border-border/70 rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" /> توزيع الإيرادات حسب الفئات
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={categories} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="revenue" nameKey="name">
                  {categories.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatPrice(Number(val) || 0)} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Bar Chart */}
        <div className="border border-border/70 rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" /> عدد الطلبيات لكل تصنيف
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={categories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={110} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                <Bar dataKey="orders" fill="#10B981" name="الطلبات" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table Chassis */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">تفاصيل أداء التصنيفات</span>
          <span className="text-muted-foreground">عدد التصنيفات: <strong className="text-foreground font-mono">{categories.length}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">التصنيف</th>
                <th className="py-2.5 px-3.5 text-center">عدد الطلبيات</th>
                <th className="py-2.5 px-3.5 text-center">إجمالي الإيرادات</th>
                <th className="py-2.5 px-3.5 text-center">نسبة المساهمة</th>
                <th className="py-2.5 px-3.5 text-center">معدل حجم السلة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={5} className="py-4 px-3.5"><div className="h-4 bg-muted rounded w-3/4"></div></td></tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <FolderTree className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">لا توجد بيانات للفترة المحددة</p>
                  </td>
                </tr>
              ) : (
                categories.map((cat, idx) => {
                  const pct = totalRevenue > 0 ? ((cat.revenue / totalRevenue) * 100).toFixed(1) : "0.0";
                  const aov = cat.orders > 0 ? cat.revenue / cat.orders : 0;
                  return (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3.5 font-medium text-foreground text-sm flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        {cat.name}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-foreground">
                        {cat.orders.toLocaleString("en-US")}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(cat.revenue)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
                          {pct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-muted-foreground">
                        {formatPrice(aov)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>إجمالي القيمة: <strong className="text-foreground font-mono">{formatPrice(totalRevenue)}</strong></span>
          <span className="text-[11px]">يتم تحديث نسب التصنيفات دورياً بناءً على فواتير المبيعات الصادرة</span>
        </div>
      </div>
    </div>
  );
};

export default CategoriesAnalytics;
