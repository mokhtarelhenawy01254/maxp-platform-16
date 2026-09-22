import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ChartBarIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  CreditCardIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathRoundedSquareIcon,
  TruckIcon,
  BanknotesIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import DeferredResponsiveContainer from "../../components/ui/DeferredResponsiveContainer";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { companyAwareApi } from "../../services/companyAwareApi";
import analyticsService from "../../services/analyticsService";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { getStatusDisplay } from "../../utils/statusRegistry";

interface OrderMetrics {
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveryRate: number;
  cancellationRate: number;
  returnRate: number;
  netRealizedRevenue: number;
  deliveredRevenue: number;
  returnedRevenue: number;
  cancelledRevenue: number;
  codOrdersCount: number;
  codOrdersRevenue: number;
  codDeliveredCount: number;
  codDeliveredRevenue: number;
  codCollectionRate: number;
  prepaidOrdersCount: number;
  prepaidOrdersRevenue: number;
  totalShippingFees: number;
}

interface GovernorateDetail {
  name: string;
  ordersCount: number;
  deliveredCount: number;
  cancelledCount: number;
  returnedCount: number;
  revenue: number;
  shippingCost: number;
  deliveryRate: number;
  returnRate: number;
  sharePct: number;
}

interface ShippingPerformance {
  name: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  inTransitOrders: number;
  deliveryRate: number;
  returnRate: number;
  totalRevenue: number;
  codCollected: number;
  lostShipping: number;
}

interface DailyTrendEntry {
  date: string;
  orders: number;
  revenue: number;
  delivered: number;
  cancelled: number;
  returned: number;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalPieces: number;
  avgPiecesPerOrder: number;
  avgOrdersPerDay: number;
  daysInPeriod: number;
  statusDistribution: Record<string, number>;
  statusPiecesDistribution: Record<string, number>;
  governorateStats: Record<string, number>;
  paymentStats: Record<string, number>;
  metrics?: OrderMetrics;
  governorateDetails?: GovernorateDetail[];
  shippingPerformance?: ShippingPerformance[];
  dailyTrend?: DailyTrendEntry[];
}

interface SalesProduct {
  productId: string;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  averagePrice: number;
  unitsPerOrder: number;
}

type PeriodKey =
  | "today"
  | "yesterday"
  | "thisMonth"
  | "lastMonth"
  | "7"
  | "30"
  | "90"
  | "180"
  | "365"
  | "custom";

const PERIOD_OPTIONS: { key: PeriodKey; labelKey: string }[] = [
  { key: "today", labelKey: "orders.today" },
  { key: "yesterday", labelKey: "orders.yesterday" },
  { key: "thisMonth", labelKey: "orders.thisMonth" },
  { key: "lastMonth", labelKey: "orders.lastMonth" },
  { key: "7", labelKey: "orders.last7Days" },
  { key: "30", labelKey: "orders.last30Days" },
  { key: "90", labelKey: "orders.last90Days" },
  { key: "180", labelKey: "orders.last6Months" },
  { key: "365", labelKey: "orders.lastYear" },
  { key: "custom", labelKey: "orders.customPeriod" },
];

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const getInitialDateRange = () => {
  const today = new Date();
  const dateStr = toISODate(today);
  return { start: dateStr, end: dateStr };
};

const getPaymentMethodLabel = (method: string, t: (k: string) => string): string => {
  if (!method) return t("orders.paymentMethodUnknown") || "غير محدد";
  const normalized = method.trim().toUpperCase();
  switch (normalized) {
    case "CASH":
    case "COD":
      return "الدفع عند الاستلام (COD)";
    case "CREDIT_CARD":
    case "CARD":
    case "ONLINE":
      return "بطاقة بنكية / فيزا";
    case "FAWRY":
      return "فوري (Fawry)";
    case "WALLET":
    case "VODAFONE_CASH":
    case "INSTAPAY":
      return "محفظة إلكترونية / إنستاباي";
    case "BANK_TRANSFER":
      return "تحويل بنكي";
    case "PREPAID":
      return "دفع مسبق";
    default:
      return method;
  }
};

const OrdersAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [govSearch, setGovSearch] = useState("");
  const [trendMetric, setTrendMetric] = useState<"orders" | "revenue">("orders");
  const abortControllerRef = useRef<AbortController | null>(null);

  const isRtl = i18n.dir ? i18n.dir() === "rtl" : true;

  const loadData = useCallback(async (start: string, end: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const [statsRes, productsRes] = await Promise.allSettled([
        companyAwareApi.get(
          `/reports/orders-detailed?startDate=${start}&endDate=${end}`,
          { signal: controller.signal }
        ),
        analyticsService.getProductSalesPerformance(undefined, start, end),
      ]);

      if (controller.signal.aborted) return;

      let hasSuccess = false;

      if (statsRes.status === "fulfilled" && (statsRes.value as any)?.data?.success) {
        setStats((statsRes.value as any).data.data);
        hasSuccess = true;
      } else if (statsRes.status === "rejected" && statsRes.reason?.name !== "CanceledError") {
        console.error("Error fetching order stats:", statsRes.reason);
      }

      if (productsRes.status === "fulfilled" && (productsRes.value as any)?.success) {
        setProducts((productsRes.value as any).data?.products ?? []);
        hasSuccess = true;
      } else if (productsRes.status === "rejected") {
        console.error("Error fetching product stats:", productsRes.reason);
      }

      if (!hasSuccess && statsRes.status === "rejected" && productsRes.status === "rejected") {
        setError(t("common.errorLoadingData") || "تعذر تحميل البيانات، يرجى المحاولة مرة أخرى");
      }
    } catch (err: any) {
      if (err?.name !== "CanceledError") {
        console.error("Unexpected error loading analytics:", err);
        setError(t("common.errorLoadingData") || "حدث خطأ غير متوقع أثناء تحميل البيانات");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    loadData(dateRange.start, dateRange.end);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [dateRange, loadData]);

  const applyPeriod = (key: PeriodKey) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (key === "custom") {
      setPeriod("custom");
      return;
    }

    let start: Date;
    let end: Date = new Date();

    switch (key) {
      case "today":
        start = today;
        break;
      case "yesterday": {
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      }
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "7":
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        break;
      case "30":
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        break;
      case "90":
        start = new Date(today);
        start.setDate(start.getDate() - 89);
        break;
      case "180":
        start = new Date(today);
        start.setMonth(start.getMonth() - 6);
        break;
      case "365":
        start = new Date(today);
        start.setDate(start.getDate() - 364);
        break;
      default:
        return;
    }

    setPeriod(key);
    setDateRange({ start: toISODate(start), end: toISODate(end) });
  };

  const handleCustomDateChange = (type: "start" | "end", value: string) => {
    setPeriod("custom");
    setDateRange((prev) => {
      const next = { ...prev, [type]: value };
      if (next.start && next.end && next.start > next.end) {
        if (type === "start") next.end = value;
        else next.start = value;
      }
      return next;
    });
  };

  const metrics = stats?.metrics;

  const executiveKpis = useMemo(() => {
    const totalOrders = stats?.totalOrders || 0;
    const netRevenue = metrics?.netRealizedRevenue || metrics?.deliveredRevenue || 0;
    const deliveryRate = metrics?.deliveryRate ?? (totalOrders > 0 && metrics ? Math.round((metrics.deliveredOrders / totalOrders) * 100) : 0);
    const cancellationRate = metrics?.cancellationRate ?? (totalOrders > 0 && metrics ? Math.round((metrics.cancelledOrders / totalOrders) * 100) : 0);
    const returnRate = metrics?.returnRate ?? (totalOrders > 0 && metrics ? Math.round((metrics.returnedOrders / totalOrders) * 100) : 0);
    const codCollectionRate = metrics?.codCollectionRate ?? 0;

    return [
      {
        title: "إجمالي الطلبات",
        value: totalOrders.toLocaleString(),
        subtitle: `${stats?.avgOrdersPerDay || 0} طلب / يوم`,
        icon: ShoppingCartIcon,
        color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
      },
      {
        title: "صافي الإيراد الفعلي المحصل",
        value: formatPrice(netRevenue),
        subtitle: `من إجمالي ${formatPrice(stats?.totalRevenue || 0)}`,
        icon: BanknotesIcon,
        color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
        highlight: true,
      },
      {
        title: "معدل التسليم الناجح",
        value: `${deliveryRate}%`,
        subtitle: `${metrics?.deliveredOrders || 0} طلب تم تسليمه`,
        icon: CheckCircleIcon,
        color: "text-green-600 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800",
      },
      {
        title: "معدل الإلغاءات",
        value: `${cancellationRate}%`,
        subtitle: `${metrics?.cancelledOrders || 0} طلب ملغي`,
        icon: XCircleIcon,
        color: "text-rose-600 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800",
      },
      {
        title: "معدل المرتجعات",
        value: `${returnRate}%`,
        subtitle: `${metrics?.returnedOrders || 0} طلب مرتجع (${formatPrice(metrics?.returnedRevenue || 0)})`,
        icon: ArrowPathRoundedSquareIcon,
        color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
      },
      {
        title: "مؤشر تحصيل الـ COD",
        value: `${codCollectionRate}%`,
        subtitle: `محصل: ${formatPrice(metrics?.codDeliveredRevenue || 0)}`,
        icon: CurrencyDollarIcon,
        color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800",
      },
      {
        title: "متوسط قيمة الطلب (AOV)",
        value: formatPrice(stats?.avgOrderValue || 0),
        subtitle: `${stats?.avgPiecesPerOrder || 0} قطعة / طلب`,
        icon: ChartBarIcon,
        color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800",
      },
      {
        title: "إجمالي القطع المباعة",
        value: stats?.totalPieces?.toLocaleString() || "0",
        subtitle: stats && stats.totalPieces > 0 ? `متوسط القطعة: ${formatPrice(stats.totalRevenue / stats.totalPieces)}` : "0",
        icon: Squares2X2Icon,
        color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800",
      },
    ];
  }, [stats, metrics, formatPrice]);

  const filteredGovs = useMemo(() => {
    const list = stats?.governorateDetails || [];
    if (!govSearch.trim()) return list;
    return list.filter((g) => g.name.toLowerCase().includes(govSearch.trim().toLowerCase()));
  }, [stats?.governorateDetails, govSearch]);

  return (
    <div className="p-3 sm:p-6 bg-slate-50 dark:bg-zinc-950 min-h-screen text-slate-900 dark:text-zinc-100" dir={isRtl ? "rtl" : "ltr"}>
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <ShoppingCartIcon className="h-6 w-6 shrink-0" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                تحليلات وإحصائيات الطلبات الشاملة
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                لوحة المتابعة التنفيذية: مؤشرات التسليم والتحصيل وأداء المحافظات وشركات الشحن
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/analytics/orders")}
            className="flex items-center justify-center gap-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 shadow-sm"
          >
            <ChartBarIcon className="h-4 w-4 text-blue-600" />
            <span className="text-xs sm:text-sm font-medium">التحليلات المتعددة والمقارنات المتقدمة</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 opacity-60" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(dateRange.start, dateRange.end)}
            disabled={loading}
            className="shrink-0 flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 shadow-sm"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="text-xs sm:text-sm font-medium">{t("common.refresh") || "تحديث"}</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-center justify-between gap-3 text-red-800 dark:text-red-200">
          <div className="flex items-center gap-2 min-w-0">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-red-500" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(dateRange.start, dateRange.end)}
            className="border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 shrink-0"
          >
            {t("common.retry") || "إعادة المحاولة"}
          </Button>
        </div>
      )}

      {/* Period Selection Controls */}
      <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 mb-6 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-1">
            {PERIOD_OPTIONS.map(({ key, labelKey }) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPeriod(key)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  period === key
                    ? "bg-blue-600 text-white shadow-sm font-semibold ring-2 ring-blue-600/20"
                    : "bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleCustomDateChange("start", e.target.value)}
                  className="p-2 text-sm border rounded-xl dark:bg-zinc-950 dark:border-zinc-800 dark:text-white flex-1 sm:flex-initial"
                />
                <span className="text-xs text-gray-500 font-medium">{t("orders.to") || "إلى"}</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleCustomDateChange("end", e.target.value)}
                  className="p-2 text-sm border rounded-xl dark:bg-zinc-950 dark:border-zinc-800 dark:text-white flex-1 sm:flex-initial"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Core E-Commerce KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-6">
        {executiveKpis.map((card, i) => (
          <Card
            key={i}
            size="sm"
            className={`border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden ${
              card.highlight ? "ring-2 ring-emerald-500/20 dark:ring-emerald-500/30" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate">
                    {card.title}
                  </p>
                  {loading ? (
                    <Skeleton className="h-7 w-28 mt-2" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-zinc-50 tracking-tight mt-1 truncate">
                      {card.value}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 truncate">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`shrink-0 p-2.5 rounded-xl border ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Performance Timeline / Trends Chart */}
      {stats?.dailyTrend && stats.dailyTrend.length > 1 && (
        <Card size="sm" className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm mb-6">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-blue-600" />
                <span>مسار الأداء اليومي وتطور الطلبات</span>
              </CardTitle>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTrendMetric("orders")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    trendMetric === "orders"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                      : "text-slate-600 dark:text-zinc-400"
                  }`}
                >
                  عدد الطلبات
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMetric("revenue")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    trendMetric === "revenue"
                      ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold"
                      : "text-slate-600 dark:text-zinc-400"
                  }`}
                >
                  الإيرادات اليومية
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 sm:h-72 w-full">
              <DeferredResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
                  <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  {trendMetric === "orders" ? (
                    <>
                      <Area type="monotone" dataKey="orders" name="إجمالي الطلبات" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" />
                      <Area type="monotone" dataKey="delivered" name="المسلّم" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDelivered)" />
                      <Area type="monotone" dataKey="cancelled" name="الملغي" stroke="#f43f5e" strokeWidth={1.5} fill="none" />
                      <Area type="monotone" dataKey="returned" name="المرتجع" stroke="#f59e0b" strokeWidth={1.5} fill="none" />
                    </>
                  ) : (
                    <Area type="monotone" dataKey="revenue" name="الإيراد اليومي" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  )}
                </AreaChart>
              </DeferredResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-Column Grid: Shipping Carriers & Status/Payment Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Shipping & Couriers Performance (كفاءة شركات الشحن) */}
        <Card size="sm" className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-zinc-800/80">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TruckIcon className="h-5 w-5 text-indigo-500" />
                <span>أداء وكفاءة شركات وفروع الشحن</span>
              </div>
              <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
                {stats?.shippingPerformance?.length || 0} جهات شحن
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 flex-1">
            {loading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : !stats?.shippingPerformance || stats.shippingPerformance.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-10">لا توجد بيانات شحنات مسجلة في هذه الفترة</p>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                {stats.shippingPerformance.map((carrier) => (
                  <div
                    key={carrier.name}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <TruckIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {carrier.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 tabular-nums shrink-0">
                        {carrier.totalOrders} شحنة
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] py-1.5 px-2 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800">
                      <div>
                        <p className="text-slate-500 dark:text-zinc-400">مسلّم</p>
                        <p className="font-bold text-green-600 tabular-nums">{carrier.deliveredOrders}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-zinc-400">نسبة التسليم</p>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{carrier.deliveryRate}%</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-zinc-400">مرتجع</p>
                        <p className="font-bold text-rose-600 tabular-nums">{carrier.returnedOrders}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-zinc-400">تحصيل COD</p>
                        <p className="font-bold text-slate-900 dark:text-zinc-100 tabular-nums truncate">
                          {formatPrice(carrier.codCollected)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods & Financial Health */}
        <Card size="sm" className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-zinc-800/80">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5 text-emerald-500" />
                <span>طرق الدفع والتحصيل المالي</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 flex-1 flex flex-col justify-between">
            {loading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* COD vs Prepaid Snapshot */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">الدفع عند الاستلام (COD)</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                      {metrics?.codOrdersCount || 0} طلب ({formatPrice(metrics?.codOrdersRevenue || 0)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                    <span>نسبة تحصيل الـ COD الفعلية:</span>
                    <span className="font-bold text-emerald-600 tabular-nums">
                      {metrics?.codCollectionRate || 0}% (تم تحصيل {formatPrice(metrics?.codDeliveredRevenue || 0)})
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">الدفع المسبق / الإلكتروني</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400 tabular-nums">
                      {metrics?.prepaidOrdersCount || 0} طلب ({formatPrice(metrics?.prepaidOrdersRevenue || 0)})
                    </span>
                  </div>
                </div>

                {/* Individual Payment Methods List */}
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">تفاصيل وسائل الدفع:</p>
                  {stats && Object.entries(stats.paymentStats || {}).map(([method, count]) => (
                    <div
                      key={method}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-100/70 dark:bg-zinc-800/40 text-xs"
                    >
                      <span className="font-medium text-slate-800 dark:text-zinc-200 truncate">
                        {getPaymentMethodLabel(method, t)}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {t("orders.analyticsOrderCount", { count })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Governorate Distribution Table */}
      <Card size="sm" className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm mb-6">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-red-500" />
              <span>التحليل الجغرافي المتقدم للمحافظات ومعدلات التسليم</span>
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث عن محافظة..."
                value={govSearch}
                onChange={(e) => setGovSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Skeleton key={n} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredGovs.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-8">لا توجد بيانات متاحة للمحافظات</p>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full min-w-[700px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-800/30">
                    <th className="py-2.5 px-3 text-start font-semibold">المحافظة</th>
                    <th className="py-2.5 px-3 text-start font-semibold">عدد الطلبات</th>
                    <th className="py-2.5 px-3 text-start font-semibold">الحصة %</th>
                    <th className="py-2.5 px-3 text-start font-semibold">المسلّم</th>
                    <th className="py-2.5 px-3 text-start font-semibold">معدل التسليم الناجح</th>
                    <th className="py-2.5 px-3 text-start font-semibold">المرتجع</th>
                    <th className="py-2.5 px-3 text-start font-semibold">الملغي</th>
                    <th className="py-2.5 px-3 text-start font-semibold">إجمالي الإيراد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {filteredGovs.map((gov) => (
                    <tr key={gov.name} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-zinc-100">
                        {gov.name}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums font-bold text-slate-800 dark:text-zinc-200">
                        {gov.ordersCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-slate-500 dark:text-zinc-400">
                        {gov.sharePct}%
                      </td>
                      <td className="py-2.5 px-3 tabular-nums font-semibold text-green-600">
                        {gov.deliveredCount}
                      </td>
                      <td className="py-2.5 px-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-bold text-slate-900 dark:text-zinc-100 shrink-0">
                            {gov.deliveryRate}%
                          </span>
                          <div className="h-1.5 flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                gov.deliveryRate >= 75
                                  ? "bg-emerald-500"
                                  : gov.deliveryRate >= 50
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(100, gov.deliveryRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums font-medium text-amber-600 dark:text-amber-400">
                        {gov.returnedCount}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums font-medium text-rose-600 dark:text-rose-400">
                        {gov.cancelledCount}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatPrice(gov.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products Performance Table */}
      <Card size="sm" className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-zinc-800/80">
          <CardTitle className="text-base flex items-center gap-2">
            <CubeIcon className="h-5 w-5 text-purple-500" />
            <span>أفضل المنتجات مبيعاً وأعلاها أداءً</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-8">
              {t("orders.analyticsNoData") || "لا توجد بيانات مبيعات منتجات"}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full min-w-[620px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-800/30">
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsProduct") || "المنتج"}
                    </th>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsQuantitySold") || "الكمية المباعة"}
                    </th>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsProductOrderCount") || "عدد الطلبات"}
                    </th>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsAveragePrice") || "متوسط السعر"}
                    </th>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsRevenue") || "إجمالي المبيعات"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {products.slice(0, 15).map((p) => (
                    <tr
                      key={p.productId}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {p.productImage ? (
                            <img
                              src={p.productImage}
                              alt={p.productName}
                              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover shrink-0 border border-slate-100 dark:border-zinc-800"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <CubeIcon className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">
                              {p.productName}
                            </p>
                            {p.productSku && (
                              <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                                SKU: {p.productSku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white tabular-nums">
                        {p.quantitySold.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 tabular-nums">
                        {p.orderCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 tabular-nums">
                        {formatPrice(p.averagePrice)}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                        {formatPrice(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersAnalytics;
