import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingCartIcon,
  XCircleIcon,
  BanknotesIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";

interface PrevPeriod {
  totalOrders: number;
  codOrders: number;
  prepaidOrders: number;
  cancelledOrders: number;
}

interface TrendEntry {
  date: string;
  orders: number;
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

  const statusColors: Record<string, string> = {
    completed: "bg-green-500",
    processing: "bg-blue-500",
    pending: "bg-yellow-500",
    cancelled: "bg-red-500",
    refunded: "bg-purple-500",
    "on-hold": "bg-orange-500",
    failed: "bg-gray-500",
    confirmed: "bg-blue-400",
    delivered: "bg-green-500",
    trash: "bg-gray-400",
    exchanged: "bg-purple-400",
    returned: "bg-indigo-500",
    scheduled: "bg-cyan-500",
    shipped: "bg-teal-500",
    ready_to_ship: "bg-sky-500",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
        <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const cards = [
    {
      label: "إجمالي الطلبات",
      value: totalOrders,
      prev: prevPeriod?.totalOrders,
      icon: <ShoppingCartIcon className="h-6 w-6 text-white" />,
      bg: "bg-blue-500",
      valueClass: "text-gray-900 dark:text-white",
    },
    {
      label: "الدفع عند الاستلام (COD)",
      value: codOrders,
      prev: prevPeriod?.codOrders,
      icon: <BanknotesIcon className="h-6 w-6 text-white" />,
      bg: "bg-orange-500",
      valueClass: "text-gray-900 dark:text-white",
    },
    {
      label: "الدفع المسبق",
      value: prepaidOrders,
      prev: prevPeriod?.prepaidOrders,
      icon: <CreditCardIcon className="h-6 w-6 text-white" />,
      bg: "bg-green-500",
      valueClass: "text-gray-900 dark:text-white",
    },
    {
      label: "الطلبات الملغاة",
      value: cancelledOrders,
      prev: prevPeriod?.cancelledOrders,
      icon: <XCircleIcon className="h-6 w-6 text-white" />,
      bg: "bg-red-500",
      valueClass: "text-red-600",
    },
  ];

  const hasOrders = totalOrders > 0 || Object.keys(byStatus).length > 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            تحليلات الطلبات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            تتبع وتحليل حالات الطلبات
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {period === "custom" && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
              <span className="text-gray-500">إلى</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </>
          )}
          <select
            value={comparisonType}
            onChange={(e) => setComparisonType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            {COMPARISONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const change = formatChange(card.value, card.prev);
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.valueClass}`}>
                    {card.value.toLocaleString()}
                  </p>
                  {change && (
                    <p
                      className={`text-xs mt-1 ${
                        change.startsWith("+")
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {change}{" "}
                      {comparisonType === "yoy"
                        ? "عن العام الماضي"
                        : "عن الفترة السابقة"}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${card.bg}`}>{card.icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Orders by Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          الطلبات حسب الحالة
        </h3>
        {Object.keys(byStatus).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(byStatus).map(([status, count]) => (
              <div
                key={status}
                className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div
                  className={`w-4 h-4 rounded-full ${statusColors[status] || "bg-gray-400"} mx-auto mb-2`}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {statusLabels[status] || status}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {count}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">لا توجد طلبات في هذه الفترة</p>
        )}
      </div>

      {/* Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            اتجاه الطلبات
          </h3>
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setTrendView(view)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  trendView === view
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {view === "daily" ? "يومي" : view === "weekly" ? "أسبوعي" : "شهري"}
              </button>
            ))}
          </div>
        </div>
        {trendData.length > 0 ? (
          <div className="min-w-0 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="stroke-gray-300 dark:stroke-gray-600"
                />
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  className="stroke-gray-600 dark:stroke-gray-400"
                  fontSize={12}
                />
                <YAxis
                  stroke="currentColor"
                  className="stroke-gray-600 dark:stroke-gray-400"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px" }}
                  wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="الطلبات"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">لا توجد بيانات للاتجاهات في هذه الفترة</p>
        )}
      </div>

      {/* COD vs Prepaid Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          الدفع عند الاستلام مقابل الدفع المسبق
        </h3>
        {totalOrders > 0 ? (
          <div className="min-w-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "الدفع عند الاستلام", value: codOrders },
                  { name: "الدفع المسبق", value: prepaidOrders },
                ]}
                layout="vertical"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="stroke-gray-300 dark:stroke-gray-600"
                />
                <XAxis
                  type="number"
                  stroke="currentColor"
                  className="stroke-gray-600 dark:stroke-gray-400"
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="currentColor"
                  className="stroke-gray-600 dark:stroke-gray-400"
                  width={120}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px" }}
                  wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">لا توجد بيانات للعرض</p>
        )}
      </div>
    </div>
  );
};

export default OrdersAnalytics;
