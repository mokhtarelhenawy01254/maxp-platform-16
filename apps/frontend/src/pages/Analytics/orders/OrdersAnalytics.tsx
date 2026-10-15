import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingCart,
  XCircle,
  Banknote,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Calendar,
} from "lucide-react";
import analyticsService from "../../../services/analyticsService";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { OrdersAnalyticsCharts, TrendEntry } from "./OrdersAnalyticsCharts";

interface PrevPeriod {
  totalOrders: number;
  codOrders: number;
  prepaidOrders: number;
  cancelledOrders: number;
}

const aggregateByWeek = (data: TrendEntry[]): TrendEntry[] => {
  const map: Record<string, number> = {};
  for (const d of data) {
    const dt = new Date(d.date);
    const start = new Date(dt);
    start.setDate(dt.getDate() - dt.getDay());
    const key = start.toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + d.orders;
  }
  return Object.entries(map).map(([week, orders]) => ({ date: week, orders }));
};

const aggregateByMonth = (data: TrendEntry[]): TrendEntry[] => {
  const map: Record<string, number> = {};
  for (const d of data) {
    const key = d.date.slice(0, 7);
    map[key] = (map[key] || 0) + d.orders;
  }
  return Object.entries(map).map(([month, orders]) => ({ date: month, orders }));
};

