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
} from "@heroicons/react/24/outline";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  AnalyticsData,
  DataHealthStatus,
  DailyAnalyticsPoint,
  FunnelMetric,
  TopProduct,
  buildDataHealthStatus,
  buildFunnelMetrics,
  coerceNumber,
  getConversionTone,
  getTopProductImage,
  getTopProductPurchases,
} from "./storeAnalyticsDashboard.utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

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

const shellSurfaceStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, color-mix(in srgb, white 84%, var(--color-background) 16%) 0%, color-mix(in srgb, white 72%, var(--color-background) 28%) 100%)",
  border: "1px solid color-mix(in srgb, var(--color-primary) 14%, var(--color-border))",
  boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)",
};

const heroSurfaceStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, white 92%, var(--color-background) 8%) 0%, color-mix(in srgb, var(--color-primary) 10%, white) 44%, color-mix(in srgb, var(--color-secondary) 8%, white) 100%)",
  border: "1px solid color-mix(in srgb, var(--color-primary) 18%, var(--color-border))",
  boxShadow: "0 40px 110px -68px rgba(7, 17, 32, 0.5)",
};

const controlSurfaceStyle: React.CSSProperties = {
  background: "color-mix(in srgb, white 76%, var(--color-background) 24%)",
  borderColor: "color-mix(in srgb, var(--color-primary) 12%, var(--color-border))",
  color: "var(--color-foreground)",
};

const dateInputClassName =
  "h-11 w-full rounded-2xl border px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15";

const softMediaSurfaceStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--color-border) 30%, var(--color-background))",
};

const trackSurfaceStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--color-border) 38%, transparent)",
};

const buildPanelStyle = (accent: string): React.CSSProperties => ({
  ...shellSurfaceStyle,
  border: `1px solid color-mix(in srgb, ${accent} 16%, var(--color-border))`,
});

const buildTintStyle = (accent: string, strength = 12): React.CSSProperties => ({
  background: `color-mix(in srgb, ${accent} ${strength}%, var(--color-background))`,
  border: `1px solid color-mix(in srgb, ${accent} 18%, transparent)`,
  color: accent,
});

const unwrapResponseData = <T,>(value: unknown): T | null => {
  if (value && typeof value === "object" && "data" in value) {
    return ((value as { data?: T }).data ?? null) as T | null;
  }

  return (value as T | null) ?? null;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    const nestedMessage = maybeError.response?.data?.message;

    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage;
    }

    if (typeof maybeError.message === "string" && maybeError.message.trim()) {
      return maybeError.message;
    }
  }

  return fallback;
};

const formatCount = (value: unknown): string =>
  numberFormatter.format(coerceNumber(value));

const formatCurrency = (value: unknown): string =>
  currencyFormatter.format(coerceNumber(value));

const formatPercent = (value: unknown): string =>
  `${percentFormatter.format(coerceNumber(value))}%`;

const formatDateLabel = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return shortDateFormatter.format(date);
};

const formatRangeLabel = ({ period, startDate, endDate }: FilterState): string => {
  if (period === "custom" && startDate && endDate) {
    return `${longDateFormatter.format(new Date(startDate))} - ${longDateFormatter.format(new Date(endDate))}`;
  }

  return PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "آخر 30 يوم";
};

const conversionToneMap = {
  excellent: "var(--color-success)",
  good: "var(--color-primary)",
  emerging: "var(--color-warning)",
  cold: "var(--color-muted-foreground)",
} as const;

const healthToneAccentMap = {
  healthy: "var(--color-success)",
  partial: "var(--color-warning)",
  critical: "var(--color-warning)",
} satisfies Record<DataHealthStatus["tone"], string>;

const funnelAccentMap = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "var(--color-warning)",
  "color-mix(in srgb, var(--color-primary) 74%, var(--color-secondary))",
  "var(--color-success)",
];

const StoreAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailyData, setDailyData] = useState<DailyAnalyticsPoint[]>([]);
  const [filters, setFilters] = useState<FilterState>({
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
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains("dark"),
  );
  const hasDataRef = useRef(false);
  const analyticsRef = useRef<AnalyticsData | null>(null);
  const customStartDateInputRef = useRef<HTMLInputElement | null>(null);
  const customEndDateInputRef = useRef<HTMLInputElement | null>(null);

  const showCustomRange = filters.period === "custom";
  const isRefreshing = loadState === "refreshing";
  const hasDashboardData =
    analytics !== null || topProducts.length > 0 || dailyData.length > 0;
  const isInitialLoading = loadState === "initial" && !hasDashboardData;

  useEffect(() => {
    hasDataRef.current =
      analytics !== null || topProducts.length > 0 || dailyData.length > 0;
    analyticsRef.current = analytics;
  }, [analytics, dailyData.length, topProducts.length]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      appliedFilters.period === "custom" &&
      (!appliedFilters.startDate || !appliedFilters.endDate)
    ) {
      return;
    }

    const controller = new AbortController();

    const fetchAnalytics = async () => {
      setLoadState(hasDataRef.current ? "refreshing" : "initial");
      setWarnings([]);
      setError(null);

      const [analyticsResult, topProductsResult, dailyResult] =
        await Promise.allSettled([
          analyticsService.getStoreAnalytics(
            appliedFilters.period,
            appliedFilters.startDate,
            appliedFilters.endDate,
            controller.signal,
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
            controller.signal,
          ),
        ]);

      if (controller.signal.aborted) {
        return;
      }

      const nextWarnings: string[] = [];
      let hasFreshPayload = false;
      let analyticsLoaded = false;

      if (analyticsResult.status === "fulfilled") {
        const nextAnalytics =
          unwrapResponseData<AnalyticsData>(analyticsResult.value);
        if (nextAnalytics) {
          setAnalytics(nextAnalytics);
          analyticsLoaded = true;
          hasFreshPayload = true;
        } else {
          nextWarnings.push("تم تحميل الصفحة لكن ملخص الأداء الرئيسي رجع فارغًا.");
        }
      } else {
        nextWarnings.push(
          getErrorMessage(
            analyticsResult.reason,
            "تعذر تحديث ملخص الأداء الرئيسي.",
          ),
        );
      }

      if (topProductsResult.status === "fulfilled") {
        const nextProducts =
          unwrapResponseData<TopProduct[]>(topProductsResult.value) ?? [];
        setTopProducts(Array.isArray(nextProducts) ? nextProducts : []);
        hasFreshPayload = true;
      } else {
        nextWarnings.push(
          getErrorMessage(
            topProductsResult.reason,
            "تعذر تحديث قائمة المنتجات الأعلى أداءً.",
          ),
        );
      }

      if (dailyResult.status === "fulfilled") {
        const nextDailyData =
          unwrapResponseData<DailyAnalyticsPoint[]>(dailyResult.value) ?? [];
        setDailyData(Array.isArray(nextDailyData) ? nextDailyData : []);
        hasFreshPayload = true;
      } else {
        nextWarnings.push(
          getErrorMessage(
            dailyResult.reason,
            "تعذر تحديث السلسلة اليومية للزيارات والإيرادات.",
          ),
        );
      }

      setWarnings(nextWarnings);

      if (!analyticsLoaded && !analyticsRef.current) {
        setError(
          nextWarnings[0] ?? "تعذر تحميل ملخص المتجر في الوقت الحالي.",
        );
      }

      if (analyticsLoaded) {
        setError(null);
      }

      if (hasFreshPayload) {
        setLastUpdatedAt(new Date().toISOString());
      }

      setLoadState("ready");
    };

    void fetchAnalytics();

    return () => controller.abort();
  }, [
    appliedFilters.endDate,
    appliedFilters.period,
    appliedFilters.startDate,
  ]);

  const funnelMetrics = useMemo(
    () => buildFunnelMetrics(analytics),
    [analytics],
  );

  const dataHealth = useMemo(
    () => buildDataHealthStatus(analytics, dailyData),
    [analytics, dailyData],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top" as const,
          align: "start" as const,
          labels: {
            color: isDarkMode ? "#d7e4f4" : "#32445d",
            font: {
              family: "Manrope, Geist Variable, sans-serif",
            },
            usePointStyle: true,
            boxWidth: 10,
          },
        },
        tooltip: {
          backgroundColor: isDarkMode ? "#0b1729" : "#ffffff",
          titleColor: isDarkMode ? "#edf4ff" : "#0f1b2d",
          bodyColor: isDarkMode ? "#d7e4f4" : "#32445d",
          borderColor: isDarkMode ? "#24384f" : "#d7e4f4",
          borderWidth: 1,
          rtl: true,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: isDarkMode ? "#93abc7" : "#647991",
          },
        },
        y: {
          type: "linear" as const,
          position: "right" as const,
          grid: {
            color: isDarkMode
              ? "rgba(147, 171, 199, 0.14)"
              : "rgba(100, 121, 145, 0.14)",
          },
          ticks: {
            color: isDarkMode ? "#93abc7" : "#647991",
          },
          title: {
            display: true,
            text: "الزيارات",
            color: isDarkMode ? "#93abc7" : "#647991",
          },
        },
        y1: {
          type: "linear" as const,
          position: "left" as const,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: isDarkMode ? "#93abc7" : "#647991",
          },
          title: {
            display: true,
            text: "الإيراد",
            color: isDarkMode ? "#93abc7" : "#647991",
          },
        },
      },
    }),
    [isDarkMode],
  );

  const chartData = useMemo(
    () => ({
      labels: dailyData.map((point) => formatDateLabel(point.date)),
      datasets: [
        {
          label: "الزيارات",
          data: dailyData.map((point) => coerceNumber(point.totalVisits)),
          borderColor: "#2f6bff",
          backgroundColor: "rgba(47, 107, 255, 0.12)",
          fill: true,
          tension: 0.38,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: "y",
        },
        {
          label: "الإيراد",
          data: dailyData.map((point) => coerceNumber(point.totalRevenue)),
          borderColor: "#14b87a",
          backgroundColor: "rgba(20, 184, 122, 0.1)",
          fill: true,
          tension: 0.34,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: "y1",
        },
      ],
    }),
    [dailyData],
  );

  const highlightedProduct = topProducts[0] ?? null;
  const rankedProducts = highlightedProduct
    ? topProducts.slice(1, 6)
    : topProducts.slice(0, 6);
  const decisionValue = analytics
    ? dataHealth.tone === "critical"
      ? "راجع التتبع"
      : formatPercent(analytics.conversionRate)
    : "--";
  const decisionDescription =
    dataHealth.tone === "critical"
      ? "هناك شراء أو تصفح لاحق بينما الزيارات المرجعية غير مكتملة، لذلك معدل التحويل الحالي لا يصلح كمرجع قرار."
      : dataHealth.tone === "partial"
        ? "الملخص العام مفيد كبداية، لكن توجد فجوة محدودة في التتبع أو في الاتجاه اليومي يجب أخذها في الاعتبار."
        : "قراءة سريعة من الزيارات المسجلة إلى إتمام الشراء خلال الفترة المحددة.";
  const healthChipDescription =
    dataHealth.tone === "healthy"
      ? "الملخص صالح للقراءة اليومية السريعة"
      : dataHealth.tone === "partial"
        ? "بعض المسارات تحتاج مراجعة بسيطة"
        : "راجع التتبع قبل الحكم على التحويل";

  const handlePeriodChange = (nextPeriod: string) => {
    setFilters((previous) => ({
      ...previous,
      period: nextPeriod,
      ...(nextPeriod === "custom"
        ? {}
        : {
            startDate: "",
            endDate: "",
          }),
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
    const nextStartDate =
      filters.startDate || customStartDateInputRef.current?.value || "";
    const nextEndDate =
      filters.endDate || customEndDateInputRef.current?.value || "";

    if (!nextStartDate || !nextEndDate) {
      setError("اختر تاريخ البداية والنهاية قبل تطبيق الفترة المخصصة.");
      return;
    }

    if (nextStartDate > nextEndDate) {
      setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
      return;
    }

    setError(null);
    setFilters((previous) => ({
      ...previous,
      startDate: nextStartDate,
      endDate: nextEndDate,
    }));
    setAppliedFilters({
      period: "custom",
      startDate: nextStartDate,
      endDate: nextEndDate,
    });
  };

  if (isInitialLoading) {
    return <DashboardLoadingState />;
  }

  return (
    <div className="relative px-4 pb-10 pt-6 sm:px-6 lg:px-10" dir="rtl">
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{ background: "var(--app-bg-gradient)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{ background: "var(--app-bg-glow)" }}
      />

      <div className="mx-auto max-w-[1480px] space-y-6">
        <section
          className="relative overflow-hidden rounded-[34px] px-5 py-6 sm:px-8 sm:py-8"
          style={heroSurfaceStyle}
        >
          <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-white/35 blur-3xl dark:bg-white/10" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-500/10" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px] xl:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-[11px] tracking-[0.26em]"
                  style={buildTintStyle("var(--color-primary)", 10)}
                >
                  STORE ANALYTICS
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-[11px]"
                  style={buildTintStyle("var(--color-secondary)", 10)}
                >
                  {formatRangeLabel(appliedFilters)}
                </Badge>
                {isRefreshing && (
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-[11px]"
                    style={buildTintStyle("var(--color-warning)", 10)}
                  >
                    جارٍ التحديث
                  </Badge>
                )}
              </div>

              <div className="max-w-[68ch] space-y-3">
                <h1
                  className="text-3xl font-semibold leading-tight text-[var(--color-foreground)] sm:text-4xl lg:text-[3.1rem]"
                  style={{ fontFamily: "var(--theme-font-heading)" }}
                >
                  لوحة أداء المتجر
                </h1>
                <p className="max-w-[65ch] text-sm leading-7 text-[var(--color-muted-foreground)] sm:text-base">
                  ملخص سريع للحركة، التحويل، والمنتجات الأقوى خلال الفترة
                  المحددة. وعند وجود فجوة في التتبع ستظهر هنا بوضوح بدل أن
                  تختبئ داخل الأرقام.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <BriefingChip
                  label="إجمالي الإيراد"
                  value={analytics ? formatCurrency(analytics.totalRevenue) : "--"}
                  description="ما حققته الفترة الحالية بالكامل"
                  accent="var(--color-success)"
                />
                <BriefingChip
                  label="المشتريات"
                  value={analytics ? formatCount(analytics.purchases) : "--"}
                  description="عدد عمليات الشراء المكتملة"
                  accent="var(--color-secondary)"
                />
                <BriefingChip
                  label="حالة البيانات"
                  value={dataHealth.label}
                  description={healthChipDescription}
                  accent={healthToneAccentMap[dataHealth.tone]}
                />
              </div>
            </div>

            <div
              className="rounded-[28px] p-4 sm:p-5"
              style={buildPanelStyle("var(--color-secondary)")}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.22em] text-[var(--color-muted-foreground)] uppercase">
                    الفترة
                  </p>
                  <h2
                    className="mt-1 text-lg font-semibold text-[var(--color-foreground)]"
                    style={{ fontFamily: "var(--theme-font-heading)" }}
                  >
                    تصفية التقرير
                  </h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAppliedFilters({ ...appliedFilters })}
                  className="rounded-full"
                >
                  <ArrowPathIcon className="size-4" />
                  تحديث
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                <label className="grid gap-2 text-sm">
                  <span className="text-[var(--color-muted-foreground)]">
                    الفترة
                  </span>
                  <select
                    value={filters.period}
                    onChange={(event) => handlePeriodChange(event.target.value)}
                    className="h-11 rounded-2xl border px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                    style={controlSurfaceStyle}
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {showCustomRange && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      <span className="text-[var(--color-muted-foreground)]">
                        من
                      </span>
                      <input
                        ref={customStartDateInputRef}
                        type="date"
                        name="analytics-start-date"
                        autoComplete="off"
                        value={filters.startDate}
                        onChange={(event) =>
                          setFilters((previous) => ({
                            ...previous,
                            startDate: event.target.value,
                          }))
                        }
                        className={dateInputClassName}
                        style={controlSurfaceStyle}
                      />
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="text-[var(--color-muted-foreground)]">
                        إلى
                      </span>
                      <input
                        ref={customEndDateInputRef}
                        type="date"
                        name="analytics-end-date"
                        autoComplete="off"
                        value={filters.endDate}
                        onChange={(event) =>
                          setFilters((previous) => ({
                            ...previous,
                            endDate: event.target.value,
                          }))
                        }
                        className={dateInputClassName}
                        style={controlSurfaceStyle}
                      />
                    </label>
                    <Button
                      onClick={applyCustomRange}
                      className="h-11 rounded-2xl sm:col-span-2"
                    >
                      تطبيق الفترة
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                  <CalendarDaysIcon className="size-4" />
                  {lastUpdatedAt
                    ? `آخر تحديث ${timeFormatter.format(new Date(lastUpdatedAt))}`
                    : "سيظهر وقت آخر تحديث بعد أول تحميل ناجح"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {(error || warnings.length > 0 || dataHealth.issues.length > 0) && (
          <div className="grid gap-3 xl:grid-cols-3">
            {error && (
              <Alert
                className="rounded-[24px] p-4"
                style={buildPanelStyle("var(--color-warning)")}
              >
                <ExclamationTriangleIcon className="size-5" />
                <AlertTitle>الملخص الرئيسي لم يكتمل</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {warnings.length > 0 && (
              <Alert
                className="rounded-[24px] p-4"
                style={buildPanelStyle("var(--color-secondary)")}
              >
                <InformationCircleIcon className="size-5" />
                <AlertTitle>بعض الأقسام تعمل جزئيًا</AlertTitle>
                <AlertDescription className="space-y-1">
                  {warnings.map((warning, index) => (
                    <p key={`${warning}-${index}`}>{warning}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {dataHealth.issues.length > 0 && (
              <Alert
                className="rounded-[24px] p-4"
                style={buildPanelStyle(healthToneAccentMap[dataHealth.tone])}
              >
                <ExclamationTriangleIcon className="size-5" />
                <AlertTitle>{dataHealth.title}</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>{dataHealth.description}</p>
                  {dataHealth.issues.slice(0, 2).map((issue, index) => (
                    <p key={`${issue}-${index}`}>{issue}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
          <section
            className="rounded-[30px] p-5 sm:p-6"
            style={buildPanelStyle("var(--color-primary)")}
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                  قراءة التحويل
                </p>
                <div className="space-y-2">
                  <h2
                    className="text-4xl font-semibold text-[var(--color-foreground)] sm:text-[3.4rem]"
                    style={{ fontFamily: "var(--theme-font-heading)" }}
                  >
                    {decisionValue}
                  </h2>
                  <p className="max-w-[28rem] text-sm leading-7 text-[var(--color-muted-foreground)]">
                    {decisionDescription}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricPanel
                  label="إجمالي الزيارات"
                  value={analytics ? formatCount(analytics.totalVisits) : "--"}
                  meta="بداية الرحلة التي نقيس عليها البقية"
                  accent="var(--color-primary)"
                  icon={<UserGroupIcon className="size-5" />}
                />
                <MetricPanel
                  label="مشاهدات المنتجات"
                  value={analytics ? formatCount(analytics.totalProductViews) : "--"}
                  meta="عدد مرات الدخول إلى صفحات المنتجات"
                  accent="var(--color-secondary)"
                  icon={<EyeIcon className="size-5" />}
                />
                <MetricPanel
                  label="إضافات السلة"
                  value={analytics ? formatCount(analytics.addToCarts) : "--"}
                  meta="إشارات نية الشراء داخل الفترة"
                  accent="var(--color-warning)"
                  icon={<ShoppingCartIcon className="size-5" />}
                />
                <MetricPanel
                  label="المشتريات"
                  value={analytics ? formatCount(analytics.purchases) : "--"}
                  meta="عدد عمليات الإتمام خلال الفترة"
                  accent="var(--color-success)"
                  icon={<ShoppingCartIcon className="size-5" />}
                />
              </div>
            </div>
          </section>

        </div>

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <section
            className="rounded-[30px] p-5 sm:p-6"
            style={buildPanelStyle("var(--color-primary)")}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                  الإيقاع اليومي
                </p>
                <h2
                  className="mt-1 text-xl font-semibold text-[var(--color-foreground)]"
                  style={{ fontFamily: "var(--theme-font-heading)" }}
                >
                  الزيارات والإيرادات عبر الفترة
                </h2>
              </div>
              <div className="text-sm text-[var(--color-muted-foreground)]">
                {dailyData.length > 0
                  ? `${formatCount(dailyData.length)} نقطة يومية`
                  : "لا توجد سلسلة يومية مكتملة"}
              </div>
            </div>

            <div className="mt-5">
              {dailyData.length > 0 ? (
                <div className="h-[360px]">
                  <Line data={chartData} options={chartOptions} />
                </div>
              ) : (
                <EmptyPanel
                  title="السلسلة اليومية غير متاحة"
                  description="ملخص الفترة موجود، لكن لم تصل بيانات يومية كافية لبناء اتجاه موثوق."
                />
              )}
            </div>
          </section>

          <section
            className="rounded-[30px] p-5 sm:p-6"
            style={buildPanelStyle("var(--color-secondary)")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                  مسار التحويل
                </p>
                <h2
                  className="mt-1 text-xl font-semibold text-[var(--color-foreground)]"
                  style={{ fontFamily: "var(--theme-font-heading)" }}
                >
                  أين يتحرك الزائر وأين يفقد الزخم؟
                </h2>
              </div>
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 text-[11px]"
                style={buildTintStyle("var(--color-primary)", 9)}
              >
                {formatRangeLabel(appliedFilters)}
              </Badge>
            </div>

            <div className="mt-5 space-y-4">
              {funnelMetrics.length > 0 ? (
                funnelMetrics.map((metric, index) => (
                  <FunnelRow
                    key={metric.key}
                    metric={metric}
                    accent={funnelAccentMap[index] ?? "var(--color-primary)"}
                    isFirst={index === 0}
                  />
                ))
              ) : (
                <EmptyPanel
                  title="لا توجد رحلة تحويل بعد"
                  description="بمجرد وصول زيارات وتفاعلات كافية ستظهر خطوات الرحلة هنا بشكل بصري أوضح."
                />
              )}
            </div>
          </section>
        </div>

        <section
          className="rounded-[30px] p-5 sm:p-6"
          style={buildPanelStyle("var(--color-primary)")}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
                أبرز المنتجات
              </p>
              <h2
                className="mt-1 text-xl font-semibold text-[var(--color-foreground)]"
                style={{ fontFamily: "var(--theme-font-heading)" }}
              >
                المنتجات التي تحوّل الزيارة إلى نية شراء
              </h2>
            </div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              أفضل {formatCount(topProducts.length)} منتج في الفترة الحالية
            </div>
          </div>

          <div className="mt-5">
            {topProducts.length === 0 ? (
              <EmptyPanel
                title="لا توجد بيانات منتجات كافية"
                description="سنملأ هذه المنطقة بمجرد تسجيل مشاهدات ومنتجات متكررة داخل الفترة المحددة."
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
                {highlightedProduct && (
                  <FeaturedProductCard product={highlightedProduct} />
                )}

                <div className="grid gap-3">
                  {rankedProducts.map((product, index) => (
                    <ProductLeaderboardRow
                      key={product.id}
                      product={product}
                      rank={highlightedProduct ? index + 2 : index + 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

interface BriefingChipProps {
  label: string;
  value: string;
  description: string;
  accent: string;
}

const BriefingChip: React.FC<BriefingChipProps> = ({
  label,
  value,
  description,
  accent,
}) => (
  <div className="rounded-[24px] p-4" style={buildPanelStyle(accent)}>
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
      {label}
    </p>
    <p className="mt-3 text-lg font-semibold text-[var(--color-foreground)]">
      {value}
    </p>
    <p className="mt-1 text-xs leading-6 text-[var(--color-muted-foreground)]">
      {description}
    </p>
  </div>
);

interface MetricPanelProps {
  label: string;
  value: string;
  meta: string;
  accent: string;
  icon: React.ReactNode;
}

const MetricPanel: React.FC<MetricPanelProps> = ({
  label,
  value,
  meta,
  accent,
  icon,
}) => (
  <div className="rounded-[24px] p-4" style={buildPanelStyle(accent)}>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-[var(--color-foreground)]">
        {label}
      </p>
      <span
        className="inline-flex size-10 items-center justify-center rounded-2xl"
        style={buildTintStyle(accent, 11)}
      >
        {icon}
      </span>
    </div>
    <p className="mt-4 text-2xl font-semibold text-[var(--color-foreground)]">
      {value}
    </p>
    <p className="mt-2 text-xs leading-6 text-[var(--color-muted-foreground)]">
      {meta}
    </p>
  </div>
);

interface FunnelRowProps {
  metric: FunnelMetric;
  accent: string;
  isFirst: boolean;
}

const FunnelRow: React.FC<FunnelRowProps> = ({ metric, accent, isFirst }) => {
  const hasMissingBaseline = !isFirst && metric.value > 0 && metric.baselineRate === 0;
  const supportingText = isFirst
    ? "المرجع الأساسي الذي تُقرأ نسبة بقية المراحل عليه"
    : hasMissingBaseline
      ? "هذه المرحلة موجودة لكن الزيارات المرجعية غير مسجلة، لذلك يجب مراجعة التتبع قبل قراءة النسب"
      : metric.key === "views" && metric.baselineRate > 100
        ? "الزيارة الواحدة قد تتضمن أكثر من مشاهدة منتج، لذلك تجاوز 100% هنا طبيعي ولا يعني خللًا بحد ذاته"
      : metric.key === "started-orders"
        ? "هذه الخطوة تمثل بدء الطلب سواء بدأ من السلة أو من الطلب السريع المباشر"
      : metric.exceedsVisits
      ? "هذه المرحلة أعلى من عدد الزيارات المسجلة، لذا تُقرأ كإشارة أداء لا كمسار خطي صارم"
      : metric.stepRate !== null
        ? `من المرحلة السابقة ${formatPercent(metric.stepRate)}`
        : "لا توجد مرحلة سابقة للمقارنة";
  const baselineText = hasMissingBaseline
    ? "المرجع غير متاح"
    : `من الزيارات ${formatPercent(metric.baselineRate)}`;

  return (
    <div className="space-y-2 rounded-[22px] p-4" style={buildPanelStyle(accent)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {metric.label}
          </p>
          <p className="text-xs leading-6 text-[var(--color-muted-foreground)]">
            {supportingText}
          </p>
        </div>
        <div className="text-left">
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            {formatCount(metric.value)}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {baselineText}
          </p>
        </div>
      </div>

      <div
        className="h-3 overflow-hidden rounded-full"
        style={trackSurfaceStyle}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${metric.visualShare}%`,
            background: accent,
          }}
        />
      </div>
    </div>
  );
};

const FeaturedProductCard: React.FC<{ product: TopProduct }> = ({ product }) => {
  const image = getTopProductImage(product);
  const views = coerceNumber(product.views);
  const purchases = getTopProductPurchases(product);
  const hasTrackingGap = views === 0 && purchases > 0;
  const tone = getConversionTone(product.conversionRate);
  const accent = hasTrackingGap
    ? "var(--color-warning)"
    : conversionToneMap[tone];
  const conversionLabel = hasTrackingGap
    ? "تتبع ناقص"
    : formatPercent(product.conversionRate);

  return (
    <article className="overflow-hidden rounded-[28px]" style={buildPanelStyle(accent)}>
      <div className="grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
        <div
          className="relative aspect-square overflow-hidden rounded-[24px]"
          style={softMediaSurfaceStyle}
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
              لا توجد صورة
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
                المنتج الأوضح أثرًا
              </p>
              <h3
                className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]"
                style={{ fontFamily: "var(--theme-font-heading)" }}
              >
                {product.name}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                {formatCurrency(product.price)}
              </p>
            </div>
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 text-[11px]"
              style={buildTintStyle(accent, 10)}
            >
              {conversionLabel}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ProductStat
              label="المشاهدات"
              value={formatCount(views)}
              accent="var(--color-primary)"
            />
            <ProductStat
              label="السلة"
              value={formatCount(product.addToCarts)}
              accent="var(--color-warning)"
            />
            <ProductStat
              label="المبيعات"
              value={formatCount(purchases)}
              accent="var(--color-success)"
            />
          </div>
        </div>
      </div>
    </article>
  );
};

interface ProductLeaderboardRowProps {
  product: TopProduct;
  rank: number;
}

const ProductLeaderboardRow: React.FC<ProductLeaderboardRowProps> = ({
  product,
  rank,
}) => {
  const image = getTopProductImage(product);
  const views = coerceNumber(product.views);
  const purchases = getTopProductPurchases(product);
  const hasTrackingGap = views === 0 && purchases > 0;
  const tone = getConversionTone(product.conversionRate);
  const accent = hasTrackingGap
    ? "var(--color-warning)"
    : conversionToneMap[tone];
  const conversionLabel = hasTrackingGap
    ? "تتبع ناقص"
    : formatPercent(product.conversionRate);
  const supportingLabel = hasTrackingGap
    ? `${formatCount(purchases)} مبيعات`
    : `${formatCount(views)} مشاهدة`;

  return (
    <article className="rounded-[24px] p-4" style={buildPanelStyle(accent)}>
      <div className="flex items-center gap-4">
        <span
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold"
          style={buildTintStyle(accent, 10)}
        >
          #{rank}
        </span>

        <div
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[18px]"
          style={softMediaSurfaceStyle}
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
            {product.name}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {formatCurrency(product.price)}
          </p>
        </div>

        <div className="text-left">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {conversionLabel}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {supportingLabel}
          </p>
        </div>
      </div>
    </article>
  );
};

const ProductStat: React.FC<{
  label: string;
  value: string;
  accent: string;
}> = ({ label, value, accent }) => (
  <div className="rounded-[20px] p-3" style={buildPanelStyle(accent)}>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
      {label}
    </p>
    <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">
      {value}
    </p>
  </div>
);

const EmptyPanel: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
  <div
    className="rounded-[24px] p-5 text-center"
    style={buildPanelStyle("var(--color-muted-foreground)")}
  >
    <p
      className="text-lg font-semibold text-[var(--color-foreground)]"
      style={{ fontFamily: "var(--theme-font-heading)" }}
    >
      {title}
    </p>
    <p className="mt-2 text-sm leading-7 text-[var(--color-muted-foreground)]">
      {description}
    </p>
  </div>
);

const DashboardLoadingState: React.FC = () => (
  <div className="relative px-4 pb-10 pt-6 sm:px-6 lg:px-10" dir="rtl">
    <div
      className="pointer-events-none absolute inset-0 -z-20"
      style={{ background: "var(--app-bg-gradient)" }}
    />
    <div
      className="pointer-events-none absolute inset-0 -z-10 opacity-90"
      style={{ background: "var(--app-bg-glow)" }}
    />

    <div className="mx-auto max-w-[1480px] space-y-6">
      <div
        className="rounded-[34px] px-5 py-6 sm:px-8 sm:py-8"
        style={heroSurfaceStyle}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-4">
            <div className="h-6 w-36 animate-pulse rounded-full bg-white/55 dark:bg-white/10" />
            <div className="h-14 w-full max-w-[36rem] animate-pulse rounded-[22px] bg-white/55 dark:bg-white/10" />
            <div className="h-5 w-full max-w-[40rem] animate-pulse rounded-full bg-white/45 dark:bg-white/10" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-[24px] bg-white/45 dark:bg-white/10"
                />
              ))}
            </div>
          </div>
          <div className="h-[290px] animate-pulse rounded-[28px] bg-white/45 dark:bg-white/10" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
        <div
          className="h-[280px] animate-pulse rounded-[30px] bg-white/70 dark:bg-white/5"
          style={shellSurfaceStyle}
        />
        <div
          className="h-[280px] animate-pulse rounded-[30px] bg-white/70 dark:bg-white/5"
          style={shellSurfaceStyle}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-[184px] animate-pulse rounded-[28px] bg-white/70 dark:bg-white/5"
            style={shellSurfaceStyle}
          />
        ))}
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div
          className="h-[460px] animate-pulse rounded-[30px] bg-white/70 dark:bg-white/5"
          style={shellSurfaceStyle}
        />
        <div
          className="h-[460px] animate-pulse rounded-[30px] bg-white/70 dark:bg-white/5"
          style={shellSurfaceStyle}
        />
      </div>
    </div>
  </div>
);

export default StoreAnalyticsDashboard;
