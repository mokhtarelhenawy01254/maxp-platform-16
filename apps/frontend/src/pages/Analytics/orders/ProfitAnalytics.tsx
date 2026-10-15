import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Percent,
  Layers,
  RefreshCw,
  BarChart3,
  PieChart as PieIcon,
  ShoppingBag,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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

interface ProfitStats {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  cogs: number;
  dailyProfit: Array<{ date: string; profit: number; revenue: number; costs: number }>;
  profitByCategory: Array<{ name: string; profit: number; margin: number }>;
}

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"];

const ProfitAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<ProfitStats | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getProfitAnalytics(range?.period, range?.startDate, range?.endDate);
      if (res?.success && res.data) {
        const d = res.data;
        setStats({
          grossProfit: d.summary?.grossProfit ?? 0,
          netProfit: d.summary?.netProfit ?? 0,
          profitMargin: d.summary?.profitMargin ?? 0,
          cogs: d.summary?.totalCOGS ?? 0,
          dailyProfit: (d.dailyData || []).map((x: any) => ({
            date: x.date,
            profit: x.profit,
            revenue: x.revenue,
            costs: x.cogs,
          })),
          profitByCategory: (d.categoryBreakdown || []).map((c: any) => ({
            name: c.name,
            profit: c.profit,
            margin: c.margin,
          })),
        });
      } else {
        setStats(null);
      }
    } catch (err) {
      console.error("ProfitAnalytics error:", err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range]);

  const cards = [
    { title: "إجمالي الأرباح الإجمالية", val: formatPrice(stats?.grossProfit || 0), icon: DollarSign, color: "text-emerald-500", sub: "قبل احتساب تكاليف التشغيل" },
    { title: "صافي الأرباح المحققة", val: formatPrice(stats?.netProfit || 0), icon: TrendingUp, color: "text-blue-500", sub: "صافي الربح الفعلي" },
    { title: "هامش الربح الإجمالي", val: `${(stats?.profitMargin || 0).toFixed(1)}%`, icon: Percent, color: "text-primary", sub: "معدل العائد على الإيرادات" },
    { title: "تكلفة البضاعة المباعة (COGS)", val: formatPrice(stats?.cogs || 0), icon: Layers, color: "text-amber-500", sub: "تكاليف الإنتاج والشراء" },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">تحليلات الأرباح وهوامش العائد</h1>
            <p className="text-xs text-muted-foreground mt-0.5">تتبع الربح الإجمالي، تكاليف البضاعة المباعة، وهوامش ربحية التصنيفات</p>
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

      {/* Visual Chart: Daily Profit & Revenue */}
      {stats?.dailyProfit && stats.dailyProfit.length > 0 && (
        <div className="border border-border/70 rounded-xl bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" /> مسار الأرباح اليومية والإيرادات
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={stats.dailyProfit}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => formatPrice(Number(val) || 0)} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} name="الإيرادات" />
                <Area type="monotone" dataKey="profit" stroke="#10B981" fill="#10B981" fillOpacity={0.25} name="صافي الربح" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Margins Table */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">ربحية التصنيفات وهوامش المساهمة</span>
          <span className="text-muted-foreground">التصنيفات: <strong className="text-foreground font-mono">{stats?.profitByCategory?.length || 0}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">التصنيف</th>
                <th className="py-2.5 px-3.5 text-center">صافي الربح المحقق</th>
                <th className="py-2.5 px-3.5 text-center">هامش الربح (%)</th>
                <th className="py-2.5 px-3.5 text-center">مستوى الأداء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={4} className="py-4 px-3.5"><div className="h-4 bg-muted rounded w-3/4"></div></td></tr>
                ))
              ) : !stats?.profitByCategory || stats.profitByCategory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">لا توجد بيانات ربحية للتصنيفات في الفترة المحددة</p>
                  </td>
                </tr>
              ) : (
                stats.profitByCategory.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-foreground text-sm flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      {cat.name}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(cat.profit)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                        {cat.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                        cat.margin >= 40
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}>
                        {cat.margin >= 40 ? "عائد مرتفع" : "عائد مستقر"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>إجمالي تكلفة البضاعة: <strong className="text-foreground font-mono">{formatPrice(stats?.cogs || 0)}</strong></span>
          <span className="text-[11px]">يتم احتساب تكلفة البضاعة المباعة تلقائياً بناءً على أسعار الشراء المسجلة بالمنتجات</span>
        </div>
      </div>
    </div>
  );
};

export default ProfitAnalytics;