const formatChange = (current: number, prev: number | undefined): string | null => {
  if (prev === undefined || prev === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
};

const PERIODS = [
  { value: "today", label: "اليوم" },
  { value: "yesterday", label: "أمس" },
  { value: "7", label: "آخر 7 أيام" },
  { value: "14", label: "آخر 14 يوم" },
  { value: "30", label: "آخر 30 يوم" },
  { value: "90", label: "آخر 3 شهور" },
  { value: "180", label: "آخر 6 شهور" },
  { value: "365", label: "آخر سنة" },
  { value: "730", label: "آخر سنتين" },
  { value: "custom", label: "فترة مخصصة" },
];

const COMPARISONS = [
  { value: "previous", label: "الفترة السابقة" },
  { value: "yoy", label: "نفس الفترة العام الماضي" },
  { value: "none", label: "بدون مقارنة" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const statusLabels: Record<string, string> = {
  completed: "مكتمل",
  processing: "قيد المعالجة",
  pending: "قيد الانتظار",
  cancelled: "ملغي",
  refunded: "مسترد",
  "on-hold": "معلق",
  failed: "فاشل",
  confirmed: "مؤكد",
  delivered: "تم التوصيل",
  trash: "محذوف",
  exchanged: "مستبدل",
  returned: "مرتجع",
  scheduled: "مجدول",
  shipped: "تم الشحن",
  ready_to_ship: "جاهز للشحن",
};

const OrdersAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30");
  const [comparisonType, setComparisonType] = useState("previous");
  const [customStart, setCustomStart] = useState(daysAgo(30));
  const [customEnd, setCustomEnd] = useState(todayStr());
  const [totalOrders, setTotalOrders] = useState(0);
  const [codOrders, setCodOrders] = useState(0);
  const [prepaidOrders, setPrepaidOrders] = useState(0);
  const [cancelledOrders, setCancelledOrders] = useState(0);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [prevPeriod, setPrevPeriod] = useState<PrevPeriod | null>(null);
  const [dailyData, setDailyData] = useState<TrendEntry[]>([]);
  const [trendView, setTrendView] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    fetchData();
  }, [period, comparisonType, customStart, customEnd]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const isCustom = period === "custom";
      const p = isCustom ? "365" : period;
      const sd = isCustom ? customStart : undefined;
      const ed = isCustom ? customEnd : undefined;

      const [storeData, dailyRes] = await Promise.all([
        analyticsService.getStoreAnalytics(p, sd, ed, comparisonType),
        analyticsService.getDailyAnalytics(p, sd, ed),
      ]);

      if (storeData.success) {
        const d = storeData.data;
        setTotalOrders(d.totalOrders || 0);
        setCodOrders(d.codOrders || 0);
        setPrepaidOrders(d.prepaidOrders || 0);
        setCancelledOrders(d.cancelledOrders || 0);
        setByStatus(d.ordersByStatus || {});
        setPrevPeriod(d.prevPeriod || null);
      }

      if (dailyRes.success) {
        const raw = (dailyRes.data || []) as any[];
        setDailyData(
          raw.map((r: any) => ({
            date: r.date,
            orders: r.totalPurchases || 0,
          })),
        );
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ في جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const trendData = useMemo(() => {
    if (trendView === "weekly") return aggregateByWeek(dailyData);
    if (trendView === "monthly") return aggregateByMonth(dailyData);
    return dailyData;
  }, [dailyData, trendView]);

  const cards = [
    {
      label: "إجمالي الطلبات",
      value: totalOrders,
      prev: prevPeriod?.totalOrders,
      icon: ShoppingCart,
      color: "text-blue-500",
      valueClass: "text-foreground",
    },
    {
      label: "الدفع عند الاستلام (COD)",
      value: codOrders,
      prev: prevPeriod?.codOrders,
      icon: Banknote,
      color: "text-amber-500",
      valueClass: "text-foreground",
    },
    {
      label: "الدفع المسبق",
      value: prepaidOrders,
      prev: prevPeriod?.prepaidOrders,
      icon: CreditCard,
      color: "text-emerald-500",
      valueClass: "text-foreground",
    },
    {
      label: "الطلبات الملغاة",
      value: cancelledOrders,
      prev: prevPeriod?.cancelledOrders,
      icon: XCircle,
      color: "text-rose-500",
      valueClass: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">تحليلات حجم وحالات الطلبات</h1>
            <p className="text-xs text-muted-foreground">تتبع تدفق المبيعات، الطلبات بحسب طريقة الدفع، ومؤشرات الإلغاء</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-8 px-2.5 border border-border/70 rounded-md bg-card text-foreground text-xs font-mono"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {period === "custom" && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 px-2 border border-border/70 rounded-md bg-card text-foreground text-xs font-mono"
              />
              <span className="text-muted-foreground text-xs">إلى</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 px-2 border border-border/70 rounded-md bg-card text-foreground text-xs font-mono"
              />
            </div>
          )}
          <select
            value={comparisonType}
            onChange={(e) => setComparisonType(e.target.value)}
            className="h-8 px-2.5 border border-border/70 rounded-md bg-card text-foreground text-xs font-mono"
          >
            {COMPARISONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 gap-1.5 text-xs font-mono border-border/70">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} /> تحديث
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const change = formatChange(card.value, card.prev);
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border/70 bg-card shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{card.label}</span>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className={`text-xl font-bold font-mono tabular-nums ${card.valueClass}`}>
                  {loading ? "..." : card.value.toLocaleString()}
                </div>
                {change && (
                  <div
                    className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                      change.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {change} {comparisonType === "yoy" ? "عن العام الماضي" : "عن الفترة السابقة"}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Orders by Status Grid */}
      <Card className="border-border/70 bg-card shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">الطلبات موزعة حسب الحالة التشغيلية</span>
          <span className="text-muted-foreground font-mono tabular-nums">{Object.keys(byStatus).length} حالات نشطة</span>
        </div>
        <CardContent className="p-4">
          {Object.keys(byStatus).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {Object.entries(byStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="p-3 bg-muted/15 border border-border/50 rounded-lg text-center"
                >
                  <p className="text-[11px] text-muted-foreground mb-1 truncate">
                    {statusLabels[status] || status}
                  </p>
                  <p className="text-base font-bold font-mono tabular-nums text-foreground">
                    {count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6 text-xs">لا توجد طلبات مسجلة في هذه الفترة</p>
          )}
        </CardContent>
      </Card>

      {/* Visual Analytics Charts */}
      <OrdersAnalyticsCharts
        trendData={trendData}
        trendView={trendView}
        onTrendViewChange={setTrendView}
        totalOrders={totalOrders}
        codOrders={codOrders}
        prepaidOrders={prepaidOrders}
      />
    </div>
  );
};

export default OrdersAnalytics;
