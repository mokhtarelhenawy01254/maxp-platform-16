import React, { useEffect, useMemo, useState } from "react";
import analyticsService from "../../services/analyticsService";
import { RotateCcw, Sparkles } from "lucide-react";
import StoreAnalyticsTabs from "./StoreAnalyticsTabs";
import {
  AnalyticsData,
  DailyAnalyticsPoint,
  TopProduct,
  ProfitStats,
  calculateTrend,
  buildDataHealthStatus,
  buildFunnelMetrics,
  coerceNumber,
  generateExecutiveBriefing,
  formatDateLabel,
  PERIOD_OPTIONS,
  buildDropOffAnalysis,
} from "./storeAnalyticsDashboard.utils";
import StoreAnalyticsTelemetry from "./StoreAnalyticsTelemetry";
import StoreAnalyticsFunnel from "./StoreAnalyticsFunnel";
import StoreAnalyticsCharts from "./StoreAnalyticsCharts";
import ErrorBoundary from "../../components/common/ErrorBoundary";

type FilterState = {
  period: string;
  startDate: string;
  endDate: string;
};

type LoadState = "initial" | "refreshing" | "ready";

const unwrapResponseData = <T,>(payload: unknown): T | null => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T }).data ?? null;
  }
  return (payload as T) ?? null;
};

