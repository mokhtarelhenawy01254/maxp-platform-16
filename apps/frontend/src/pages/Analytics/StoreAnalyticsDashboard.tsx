import React, { useEffect, useMemo, useRef, useState } from "react";
import analyticsService from "../../services/analyticsService";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../components/ui/alert";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  InformationCircleIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  TruckIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  ArrowDownIcon,
  PhoneIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { Link, useInRouterContext } from "react-router-dom";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AnalyticsData,
  DataHealthStatus,
  DailyAnalyticsPoint,
  FunnelMetric,
  TopProduct,
  ProfitStats,
  TrendMetric,
  calculateTrend,
  buildDataHealthStatus,
  buildFunnelMetrics,
  coerceNumber,
  generateExecutiveBriefing,
  getConversionTone,
  getTopProductImage,
  getTopProductPurchases,
} from "./storeAnalyticsDashboard.utils";

interface SafeActionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  className?: string;
  children: React.ReactNode;
}

const SafeActionLink: React.FC<SafeActionLinkProps> = ({
  to,
  className,
  children,
  ...props
}) => {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return (
      <Link to={to} className={className} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  );
};

type FilterState = {
  period: string;
  startDate: string;
  endDate: string;
};

type LoadState = "initial" | "refreshing" | "ready";

const PERIOD_OPTIONS = [
  { value: "1", label: "اليوم" },
  { value: "yesterday", label: "أمس" },
  { value: "2", label: "اليوم وأمس" },
  { value: "7", label: "آخر 7 أيام" },
  { value: "30", label: "آخر 30 يوم" },
  { value: "90", label: "آخر 90 يوم" },
  { value: "180", label: "آخر 6 شهور" },
  { value: "365", label: "آخر سنة" },
  { value: "custom", label: "فترة مخصصة" },
];

const numberFormatter = new Intl.NumberFormat("ar-EG");
const currencyFormatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 2,
});
const percentFormatter = new Intl.NumberFormat("ar-EG", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const shortDateFormatter = new Intl.DateTimeFormat("ar-EG", {
  month: "short",
  day: "numeric",
});
const longDateFormatter = new Intl.DateTimeFormat("ar-EG", {
  month: "long",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("ar-EG", {
  hour: "numeric",
  minute: "2-digit",
});

const formatCount = (value: unknown): string =>
  numberFormatter.format(coerceNumber(value));

const formatCurrency = (value: unknown): string =>
  currencyFormatter.format(coerceNumber(value));

const formatPercent = (value: unknown): string =>
  `${percentFormatter.format(coerceNumber(value))}%`;

const formatDateLabel = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return shortDateFormatter.format(parsed);
};

const formatRangeLabel = ({ period, startDate, endDate }: FilterState): string => {
  if (period === "custom" && startDate && endDate) {
    return `${longDateFormatter.format(new Date(startDate))} - ${longDateFormatter.format(new Date(endDate))}`;
  }
  return PERIOD_OPTIONS.find((opt) => opt.value === period)?.label ?? "آخر 30 يوم";
};

const unwrapResponseData = <T,>(payload: unknown): T | null => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T }).data ?? null;
  }
  return (payload as T) ?? null;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    const responseMsg = candidate.response?.data?.message;
    if (typeof responseMsg === "string" && responseMsg.trim()) {
      return responseMsg;
    }
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
  }
  return fallback;
};

const StoreAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailyData, setDailyData] = useState<DailyAnalyticsPoint[]>([]);
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null);
  const [filterDraft, setFilterDraft] = useState<FilterState>({
    period: "1",
    startDate: "",
    endDate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    period: "1",
    startDate: "",
    endDate: "",
  });
  const [loadState, setLoadState] = useState<LoadState>("initial");
  const [pageError, setPageError] = useState<string | null>(null);
  const [partialWarnings, setPartialWarnings] = useState<string[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"volume" | "conversion">("volume");

  const hasLoadedOnceRef = useRef(false);
  const previousAnalyticsRef = useRef<AnalyticsData | null>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  const isCustomPeriod = filterDraft.period === "custom";
  const isRefreshing = loadState === "refreshing";
  const hasExistingData =
    analytics !== null || topProducts.length > 0 || dailyData.length > 0;
  const isInitialLoading = loadState === "initial" && !hasExistingData;

  useEffect(() => {
    hasLoadedOnceRef.current =
      analytics !== null || topProducts.length > 0 || dailyData.length > 0;
    previousAnalyticsRef.current = analytics;
  }, [analytics, dailyData.length, topProducts.length]);

  useEffect(() => {
    if (
      appliedFilters.period === "custom" &&
      (!appliedFilters.startDate || !appliedFilters.endDate)
    ) {
      return;
    }

    const abortController = new AbortController();

    const fetchAnalytics = async () => {
      setLoadState(hasLoadedOnceRef.current ? "refreshing" : "initial");
      setPartialWarnings([]);
      setPageError(null);

      const [storeResult, topProductsResult, dailyResult, profitResult] =
        await Promise.allSettled([
          analyticsService.getStoreAnalytics(
            appliedFilters.period,
            appliedFilters.startDate,
            appliedFilters.endDate,
            abortController.signal,
          ),
          analyticsService.getTopProducts(
            appliedFilters.period,
            10,
            appliedFilters.startDate,
            appliedFilters.endDate,
          ),
          analyticsService.getDailyAnalytics(
            appliedFilters.period,
            appliedFilters.startDate,
            appliedFilters.endDate,
            abortController.signal,
          ),
          typeof analyticsService.getProfitAnalytics === "function"
            ? analyticsService.getProfitAnalytics(
                appliedFilters.period,
                appliedFilters.startDate,
                appliedFilters.endDate,
              )
            : Promise.resolve({ data: null }),
        ]);

      if (abortController.signal.aborted) {
        return;
      }

      const warnings: string[] = [];
      let hadAnySuccess = false;
      let summarySucceeded = false;

      if (storeResult.status === "fulfilled") {
        const data = unwrapResponseData<AnalyticsData>(storeResult.value);
        if (data) {
          setAnalytics(data);
          summarySucceeded = true;
          hadAnySuccess = true;
        } else {
          warnings.push("تم تحميل البيانات ولكن الملخص الرئيسي رجع فارغاً.");
        }
      } else {
        warnings.push(
          getErrorMessage(
            storeResult.reason,
            "تعذر جلب ملخص تحليلات المتجر ومعدل التحويل.",
          ),
        );
      }

      if (topProductsResult.status === "fulfilled") {
        const data =
          unwrapResponseData<TopProduct[]>(topProductsResult.value) ?? [];
        setTopProducts(Array.isArray(data) ? data : []);
        hadAnySuccess = true;
      } else {
        warnings.push(
          getErrorMessage(
            topProductsResult.reason,
            "تعذر تحديث قائمة المنتجات الأكثر تحويلاً ومبيعاً.",
          ),
        );
      }

      if (dailyResult.status === "fulfilled") {
        const data =
          unwrapResponseData<DailyAnalyticsPoint[]>(dailyResult.value) ?? [];
        setDailyData(Array.isArray(data) ? data : []);
        hadAnySuccess = true;
      } else {
        warnings.push(
          getErrorMessage(
            dailyResult.reason,
            "تعذر جلب الاتجاه اليومي للزيارات والإيرادات.",
          ),
        );
      }

      if (profitResult.status === "fulfilled") {
        const data = unwrapResponseData<ProfitStats>(profitResult.value);
        setProfitStats(data);
      } else {
        setProfitStats(null);
      }

      setPartialWarnings(warnings);

      if (!summarySucceeded && !previousAnalyticsRef.current) {
        setPageError(
          warnings[0] ?? "تعذر تحميل لوحة تحليلات المتجر في الوقت الحالي.",
        );
      } else if (summarySucceeded) {
        setPageError(null);
      }

      if (hadAnySuccess) {
        setLastRefreshedAt(new Date().toISOString());
      }

      setLoadState("ready");
    };

    void fetchAnalytics();

    return () => {
      abortController.abort();
    };
  }, [appliedFilters.endDate, appliedFilters.period, appliedFilters.startDate]);

  const funnelMetrics = useMemo(() => buildFunnelMetrics(analytics), [analytics]);
  const dataHealth = useMemo(
    () => buildDataHealthStatus(analytics, dailyData),
    [analytics, dailyData],
  );

  const chartData = useMemo(() => {
    return dailyData.map((item) => {
      const visits = coerceNumber(item.totalVisits);
      const purchases = coerceNumber(item.totalPurchases);
      const rate =
        visits > 0 ? parseFloat(((purchases / visits) * 100).toFixed(2)) : 0;
      return {
        date: formatDateLabel(item.date),
        visits,
        purchases,
        revenue: coerceNumber(item.totalRevenue),
        rate,
      };
    });
  }, [dailyData]);

  const executiveBriefing = useMemo(
    () => generateExecutiveBriefing(analytics, topProducts, dataHealth),
    [analytics, topProducts, dataHealth],
  );

  // Core metrics
  const totalVisits = coerceNumber(analytics?.totalVisits);
  const totalViews = coerceNumber(analytics?.totalProductViews);
  const totalCarts = coerceNumber(analytics?.addToCarts);
  const totalCheckouts = coerceNumber(analytics?.checkouts);
  const totalPurchases = coerceNumber(analytics?.purchases);
  const totalRevenue = coerceNumber(analytics?.totalRevenue);
  const conversionRate = coerceNumber(analytics?.conversionRate);
  const avgOrderValue = coerceNumber(analytics?.avgOrderValue);
  const deliveredOrders = coerceNumber(analytics?.deliveredOrders);
  const cancelledOrders = coerceNumber(analytics?.cancelledOrders);
  const deliveryRate = coerceNumber(analytics?.deliveryRate);
  const activeVisitors = coerceNumber(analytics?.activeVisitors);

  // 3-Tier Conversion & Recovery metrics
  const organicPurchases = coerceNumber(analytics?.naturalPurchases ?? (analytics ? Math.max(0, totalPurchases - (analytics.recoveredPurchases || 0)) : 0));
  const recoveredPurchases = coerceNumber(analytics?.recoveredPurchases);
  const recoveredRevenue = coerceNumber(analytics?.recoveredRevenue);
  const incompleteCarts = coerceNumber(analytics?.incompleteCarts);
  const organicConversionRate = coerceNumber(analytics?.organicConversionRate ?? (totalVisits > 0 ? (organicPurchases / totalVisits) * 100 : 0));
  const realizedConversionRate = coerceNumber(analytics?.realizedConversionRate ?? conversionRate);
  const grossIntentOrders = organicPurchases + incompleteCarts + recoveredPurchases;
  const potentialConversionRate = coerceNumber(analytics?.potentialConversionRate ?? (totalVisits > 0 ? (grossIntentOrders / totalVisits) * 100 : 0));
  const conversionLift = coerceNumber(analytics?.conversionLift ?? Math.max(0, realizedConversionRate - organicConversionRate));
  const recoveryRate = coerceNumber(analytics?.recoveryRate ?? ((incompleteCarts + recoveredPurchases) > 0 ? (recoveredPurchases / (incompleteCarts + recoveredPurchases)) * 100 : 0));

  // Period-over-Period Trends (مقارنة مع الفترة السابقة)
  const revenueTrend = useMemo(
    () => calculateTrend(totalRevenue, analytics?.prevPeriod?.revenue),
    [totalRevenue, analytics?.prevPeriod?.revenue]
  );
  const visitsTrend = useMemo(
    () => calculateTrend(totalVisits, analytics?.prevPeriod?.visits),
    [totalVisits, analytics?.prevPeriod?.visits]
  );
  const ordersTrend = useMemo(
    () => calculateTrend(totalPurchases, analytics?.prevPeriod?.purchases ?? analytics?.prevPeriod?.totalOrders),
    [totalPurchases, analytics?.prevPeriod?.purchases, analytics?.prevPeriod?.totalOrders]
  );
  const totalOrdersAllChannels = analytics?.totalOrders ?? totalPurchases;

  // Profitability metrics (صافي الربح وهوامش الربح)
  const netProfit = profitStats?.summary?.netProfit ?? 0;
  const profitMargin = profitStats?.summary?.profitMargin ?? 0;

  // Step-by-step conversion ratios
  const visitorToCart = totalVisits > 0 ? ((totalCarts / totalVisits) * 100).toFixed(1) : "0.0";
  const cartToCheckout = totalCarts > 0 ? ((totalCheckouts / totalCarts) * 100).toFixed(1) : "0.0";
  const checkoutToOrder = totalCheckouts > 0 ? ((totalPurchases / totalCheckouts) * 100).toFixed(1) : "0.0";

  // Quick order indicator
  const isDirectOrderStore = totalPurchases > 0 && totalCarts === 0;

  // Drop-off analysis
  const dropOffAnalysis = useMemo(() => {
    if (totalVisits === 0) return null;
    const viewDrop = totalVisits > 0 ? ((totalVisits - totalViews) / totalVisits) * 100 : 0;
    const cartDrop = totalViews > 0 ? ((totalViews - totalCarts) / totalViews) * 100 : 0;
    const checkoutDrop = totalCarts > 0 ? ((totalCarts - totalPurchases) / totalCarts) * 100 : 0;

    if (totalCarts === 0 && totalPurchases > 0) {
      return {
        stage: "طلب سريع ومباشر",
        description: "المتجر يعتمد نموذج الطلب الفوري من صفحة المنتج متجاوزاً السلة.",
        recommendation: "أداء ممتاز! عزز سرعة نموذج الشراء الفوري وشارات الثقة.",
      };
    }

    if (viewDrop > 60 && totalVisits > 20) {
      return {
        stage: "بين الزيارة وتصفح المنتجات",
        description: `أكثر من ${viewDrop.toFixed(0)}% من الزوار يغادرون الصفحة الرئيسية دون تصفح صفحة منتج.`,
        recommendation: "قم بتحسين سرعة المتجر ووضع أفضل المنتجات مبيعاً في واجهة المتجر الرئيسية.",
      };
    }

    if (cartDrop > 70 && totalViews > 20) {
      return {
        stage: "بين مشاهدة المنتج والإضافة للسلة",
        description: `أكثر من ${cartDrop.toFixed(0)}% من مشاهدي المنتجات لا يضيفونها للسلة.`,
        recommendation: "راجع وضوح زر الشراء، صور المنتج، السعر، وتفعيل زر الشراء الفوري.",
      };
    }

    if (checkoutDrop > 50 && totalCarts > 5) {
      return {
        stage: "بين السلة وإتمام الطلب",
        description: `تسرب ملحوظ بنسبة ${checkoutDrop.toFixed(0)}% للعملاء بعد إضافة المنتج للسلة.`,
        recommendation: "فعّل رسائل استرجاع السلات المتروكة وبسط خطوات الدفع.",
      };
    }

    return {
      stage: "مسار التحويل متزن",
      description: "المسار بين الزيارات والطلبات يسير بنسب مقبولة دون انقطاع حاد.",
      recommendation: "استمر في زيادة حركة الزيارات المستهدفة من الحملات الإعلانية المربحة.",
    };
  }, [totalVisits, totalViews, totalCarts, totalPurchases]);

  const starProduct = topProducts[0] ?? null;
  const secondaryProducts = starProduct ? topProducts.slice(1, 6) : topProducts.slice(0, 6);

  const handlePeriodChange = (nextPeriod: string) => {
    setFilterDraft((prev) => ({
      ...prev,
      period: nextPeriod,
      ...(nextPeriod === "custom" ? {} : { startDate: "", endDate: "" }),
    }));

    if (nextPeriod !== "custom") {
      setAppliedFilters({
        period: nextPeriod,
        startDate: "",
        endDate: "",
      });
    }
  };

  const applyCustomRange = () => {
    const start = filterDraft.startDate || startDateInputRef.current?.value || "";
    const end = filterDraft.endDate || endDateInputRef.current?.value || "";

    if (!start || !end) {
      setPageError("اختر تاريخ البداية والنهاية قبل تطبيق الفترة المخصصة.");
      return;
    }

    if (start > end) {
      setPageError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
      return;
    }

    setPageError(null);
    setFilterDraft((prev) => ({ ...prev, startDate: start, endDate: end }));
    setAppliedFilters({
      period: "custom",
      startDate: start,
      endDate: end,
    });
  };

  if (isInitialLoading) {
    return (
      <div className="relative min-h-screen px-4 pb-12 pt-6 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/50" dir="rtl">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-32 animate-pulse rounded-3xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-28 animate-pulse rounded-2xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800" />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-3xl bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-3 py-3 sm:px-6 sm:py-6 lg:px-8 pb-32 sm:pb-12 bg-gray-50/60 dark:bg-gray-950 text-gray-900 dark:text-gray-100" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">

        {/* 1. Header & Navigation Hub (2026 Master Header) */}
        <header className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-3.5 sm:p-7 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary font-bold text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1">
                  STORE INTELLIGENCE 2026
                </Badge>
                <Badge variant="outline" className="rounded-full border-gray-300 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1">
                  {formatRangeLabel(appliedFilters)}
                </Badge>
                {/* Live Pulse */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span>{activeVisitors > 0 ? `${formatCount(activeVisitors)} نشط الآن` : "النبض الحي"}</span>
                </div>
                {isRefreshing && (
                  <Badge variant="outline" className="rounded-full border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 animate-pulse">
                    جارٍ التحديث...
                  </Badge>
                )}
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                لوحة أداء المتجر
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed hidden sm:block">
                مركز الاستخبارات الشامل والحي لمتابعة الزيارات، مسار التحويل الكامل، كفاءة الشحن، والمنتجات الأعلى إيراداً لعام 2026.
              </p>
            </div>

            {/* Quick Period Buttons & Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Desktop quick pill selector */}
              <div className="hidden sm:flex items-center gap-1 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100/80 dark:bg-gray-800/60 p-1">
                {PERIOD_OPTIONS.slice(0, 5).map((opt) => {
                  const isActive = filterDraft.period === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handlePeriodChange(opt.value)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Accessible Dropdown + Refresh Button */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  aria-label="الفترة"
                  value={filterDraft.period}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="h-9 sm:h-10 flex-1 sm:flex-initial rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAppliedFilters({ ...appliedFilters })}
                  className="h-9 sm:h-10 rounded-xl sm:rounded-2xl gap-1 px-3 sm:px-3.5 border-gray-200 dark:border-gray-800 text-xs font-semibold shrink-0"
                >
                  <ArrowPathIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span>تحديث</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Custom Date Inputs if 'custom' is selected */}
          {isCustomPeriod && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                <span>من:</span>
                <input
                  ref={startDateInputRef}
                  type="date"
                  aria-label="من"
                  value={filterDraft.startDate}
                  onChange={(e) => setFilterDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 text-xs"
                />
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                <span>إلى:</span>
                <input
                  ref={endDateInputRef}
                  type="date"
                  aria-label="إلى"
                  value={filterDraft.endDate}
                  onChange={(e) => setFilterDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 text-xs"
                />
              </label>

              <Button
                size="sm"
                onClick={applyCustomRange}
                className="h-9 rounded-xl text-xs px-4 bg-primary text-white font-semibold"
              >
                تطبيق الفترة
              </Button>
            </div>
          )}

          {lastRefreshedAt && (
            <div className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
              آخر مزامنة حية: {timeFormatter.format(new Date(lastRefreshedAt))}
            </div>
          )}
        </header>

        {/* Error / Warning alerts */}
        {pageError && (
          <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 p-4">
            <ExclamationTriangleIcon className="size-5 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-bold">تنبيه في البيانات</AlertTitle>
            <AlertDescription className="text-xs mt-1">{pageError}</AlertDescription>
          </Alert>
        )}

        {/* 2. Top Row - The 4 Core Business Pillars */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Revenue & Profitability */}
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">إجمالي الإيرادات</span>
                {revenueTrend && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      revenueTrend.direction === "up"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                        : revenueTrend.direction === "down"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                    title={revenueTrend.label}
                  >
                    {revenueTrend.direction === "up" ? (
                      <ArrowTrendingUpIcon className="size-2.5 sm:size-3" />
                    ) : revenueTrend.direction === "down" ? (
                      <ArrowTrendingDownIcon className="size-2.5 sm:size-3" />
                    ) : null}
                    <span>{revenueTrend.formatted}</span>
                  </span>
                )}
              </div>
              <span className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CreditCardIcon className="size-4 sm:size-5" />
              </span>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white truncate">
                {analytics ? formatCurrency(totalRevenue) : "--"}
              </h3>
              <div className="mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                <span>صافي الربح:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {netProfit > 0
                    ? `${formatCurrency(netProfit)} (${profitMargin.toFixed(0)}%)`
                    : totalRevenue > 0
                    ? "يحسب مع التكلفة"
                    : "--"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Orders & Channels */}
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">الطلبات المؤكدة</span>
                {ordersTrend && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      ordersTrend.direction === "up"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                        : ordersTrend.direction === "down"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                    title={ordersTrend.label}
                  >
                    {ordersTrend.direction === "up" ? (
                      <ArrowTrendingUpIcon className="size-2.5 sm:size-3" />
                    ) : ordersTrend.direction === "down" ? (
                      <ArrowTrendingDownIcon className="size-2.5 sm:size-3" />
                    ) : null}
                    <span>{ordersTrend.formatted}</span>
                  </span>
                )}
              </div>
              <span className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <ShoppingBagIcon className="size-4 sm:size-5" />
              </span>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white truncate">
                {analytics ? formatCount(totalPurchases) : "--"}{" "}
                <span className="text-[10px] sm:text-xs font-normal text-gray-400">طلب متجر</span>
              </h3>
              <div className="mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                <span>متوسط: {avgOrderValue > 0 ? formatCurrency(avgOrderValue) : "--"}</span>
                {totalOrdersAllChannels > totalPurchases && (
                  <span className="text-gray-400 text-[9px] sm:text-[10px]" title="إجمالي كافة القنوات: المتجر + الواتساب + اليدوي">
                    (الكل: {formatCount(totalOrdersAllChannels)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: 3-Tier Conversion Rate */}
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">التحويل المحقق</span>
                {visitsTrend && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      visitsTrend.direction === "up"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                        : visitsTrend.direction === "down"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                    title={`زيارات: ${visitsTrend.label}`}
                  >
                    {visitsTrend.direction === "up" ? (
                      <ArrowTrendingUpIcon className="size-2.5 sm:size-3" />
                    ) : visitsTrend.direction === "down" ? (
                      <ArrowTrendingDownIcon className="size-2.5 sm:size-3" />
                    ) : null}
                    <span>{visitsTrend.formatted} زيارات</span>
                  </span>
                )}
              </div>
              <span className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <ChartBarIcon className="size-4 sm:size-5" />
              </span>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <h3 className="text-lg sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                  {analytics ? formatPercent(realizedConversionRate) : "--"}
                </h3>
                {conversionLift > 0 ? (
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold rounded-full px-1.5 sm:px-2 py-0.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    +{formatPercent(conversionLift)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] rounded-full px-1.5 sm:px-2 py-0.5 border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {realizedConversionRate >= 3 ? "استثنائي" : realizedConversionRate >= 1.2 ? "متزن" : "يحتاج دفع"}
                  </Badge>
                )}
              </div>
              <div className="mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                <span>طبيعي: {analytics ? formatPercent(organicConversionRate) : "--"}</span>
                <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
                <span>النية: {analytics ? formatPercent(potentialConversionRate) : "--"}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Delivery Rate (Fulfillment) */}
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">تسليم الشحنات</span>
              <span className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <TruckIcon className="size-4 sm:size-5" />
              </span>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <h3 className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                  {deliveryRate > 0 ? formatPercent(deliveryRate) : "--"}
                </h3>
                <span className="text-[10px] sm:text-xs text-gray-400">({formatCount(deliveredOrders)} مسلم)</span>
              </div>
              <div className="mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                <span>نسبة التسليم (COD)</span>
                {cancelledOrders > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 text-[9px] sm:text-[10px]">
                    {formatCount(cancelledOrders)} ملغي
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. AI Executive Diagnostic Briefing */}
        <section className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-6 transition-all shadow-sm ${
          executiveBriefing.tone === "positive"
            ? "border-emerald-500/30 bg-gradient-to-l from-emerald-500/10 via-emerald-500/5 to-transparent"
            : executiveBriefing.tone === "attention"
            ? "border-amber-500/30 bg-gradient-to-l from-amber-500/10 via-amber-500/5 to-transparent"
            : "border-primary/30 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent"
        }`}>
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SparklesIcon className="size-4 sm:size-5 text-primary animate-pulse" />
                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold border-primary/40 bg-primary/10 text-primary">
                  الموجز التنفيذي الذكي
                </Badge>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {executiveBriefing.metricsSnapshot}
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                {executiveBriefing.headline}
              </h3>
              <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {executiveBriefing.summary}
              </p>
            </div>

            {executiveBriefing.actionSuggestion && (
              <SafeActionLink
                to={executiveBriefing.actionSuggestion.path}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-primary px-4 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-all min-h-[44px]"
              >
                <BoltIcon className="size-4" />
                <span>{executiveBriefing.actionSuggestion.label}</span>
                <ArrowTopRightOnSquareIcon className="size-3.5" />
              </SafeActionLink>
            )}
          </div>
        </section>

        {/* 4. Complete Unified Sales & Conversion Funnel (قمع التحويل الشامل) */}
        <section className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="size-5 text-primary" />
                <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                  قمع التحويل ومسار رحلة العميل (Full Funnel)
                </h2>
              </div>
              <p className="mt-0.5 sm:mt-1 text-xs text-gray-500 dark:text-gray-400">
                رصد حركة العميل خطوة بخطوة من الزيارة الأولى وحتى استلام الشحنة.
              </p>
            </div>

            {isDirectOrderStore && (
              <Badge variant="outline" className="rounded-xl border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs px-3 py-1 self-start sm:self-auto">
                ⚡ متجر يدعم الطلب المباشر الفوري
              </Badge>
            )}
          </div>

          {/* Funnel Visual Pipeline (Desktop & Mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {/* Step 1: Visits */}
            <div className="relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>1. زيارات المتجر</span>
                  <span className="font-bold text-blue-600">100%</span>
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {formatCount(totalVisits)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-400">مدخل حركة المرور</div>
            </div>

            {/* Step 2: Views */}
            <div className="relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>2. مشاهدات المنتجات</span>
                  <span className="font-bold text-sky-600">
                    {totalVisits > 0 ? `${((totalViews / totalVisits) * 100).toFixed(0)}%` : "--"}
                  </span>
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {formatCount(totalViews)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-400">تصفح الكتالوج</div>
            </div>

            {/* Step 3: Add to Cart */}
            <div className="relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>3. إضافات السلة</span>
                  <span className="font-bold text-amber-600">{visitorToCart}%</span>
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {formatCount(totalCarts)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-400">نية الشراء</div>
            </div>

            {/* Step 4: Checkouts */}
            <div className="relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>4. شاشة الدفع</span>
                  <span className="font-bold text-indigo-600">{cartToCheckout}%</span>
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {formatCount(totalCheckouts)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-400">
                {incompleteCarts > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    منها {formatCount(incompleteCarts)} سلة غير مكتملة
                  </span>
                ) : (
                  "بدء إدخال البيانات"
                )}
              </div>
            </div>

            {/* Step 5: Purchases */}
            <div className="relative rounded-2xl border border-emerald-500/20 dark:border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                  <span>5. إتمام الشراء</span>
                  <span>{formatPercent(realizedConversionRate)}</span>
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCount(totalPurchases)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-emerald-600/80">
                {recoveredPurchases > 0 ? (
                  <span>
                    {formatCount(organicPurchases)} مباشر + {formatCount(recoveredPurchases)} مسترد
                  </span>
                ) : (
                  "الطلبات المؤكدة"
                )}
              </div>
            </div>

            {/* Step 6: Delivered */}
            <div className="relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>6. تم التسليم</span>
                  <span className="font-bold text-amber-600">{deliveryRate > 0 ? `${deliveryRate.toFixed(0)}%` : "--"}</span>
                </div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {formatCount(deliveredOrders)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-400">التحصيل الفعلي (COD)</div>
            </div>
          </div>

          {/* Drop-off Diagnosis Box */}
          {dropOffAnalysis && (
            <div className="mt-3.5 sm:mt-5 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <InformationCircleIcon className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      تشخيص تسرب العملاء: {dropOffAnalysis.stage}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {dropOffAnalysis.description} {dropOffAnalysis.recommendation}
                  </p>
                </div>
              </div>

              <SafeActionLink
                to="/settings/store/tools"
                className="shrink-0 text-xs font-bold text-primary hover:underline"
              >
                تفعيل أدوات تقليل الفقد ⬅️
              </SafeActionLink>
            </div>
          )}
        </section>

        {/* 4.5 3-Tier Conversion Benchmark & Recovery Intelligence */}
        <section className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ChartBarIcon className="size-5" />
                </span>
                <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                  تحليل معدلات التحويل الثلاثية وأثر استرداد السلات
                </h2>
              </div>
              <p className="mt-0.5 sm:mt-1 text-xs text-gray-500 dark:text-gray-400">
                مقارنة دقيقة تقيس التحويل الطبيعي للمتجر، والتحويل الفعلي بعد مكالمات التأكيد، والنية الكلية للشراء.
              </p>
            </div>

            <SafeActionLink
              to="/orders/incomplete"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-primary/30 bg-primary/10 px-3.5 sm:px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all min-h-[40px]"
            >
              <PhoneIcon className="size-4" />
              <span>إدارة الطلبات غير المكتملة ({formatCount(incompleteCarts)})</span>
              <ArrowTopRightOnSquareIcon className="size-3.5" />
            </SafeActionLink>
          </div>

          {/* 3 Benchmark Cards */}
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {/* Card 1: Organic */}
            <div className="rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-3.5 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">1. التحويل الطبيعي (مباشر)</span>
                  <Badge variant="outline" className="text-[10px] rounded-full border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    بدون تدخل
                  </Badge>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                    {formatPercent(organicConversionRate)}
                  </span>
                  <span className="text-xs text-gray-400">({formatCount(organicPurchases)} طلب)</span>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  عملاء أتموا الشراء تلقائياً من أول مرة دون الحاجة لتواصل أو متابعة.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, organicConversionRate * 10))}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                  <span>كفاءة المتجر التلقائية</span>
                  <span>{formatCount(organicPurchases)} من {formatCount(totalVisits)} زيارة</span>
                </div>
              </div>
            </div>

            {/* Card 2: Realized (With Recovery) */}
            <div className="relative rounded-xl sm:rounded-2xl border-2 border-purple-500/30 dark:border-purple-500/40 bg-gradient-to-b from-purple-500/5 via-purple-500/10 to-transparent p-3.5 sm:p-5 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">2. التحويل الفعلي بعد الاسترداد</span>
                  {conversionLift > 0 ? (
                    <Badge variant="outline" className="text-[10px] font-bold rounded-full border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      +{formatPercent(conversionLift)} زيادة بالمكالمات
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] rounded-full border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      النتيجة النهائية
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                    {formatPercent(realizedConversionRate)}
                  </span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    ({formatCount(totalPurchases)} طلب مؤكد)
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  معدل التحويل الحقيقي الذي دخل حسابك بعد أن اتصل فريقك بالسلات المتروكة وحوّلها لطلبات.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-200/60 dark:border-purple-800/60">
                <div className="h-2 rounded-full bg-purple-200 dark:bg-purple-900/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, realizedConversionRate * 10))}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  <span>التحويل الفعلي الشامل</span>
                  <span>{recoveredPurchases > 0 ? `${formatCount(recoveredPurchases)} طلب أنقذه الفريق` : "لا توجد مستردات"}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Potential / Gross Intent */}
            <div className="rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-3.5 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">3. نية الشراء الكلية (الفرصة)</span>
                  <Badge variant="outline" className="text-[10px] rounded-full border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    الحد الأقصى الممكن
                  </Badge>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                    {formatPercent(potentialConversionRate)}
                  </span>
                  <span className="text-xs text-gray-400">({formatCount(grossIntentOrders)} مشتري محتمل)</span>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  نسبة كل من أبدى رغبة شرائية وسجل بياناته بالشيك آوت (لو تم تأكيد كل السلات).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, potentialConversionRate * 10))}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                  <span>سقف الفرصة التسويقية</span>
                  <span>{formatCount(incompleteCarts)} سلة غير مستردة بعد</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Performance Highlight Box */}
          <div className="mt-3 sm:mt-4 rounded-xl sm:rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 p-3.5 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 flex-1">
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">الطلبات المستردة بنجاح</span>
                  <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircleIcon className="size-4 text-emerald-500" />
                    <span>{formatCount(recoveredPurchases)} طلب</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">إيراد مضاف للخزينة</span>
                  <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(recoveredRevenue)}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">نسبة نجاح استرداد السلات</span>
                  <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    {recoveryRate > 0 ? formatPercent(recoveryRate) : "--"}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">سلات متبقية تنتظر المكالمة</span>
                  <div className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
                    {formatCount(incompleteCarts)} سلة
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                <SafeActionLink
                  to="/orders/incomplete"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all min-h-[40px]"
                >
                  <PhoneIcon className="size-4" />
                  <span>متابعة وتأكيد السلات الآن</span>
                </SafeActionLink>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Dual-Mode Interactive Chart (Volume vs Daily Conversion Rate) */}
        <section className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="size-5 text-primary" />
                <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                  {chartMode === "volume" ? "مسار الزيارات والإيرادات اليومي" : "تطور معدل التحويل اليومي %"}
                </h2>
              </div>
              <p className="mt-0.5 sm:mt-1 text-xs text-gray-500 dark:text-gray-400">
                {chartMode === "volume"
                  ? "تتبع العلاقة بين نمو الزيارات وحجم الإيرادات المحققة يوماً بيوم."
                  : "مراقبة ثبات أو تقلبات نسبة التحويل عبر الأيام لاكتشاف أفضل الأيام أداءً."}
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="inline-flex shrink-0 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 p-1">
              <button
                type="button"
                onClick={() => setChartMode("volume")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  chartMode === "volume"
                    ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                الحجم والإيرادات
              </button>
              <button
                type="button"
                onClick={() => setChartMode("conversion")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  chartMode === "conversion"
                    ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                معدل التحويل اليومي %
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-80 w-full" data-testid="analytics-chart">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === "volume" ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        direction: "rtl",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Area yAxisId="left" type="monotone" dataKey="visits" name="الزيارات" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVisits)" />
                    <Area yAxisId="right" type="monotone" dataKey="revenue" name="الإيرادات (ج.م)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} unit="%" tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, "معدل التحويل"]}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        direction: "rtl",
                      }}
                    />
                    <Line type="monotone" dataKey="rate" name="معدل التحويل %" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} activeDot={{ r: 6 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 text-gray-400">
                <ChartBarIcon className="size-10 mb-2 stroke-1" />
                <p className="text-sm font-semibold">لا توجد بيانات حركة كافية للفترة المحددة</p>
                <p className="text-xs mt-1">اختر فترة زمنية أوسع أو انتظر تدفق المزيد من الزيارات</p>
              </div>
            )}
          </div>
        </section>

        {/* 6. Top Converting Products & Growth Actions (2 Columns) */}
        <section className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Star Product Card */}
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary text-xs font-bold px-3 py-1">
                  المنتج البطل (الأعلى تحويلاً)
                </Badge>
                <SparklesIcon className="size-5 text-amber-500" />
              </div>

              {starProduct ? (
                <div>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4 flex items-center justify-center">
                    {getTopProductImage(starProduct) ? (
                      <img
                        src={getTopProductImage(starProduct)!}
                        alt={starProduct.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShoppingBagIcon className="size-10 text-gray-400" />
                    )}
                  </div>
                  <h4 className="font-bold text-base text-gray-900 dark:text-white line-clamp-1">
                    {starProduct.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatCurrency(starProduct.price)}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-2">
                      <span className="text-[10px] text-gray-400">المشاهدات</span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCount(starProduct.views)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-2">
                      <span className="text-[10px] text-gray-400">السلة</span>
                      <p className="text-sm font-bold text-amber-600">{formatCount(starProduct.addToCarts)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-2">
                      <span className="text-[10px] text-gray-400">الطلبات</span>
                      <p className="text-sm font-bold text-emerald-600">{formatCount(getTopProductPurchases(starProduct))}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  لا توجد بيانات منتجات كافية للفترة الحالية
                </div>
              )}
            </div>

            <SafeActionLink
              to="/products"
              className="mt-5 text-center text-xs font-bold text-primary hover:underline"
            >
              عرض كافة المنتجات والكتالوج ⬅️
            </SafeActionLink>
          </div>

          {/* Leaderboard Table (Top 5) */}
          <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  أفضل المنتجات حسب المبيعات والتحويل
                </h3>
                <span className="text-xs text-gray-400">ترتيب تنازلي</span>
              </div>

              {secondaryProducts.length > 0 ? (
                <div className="space-y-2.5">
                  {secondaryProducts.map((prod, idx) => (
                    <div
                      key={prod.id || idx}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex size-7 items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                          #{idx + 2}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {prod.name}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {formatCurrency(prod.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-left shrink-0">
                        <div>
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCount(getTopProductPurchases(prod))} طلب
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {formatCount(prod.views)} مشاهدة
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] rounded-full border-gray-200 dark:border-gray-700">
                          {formatPercent(prod.conversionRate)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  بانتظار تسجيل المزيد من طلبات المنتجات
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <span>يتم تحديث الترتيب تلقائياً مع كل طلب شراء مكتمل</span>
              <SafeActionLink to="/analytics/orders/products" className="font-bold text-primary hover:underline">
                تقرير أداء المنتجات التفصيلي ⬅️
              </SafeActionLink>
            </div>
          </div>
        </section>

        {/* 7. 1-Click Growth Action Hub (مركز إجراءات النمو والتنشيط الفوري) */}
        <section className="rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <BoltIcon className="size-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  إجراءات النمو الفورية (1-Click Growth Actions)
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                إجراءات جاهزة بنقرة واحدة لتحسين نسب التحويل واسترجاع السلات المفقودة.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary text-xs font-bold px-3 py-1">
              جاهزة للتنفيذ
            </Badge>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Action 1: Abandoned Carts */}
            <SafeActionLink
              to="/analytics/orders/abandoned-cart"
              className="group flex flex-col justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-5 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ShoppingCartIcon className="size-5" />
                  </span>
                  <ArrowTopRightOnSquareIcon className="size-4 text-gray-400 group-hover:text-primary transition" />
                </div>
                <h4 className="mt-4 text-sm font-bold text-gray-900 dark:text-white">
                  استرجاع السلات المتروكة
                </h4>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  تواصل مع العملاء الذين أضافوا منتجات وخرجوا قبل إتمام الشراء عبر الواتساب واسترجع طلبات مؤكدة.
                </p>
              </div>
              <span className="mt-4 text-xs font-bold text-primary group-hover:underline">
                فتح تقرير واسترجاع السلات ⬅️
              </span>
            </SafeActionLink>

            {/* Action 2: Conversion Boost Tools */}
            <SafeActionLink
              to="/settings/store/tools"
              className="group flex flex-col justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-5 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <BoltIcon className="size-5" />
                  </span>
                  <ArrowTopRightOnSquareIcon className="size-4 text-gray-400 group-hover:text-primary transition" />
                </div>
                <h4 className="mt-4 text-sm font-bold text-gray-900 dark:text-white">
                  أدوات تسريع وتحسين الشراء
                </h4>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  فعّل زر الشراء الفوري (Sticky Buy Now)، شارات الثقة، وعداد التخفيض في صفحة المنتج لتسهيل الطلب.
                </p>
              </div>
              <span className="mt-4 text-xs font-bold text-primary group-hover:underline">
                إعداد أدوات التحويل ⬅️
              </span>
            </SafeActionLink>

            {/* Action 3: Campaign Attribution */}
            <SafeActionLink
              to="/analytics/orders/campaign-attribution"
              className="group flex flex-col justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-5 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <ArrowTrendingUpIcon className="size-5" />
                  </span>
                  <ArrowTopRightOnSquareIcon className="size-4 text-gray-400 group-hover:text-primary transition" />
                </div>
                <h4 className="mt-4 text-sm font-bold text-gray-900 dark:text-white">
                  إسناد الحملات الإعلانية
                </h4>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  قارن عوائد إعلانات فيسبوك وتيك توك لمعرفة الإعلانات التي تحقق أعلى معدل تحويل فعلي.
                </p>
              </div>
              <span className="mt-4 text-xs font-bold text-primary group-hover:underline">
                فحص مصادر الإعلانات ⬅️
              </span>
            </SafeActionLink>
          </div>
        </section>

      </div>
    </div>
  );
};

export default StoreAnalyticsDashboard;
