import React, { useState, useEffect } from "react";
import {
  Scale,
  DollarSign,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  PieChart,
  ShoppingBag,
  Info
} from "lucide-react";
import { companyAwareApi } from "../../services/companyAwareApi";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";

interface PLStats {
  revenue: number;
  cogs: number; // Cost of Goods Sold
  grossProfit: number;
  netMargin: string;
  orderCount?: number;
}

const ProfitLossReport: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<PLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const handleQuickPreset = (days: number) => {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    setDateRange({ start, end });
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get(
        `/reports/profit-loss?startDate=${dateRange.start}&endDate=${dateRange.end}`,
      );
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching P&L stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const revenue = stats?.revenue || 0;
  const cogs = stats?.cogs || 0;
  const grossProfit = stats?.grossProfit || (revenue - cogs);
  const cogsPercent = revenue > 0 ? Math.min(100, Math.round((cogs / revenue) * 100)) : 0;
  const profitPercent = revenue > 0 ? Math.max(0, 100 - cogsPercent) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 space-y-6" dir="rtl">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                تقرير الأرباح والخسائر التشغيلي
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                مراجعة وتحليل التدفقات المالية، هوامش الربحية وكلفة البضاعة المبيعة
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Pills */}
          <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/60 text-xs">
            <button
              onClick={() => handleQuickPreset(7)}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              7 أيام
            </button>
            <button
              onClick={() => handleQuickPreset(30)}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-background text-foreground shadow-xs"
            >
              30 يوم
            </button>
            <button
              onClick={() => handleQuickPreset(90)}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              90 يوم
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-card border border-border/70 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="bg-transparent text-xs text-foreground focus:outline-hidden"
            />
            <span className="text-muted-foreground">إلى</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="bg-transparent text-xs text-foreground focus:outline-hidden"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
            className="h-8 px-2.5 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                إجمالي الإيرادات المحققة
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : formatPrice(revenue)}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>مبيعات موثقة للفترة المحددة</span>
            </div>
          </CardContent>
        </Card>

        {/* COGS */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                كلفة البضاعة المباعة (COGS)
              </span>
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {loading ? "..." : formatPrice(cogs)}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>نسبة التكلفة من الإيراد</span>
              <span className="font-mono tabular-nums font-semibold">{cogsPercent}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Gross Profit */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                إجمالي الأرباح التشغيلية
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : formatPrice(grossProfit)}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>الفائض بعد كلفة البضاعة</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{profitPercent}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Operating Margin */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                هامش الربح التشغيلي
              </span>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : (stats?.netMargin || `${profitPercent}%`)}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-blue-500" />
              <span>معدل الربح الصافي على المبيعات</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Distribution Chassis */}
      <Card className="bg-card border-border/70 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <span>توزيع التدفقات والنسب الهيكلية (Revenue Breakdown)</span>
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              نسبة التكلفة إلى صافي الربح
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          {/* Dual Segment Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                صافي الربح ({profitPercent}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                كلفة البضاعة ({cogsPercent}%)
              </span>
            </div>

            <div className="h-4 w-full bg-muted/60 rounded-full overflow-hidden flex border border-border/50">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${profitPercent}%` }}
                title={`Profit: ${profitPercent}%`}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${cogsPercent}%` }}
                title={`COGS: ${cogsPercent}%`}
              />
            </div>
          </div>

          {/* Detailed Financial Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="text-xs text-muted-foreground">حجم التدفقات الواردة</div>
              <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                {formatPrice(revenue)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                يشمل كافة قيم الطلبات المكتملة والمحصلة
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="text-xs text-muted-foreground">تكاليف التوريد والمخزون</div>
              <div className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {formatPrice(cogs)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                قيمة شراء المنتجات المسحوبة من المستودعات
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
              <div className="text-xs text-muted-foreground">العائد التشغيلي الصافي</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatPrice(grossProfit)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                الفائض التشغيلي المتاح لتغطية المصاريف التسويقية والإدارية
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitLossReport;