export const StoreAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailyData, setDailyData] = useState<DailyAnalyticsPoint[]>([]);
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null);
  const [filterDraft, setFilterDraft] = useState<FilterState>({
    period: "30",
    startDate: "",
    endDate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    period: "30",
    startDate: "",
    endDate: "",
  });
  const [loadState, setLoadState] = useState<LoadState>("initial");
  const [, setPageError] = useState<string | null>(null);

  const isCustomPeriod = filterDraft.period === "custom";
  const isRefreshing = loadState === "refreshing";
  const hasExistingData = analytics !== null || topProducts.length > 0 || dailyData.length > 0;
  const isInitialLoading = loadState === "initial" && !hasExistingData;

  useEffect(() => {
    if (appliedFilters.period === "custom" && (!appliedFilters.startDate || !appliedFilters.endDate)) {
      return;
    }

    const abortController = new AbortController();

    const fetchAnalytics = async () => {
      setLoadState(hasExistingData ? "refreshing" : "initial");
      setPageError(null);

      try {
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

        if (abortController.signal.aborted) return;

        if (storeResult.status === "fulfilled") {
          const data = unwrapResponseData<AnalyticsData>(storeResult.value);
          if (data) setAnalytics(data);
        }

        if (topProductsResult.status === "fulfilled") {
          const data = unwrapResponseData<TopProduct[]>(topProductsResult.value) ?? [];
          setTopProducts(Array.isArray(data) ? data : []);
        }

        if (dailyResult.status === "fulfilled") {
          const data = unwrapResponseData<DailyAnalyticsPoint[]>(dailyResult.value) ?? [];
          setDailyData(Array.isArray(data) ? data : []);
        }

        if (profitResult.status === "fulfilled") {
          const data = unwrapResponseData<ProfitStats>(profitResult.value);
          setProfitStats(data);
        }
      } catch (err: any) {
        setPageError(err?.message || "حدث خطأ أثناء تحميل تحليلات المتجر");
      } finally {
        if (!abortController.signal.aborted) setLoadState("ready");
      }
    };

    void fetchAnalytics();
    return () => abortController.abort();
  }, [appliedFilters.endDate, appliedFilters.period, appliedFilters.startDate]);

  const funnelMetrics = useMemo(() => buildFunnelMetrics(analytics), [analytics]);
  const dataHealth = useMemo(() => buildDataHealthStatus(analytics, dailyData), [analytics, dailyData]);
  const executiveBriefing = useMemo(
    () => generateExecutiveBriefing(analytics, topProducts, dataHealth),
    [analytics, topProducts, dataHealth],
  );

  const chartData = useMemo(() => {
    return dailyData.map((item) => {
      const visits = coerceNumber(item.totalVisits);
      const purchases = coerceNumber(item.totalPurchases);
      const rate = visits > 0 ? parseFloat(((purchases / visits) * 100).toFixed(2)) : 0;
      return {
        date: formatDateLabel(item.date),
        visits,
        purchases,
        revenue: coerceNumber(item.totalRevenue),
        rate,
      };
    });
  }, [dailyData]);

  // Core metrics
  const totalVisits = coerceNumber(analytics?.totalVisits);
  const totalViews = coerceNumber(analytics?.totalProductViews);
  const totalCarts = coerceNumber(analytics?.addToCarts);
  const totalCheckouts = coerceNumber(analytics?.checkouts);
  const totalPurchases = coerceNumber(analytics?.purchases);
  const totalRevenue = coerceNumber(analytics?.totalRevenue);
  const conversionRate = coerceNumber(analytics?.conversionRate);
  const avgOrderValue = coerceNumber(analytics?.avgOrderValue);
  const activeVisitors = coerceNumber(analytics?.activeVisitors);

  // 3-Tier Conversion & Recovery metrics
  const organicPurchases = coerceNumber(
    analytics?.naturalPurchases ?? (analytics ? Math.max(0, totalPurchases - (analytics.recoveredPurchases || 0)) : 0),
  );
  const recoveredPurchases = coerceNumber(analytics?.recoveredPurchases);
  const recoveredRevenue = coerceNumber(analytics?.recoveredRevenue);
  const incompleteCarts = coerceNumber(analytics?.incompleteCarts);
  const organicConversionRate = coerceNumber(
    analytics?.organicConversionRate ?? (totalVisits > 0 ? (organicPurchases / totalVisits) * 100 : 0),
  );
  const realizedConversionRate = coerceNumber(analytics?.realizedConversionRate ?? conversionRate);
  const grossIntentOrders = organicPurchases + incompleteCarts + recoveredPurchases;
  const potentialConversionRate = coerceNumber(
    analytics?.potentialConversionRate ?? (totalVisits > 0 ? (grossIntentOrders / totalVisits) * 100 : 0),
  );
  const conversionLift = coerceNumber(
    analytics?.conversionLift ?? Math.max(0, realizedConversionRate - organicConversionRate),
  );
  const recoveryRate = coerceNumber(
    analytics?.recoveryRate ??
      ((incompleteCarts + recoveredPurchases) > 0
        ? (recoveredPurchases / (incompleteCarts + recoveredPurchases)) * 100
        : 0),
  );

  // Period Trends
  const revenueTrend = useMemo(
    () => calculateTrend(totalRevenue, analytics?.prevPeriod?.revenue),
    [totalRevenue, analytics?.prevPeriod?.revenue],
  );
  const visitsTrend = useMemo(
    () => calculateTrend(totalVisits, analytics?.prevPeriod?.visits),
    [totalVisits, analytics?.prevPeriod?.visits],
  );
  const ordersTrend = useMemo(
    () =>
      calculateTrend(
        totalPurchases,
        analytics?.prevPeriod?.purchases ?? analytics?.prevPeriod?.totalOrders,
      ),
    [totalPurchases, analytics?.prevPeriod?.purchases, analytics?.prevPeriod?.totalOrders],
  );

  // Profitability
  const netProfit = profitStats?.summary?.netProfit ?? 0;
  const profitMargin = profitStats?.summary?.profitMargin ?? 0;

  // Step Ratios
  const visitorToCart = totalVisits > 0 ? ((totalCarts / totalVisits) * 100).toFixed(1) : "0.0";
  const cartToCheckout = totalCarts > 0 ? ((totalCheckouts / totalCarts) * 100).toFixed(1) : "0.0";
  const checkoutToOrder = totalCheckouts > 0 ? ((totalPurchases / totalCheckouts) * 100).toFixed(1) : "0.0";

  // Drop-off analysis
  const dropOffAnalysis = useMemo(
    () => buildDropOffAnalysis(totalVisits, totalViews, totalCarts, totalPurchases),
    [totalVisits, totalViews, totalCarts, totalPurchases],
  );

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
    if (!filterDraft.startDate || !filterDraft.endDate) return;
    setAppliedFilters({
      period: "custom",
      startDate: filterDraft.startDate,
      endDate: filterDraft.endDate,
    });
  };

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-xs text-muted-foreground">جارٍ تحميل تحليلات المتجر ومعدلات التحويل…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              لوحة تحليلات المتجر والتحويل
            </h1>
            {activeVisitors > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeVisitors} متواجد حالياً
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            مركز القيادة التجاري: حركة الزيارات، قمع الشراء، والتحويل ثلاثي المستويات
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={filterDraft.period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="rounded-xl border border-border/70 bg-card px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-hidden"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {isCustomPeriod && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filterDraft.startDate}
                onChange={(e) => setFilterDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                className="px-2.5 py-1 text-xs border border-border/70 rounded-xl bg-card text-foreground"
              />
              <span className="text-xs text-muted-foreground">إلى</span>
              <input
                type="date"
                value={filterDraft.endDate}
                onChange={(e) => setFilterDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                className="px-2.5 py-1 text-xs border border-border/70 rounded-xl bg-card text-foreground"
              />
              <button
                type="button"
                onClick={applyCustomRange}
                className="px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all active:scale-[0.97]"
              >
                تطبيق
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAppliedFilters((prev) => ({ ...prev }))}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigator */}
      <StoreAnalyticsTabs />

      {/* Executive Briefing Banner */}
      {executiveBriefing && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 shadow-2xs">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-foreground">
            <span className="font-bold">{executiveBriefing.headline}: </span>
            <span className="text-muted-foreground">{executiveBriefing.details}</span>
          </div>
        </div>
      )}

      {/* 2. Core Telemetry & Conversion Lift */}
      <StoreAnalyticsTelemetry
        totalRevenue={totalRevenue}
        revenueTrend={revenueTrend}
        totalOrders={totalPurchases}
        ordersTrend={ordersTrend}
        totalVisits={totalVisits}
        visitsTrend={visitsTrend}
        conversionRate={conversionRate}
        avgOrderValue={avgOrderValue}
        netProfit={netProfit}
        profitMargin={profitMargin}
        organicConversionRate={organicConversionRate}
        potentialConversionRate={potentialConversionRate}
        realizedConversionRate={realizedConversionRate}
        conversionLift={conversionLift}
        recoveredRevenue={recoveredRevenue}
        recoveredPurchases={recoveredPurchases}
        recoveryRate={recoveryRate}
      />

      {/* 3. Conversion Funnel & Drop-off Diagnostics */}
      <ErrorBoundary fallback={null}>
        <StoreAnalyticsFunnel
          funnelMetrics={funnelMetrics}
          visitorToCart={visitorToCart}
          cartToCheckout={cartToCheckout}
          checkoutToOrder={checkoutToOrder}
          dropOffAnalysis={dropOffAnalysis}
        />
      </ErrorBoundary>

      {/* 4. Visual Trend Chart & Top Products */}
      <StoreAnalyticsCharts
        chartData={chartData}
        topProducts={topProducts}
      />
    </div>
  );
};

export default StoreAnalyticsDashboard;
