import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  DollarSign,
  Eye,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import { Button } from "../components/ui/button";
import {
  BusinessMetricsStrip,
} from "../components/business/BusinessMetrics";
import { BusinessPageShell } from "../components/business/BusinessSurface";
import { cn } from "../lib/utils";
import api from "../services/api";
import { companyOnboardingService } from "../services/companyOnboardingService";
import { useAuth } from "../hooks/useAuthSimple";
import {
  createStorageKey,
  getWithExpiry,
  setWithExpiry,
} from "../utils/storage";
import {
  findMatchingPresetRange,
  formatDateRangeValue,
  getDateRangeDisplayLabel,
  getInitialDateRange,
  getPresetRanges,
} from "./companyDashboardDateRange";
import { getCompanyActivationState } from "../utils/companyActivation";

import DashboardSurfaceCard from "./dashboard/DashboardSurfaceCard";
import DashboardIntroBand from "./dashboard/DashboardIntroBand";
import OnboardingResumeCard from "./dashboard/OnboardingResumeCard";
import ActivationLaunchCard from "./dashboard/ActivationLaunchCard";
import DateRangeToolbar from "./dashboard/DateRangeToolbar";
import FinancialSquare from "./dashboard/FinancialSquare";
import DashboardOperationsPanel from "./dashboard/DashboardOperationsPanel";
import TopProductsPanel from "./dashboard/TopProductsPanel";
import RevenueTrendChart from "./dashboard/RevenueTrendChart";
import DashboardSkeleton from "./dashboard/DashboardSkeleton";
import DashboardEmptyState from "./dashboard/DashboardEmptyState";
import {
  toneMap,
  DASHBOARD_CACHE_TTL_MS,
} from "./dashboard/constants";
import type {
  DashboardCompany,
  DashboardData,
  DashboardResponse,
  DashboardTopProduct,
  FetchDashboardOptions,
} from "./dashboard/types";
import { isRequestCancelled, getErrorMessage } from "./dashboard/utils";

type DashboardDateRange = {
  start: string;
  end: string;
};

const CompanyDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isRtl = i18n.language === "ar";
  const numberLocale = isRtl ? "ar-EG" : "en-US";
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const dashboardDataRef = useRef<DashboardData | null>(null);
  const activationTrackingSignatureRef = useRef("");

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DashboardDateRange>(
    getInitialDateRange,
  );
  const [showCustomRangeInputs, setShowCustomRangeInputs] = useState(false);

  useEffect(() => {
    dashboardDataRef.current = dashboardData;
  }, [dashboardData]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const presets = useMemo(() => getPresetRanges(t), [t]);

  const activePreset = useMemo(() => {
    return findMatchingPresetRange(dateRange, presets);
  }, [dateRange, presets]);
  const activePresetId = activePreset?.id ?? null;
  const selectedFilterId = showCustomRangeInputs
    ? "custom"
    : activePresetId ?? "custom";

  const handleStartDateChange = useCallback((value: string) => {
    if (!value) return;
    setShowCustomRangeInputs(true);
    setDateRange((prev) => {
      const start = value;
      const end = prev.end && prev.end < start ? start : prev.end;
      return { start, end };
    });
  }, []);

  const handleEndDateChange = useCallback((value: string) => {
    if (!value) return;
    setShowCustomRangeInputs(true);
    setDateRange((prev) => {
      const end = value;
      const start = prev.start && prev.start > end ? end : prev.start;
      return { start, end };
    });
  }, []);

  const handleSelectFilter = useCallback(
    (value: string) => {
      if (value === "custom") {
        setShowCustomRangeInputs(true);
        return;
      }
      const nextPreset = presets.find((preset) => preset.id === value);
      if (!nextPreset) return;
      setDateRange(nextPreset.range);
      setShowCustomRangeInputs(false);
    },
    [presets],
  );

  const cacheKey = useMemo(
    () =>
      createStorageKey(
        "dashboard",
        `company:${user?.companyId ?? "anon"}:${dateRange.start}:${dateRange.end}`,
      ),
    [dateRange.end, dateRange.start, user?.companyId],
  );

  const fetchDashboardData = useCallback(
    async ({ force = false, signal }: FetchDashboardOptions = {}) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      const cached = !force ? getWithExpiry<DashboardData>(cacheKey) : null;
      if (cached) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        dashboardDataRef.current = cached;
        setDashboardData(cached);
        setError(null);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (dashboardDataRef.current) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await api.get<DashboardResponse>(
          "/company/dashboard",
          {
            params: {
              startDate: dateRange.start,
              endDate: dateRange.end,
            },
            signal,
          },
        );

        if (
          signal?.aborted ||
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        const nextData = response.data.data;

        if (response.data.success && nextData) {
          dashboardDataRef.current = nextData;
          setDashboardData(nextData);
          setWithExpiry(cacheKey, nextData, DASHBOARD_CACHE_TTL_MS);
          setError(null);
          return;
        }

        setError(
          response.data.message || t("companyDashboard.errors.fetchFailed"),
        );
      } catch (fetchError) {
        if (isRequestCancelled(fetchError)) return;
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setError(
          getErrorMessage(fetchError, t("companyDashboard.errors.fetchFailed")),
        );
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [cacheKey, dateRange.end, dateRange.start, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchDashboardData({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchDashboardData]);

  const company: DashboardCompany = dashboardData?.company ?? {
    id: "",
    name: user?.company?.name || "Company",
    plan: null,
    slug: null,
  };
  const counts = dashboardData?.counts ?? {};
  const orderHealth = dashboardData?.orderHealth ?? {};
  const recentActivity = dashboardData?.recentActivity ?? {};
  const activationState = getCompanyActivationState(company, counts);
  const activationCompletedStepIds = useMemo(
    () =>
      activationState.steps
        .filter((step) => step.done)
        .map((step) => step.id),
    [activationState.steps],
  );
  const rangeStats = dashboardData?.metrics ?? {};
  const topProducts: DashboardTopProduct[] = Array.isArray(
    dashboardData?.topProducts,
  )
    ? (dashboardData?.topProducts ?? [])
    : [];
  const customerUsagePercentage = Number(counts.customers?.percentage ?? 0);
  const isTodayRange = activePresetId === "today";

  const formatCount = useCallback(
    (value: number | null | undefined) => {
      if (value === null || value === undefined) {
        return t("common.no_data");
      }
      return Number(value).toLocaleString(numberLocale);
    },
    [numberLocale, t],
  );

  const formatRate = useCallback(
    (value: number | null | undefined) => {
      if (value === null || value === undefined) return t("common.no_data");
      return `${Number(value).toLocaleString(numberLocale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}%`;
    },
    [numberLocale, t],
  );

  const formatDecimal = useCallback(
    (
      value: number | null | undefined,
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
    ) => {
      if (value === null || value === undefined) return t("common.no_data");
      return Number(value).toLocaleString(numberLocale, {
        minimumFractionDigits,
        maximumFractionDigits,
      });
    },
    [numberLocale, t],
  );

  const formatMoney = useCallback(
    (value: number | null | undefined) => {
      if (value === null || value === undefined) return t("common.no_data");
      return new Intl.NumberFormat(numberLocale, {
        style: "currency",
        currency: company.currency || "USD",
      }).format(Number(value));
    },
    [numberLocale, t, company.currency],
  );

  const currentRangeLabel = getDateRangeDisplayLabel(
    dateRange,
    presets,
    numberLocale,
  );
  const currentRangeMeta = useMemo(() => {
    const formattedStart = formatDateRangeValue(dateRange.start, numberLocale);
    const formattedEnd = formatDateRangeValue(dateRange.end, numberLocale);
    if (formattedStart === formattedEnd) return formattedStart;
    return `${formattedStart} - ${formattedEnd}`;
  }, [dateRange.end, dateRange.start, numberLocale]);
  const noDataLabel = t("common.no_data");

  const renderMetricValue = useCallback(
    (value: number | null | undefined, formattedValue: string) => {
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">{noDataLabel}</span>;
      }
      return formattedValue;
    },
    [noDataLabel],
  );

  const productCountLabel = formatCount(counts.products);

  const metricItems = useMemo(
    () => [
      {
        title: t("companyDashboard.financials.revenue"),
        value: renderMetricValue(
          dashboardData?.financials?.totalRevenue,
          formatMoney(dashboardData?.financials?.totalRevenue),
        ),
        subtitle: t("companyDashboard.metrics.revenueSubtitle"),
        tone: toneMap.blue,
        icon: DollarSign,
        onClick: () => navigate("/analytics/store"),
      },
      {
        title: t("companyDashboard.financials.profit"),
        value: renderMetricValue(
          dashboardData?.financials?.grossProfit,
          formatMoney(dashboardData?.financials?.grossProfit),
        ),
        subtitle: t("companyDashboard.metrics.profitSubtitle"),
        tone: toneMap.green,
        icon: TrendingUp,
        onClick: () => navigate("/reports"),
      },
      {
        title: t("companyDashboard.financials.aov"),
        value: renderMetricValue(
          dashboardData?.financials?.aov,
          formatMoney(dashboardData?.financials?.aov),
        ),
        subtitle: t("companyDashboard.metrics.aovSubtitle"),
        tone: toneMap.purple,
        icon: ShoppingCart,
        onClick: () => navigate("/analytics/store"),
      },
      {
        title: t("companyDashboard.metrics.totalCustomers"),
        value: renderMetricValue(
          dashboardData?.counts?.customers,
          formatCount(dashboardData?.counts?.customers),
        ),
        subtitle: t("companyDashboard.metrics.totalCustomersSubtitle"),
        tone: toneMap.blue,
        icon: Eye,
        onClick: () => navigate("/customers"),
      },
      {
        title: t("companyDashboard.metrics.newCustomers"),
        value: renderMetricValue(
          dashboardData?.recentActivity?.newCustomers,
          formatCount(dashboardData?.recentActivity?.newCustomers),
        ),
        subtitle: t("companyDashboard.metrics.newCustomersSubtitle"),
        tone: toneMap.green,
        icon: TrendingUp,
        onClick: () => navigate("/customers"),
      },
      {
        title: t("companyDashboard.rangeStats.conversionRate"),
        value: renderMetricValue(
          rangeStats.conversionRate,
          formatRate(rangeStats.conversionRate),
        ),
        subtitle: t("companyDashboard.metrics.conversionRateSubtitle"),
        tone: toneMap.purple,
        icon: TrendingUp,
        onClick: () => navigate("/analytics/store"),
      },
      {
        title: t("companyDashboard.rangeStats.storeVisits"),
        value: renderMetricValue(
          rangeStats.visits,
          formatCount(rangeStats.visits),
        ),
        subtitle: t("companyDashboard.metrics.storeVisitsSubtitle"),
        tone: toneMap.green,
        icon: Eye,
        onClick: () => navigate("/analytics/store"),
      },
      {
        title: t("companyDashboard.metrics.openOrders"),
        value: renderMetricValue(
          orderHealth.openOrders,
          formatCount(orderHealth.openOrders),
        ),
        subtitle: t("companyDashboard.metrics.openOrdersSubtitle"),
        tone: toneMap.orange,
        icon: ShoppingCart,
        onClick: () => navigate("/orders"),
      },
      {
        title: t("companyDashboard.metrics.lowStock"),
        value: renderMetricValue(
          dashboardData?.inventory?.lowStockCount,
          formatCount(dashboardData?.inventory?.lowStockCount),
        ),
        subtitle: t("companyDashboard.metrics.lowStockSubtitle"),
        tone: toneMap.orange,
        icon: AlertTriangle,
        onClick: () => navigate("/products"),
      },
      {
        title: t("companyDashboard.metrics.outOfStock"),
        value: renderMetricValue(
          dashboardData?.inventory?.outOfStockCount,
          formatCount(dashboardData?.inventory?.outOfStockCount),
        ),
        subtitle: t("companyDashboard.metrics.outOfStockSubtitle"),
        tone: toneMap.orange,
        icon: Package,
        onClick: () => navigate("/products"),
      },
      {
        title: isTodayRange
          ? t("companyDashboard.rangeStats.ordersToday")
          : t("companyDashboard.rangeStats.orders"),
        value: renderMetricValue(
          rangeStats.orders,
          formatCount(rangeStats.orders),
        ),
        subtitle: t("companyDashboard.rangeStats.title"),
        tone: toneMap.blue,
        icon: ShoppingCart,
        onClick: () => navigate("/orders"),
      },
      {
        title: isTodayRange
          ? t("companyDashboard.rangeStats.itemsToday")
          : t("companyDashboard.rangeStats.items"),
        value: renderMetricValue(
          rangeStats.items,
          formatCount(rangeStats.items),
        ),
        subtitle: t("companyDashboard.rangeStats.title"),
        tone: toneMap.orange,
        icon: Package,
        onClick: () => navigate("/orders"),
      },
      {
        title: t("companyDashboard.metrics.confirmationRate"),
        value: renderMetricValue(
          rangeStats.confirmedRate,
          formatRate(rangeStats.confirmedRate),
        ),
        subtitle: t("companyDashboard.metrics.confirmationRateSubtitle"),
        tone: toneMap.green,
        icon: RefreshCw,
        onClick: () => navigate("/orders"),
      },
      {
        title: t("companyDashboard.metrics.cancellationRate"),
        value: renderMetricValue(
          rangeStats.cancellationRate,
          formatRate(rangeStats.cancellationRate),
        ),
        subtitle: t("companyDashboard.metrics.cancellationRateSubtitle"),
        tone: toneMap.orange,
        icon: RefreshCw,
        onClick: () => navigate("/reports"),
      },
      {
        title: t("companyDashboard.metrics.returnRate"),
        value: renderMetricValue(
          rangeStats.returnRate,
          formatRate(rangeStats.returnRate),
        ),
        subtitle: t("companyDashboard.metrics.returnRateSubtitle"),
        tone: toneMap.purple,
        icon: RefreshCw,
        onClick: () => navigate("/reports"),
      },
      {
        title: t("companyDashboard.metrics.piecesPerOrder"),
        value: renderMetricValue(
          rangeStats.piecesPerOrder,
          formatDecimal(rangeStats.piecesPerOrder),
        ),
        subtitle: t("companyDashboard.metrics.piecesPerOrderSubtitle"),
        tone: toneMap.blue,
        icon: Package,
        onClick: () => navigate("/orders"),
      },
    ],
    [
      dashboardData, formatCount, formatDecimal, formatRate, formatMoney,
      isTodayRange, rangeStats, orderHealth, renderMetricValue, t, navigate,
    ],
  );

  useEffect(() => {
    if (!dashboardData?.company?.id || activationState.status === "blocked") {
      return;
    }

    const signature = [
      dashboardData.company.id,
      activationState.status,
      activationState.nextStepId ?? "done",
      activationCompletedStepIds.join(","),
    ].join(":");

    if (activationTrackingSignatureRef.current === signature) return;
    activationTrackingSignatureRef.current = signature;

    void companyOnboardingService
      .trackFunnelEvent({
        type:
          activationState.status === "activated"
            ? "activation_completed"
            : "activation_viewed",
        stepId:
          activationState.nextStepId ||
          activationCompletedStepIds[activationCompletedStepIds.length - 1],
        source: "company_dashboard",
        metadata: {
          status: activationState.status,
          nextStepId: activationState.nextStepId,
          completedStepIds: activationCompletedStepIds,
          completedCount: activationState.completedCount,
          totalSteps: activationState.totalSteps,
          hasProducts: activationState.hasProducts,
          hasStorefront: activationState.hasStorefront,
          hasChannelDecision: activationState.hasChannelDecision,
          hasOrders: activationState.hasOrders,
        },
      })
      .catch((error) => {
        console.warn("Failed to track activation funnel state", error);
      });
  }, [
    activationCompletedStepIds,
    activationState.completedCount,
    activationState.hasChannelDecision,
    activationState.hasOrders,
    activationState.hasProducts,
    activationState.hasStorefront,
    activationState.nextStepId,
    activationState.status,
    activationState.totalSteps,
    dashboardData?.company?.id,
  ]);

  if (loading && !dashboardData) {
    return (
      <BusinessPageShell dir={isRtl ? "rtl" : "ltr"} className="p-6">
        <DashboardSkeleton />
      </BusinessPageShell>
    );
  }

  if (error && !dashboardData) {
    return (
      <BusinessPageShell dir={isRtl ? "rtl" : "ltr"} className="p-6 md:p-8">
        <div
          className="business-page-panel flex items-center gap-4 rounded-[28px] p-5"
          style={{
            borderColor:
              "color-mix(in srgb, var(--business-danger) 24%, transparent)",
            background: "var(--company-dashboard-alert-bg)",
            color: "var(--company-dashboard-alert-text)",
          }}
        >
          <AlertTriangle className="size-6 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">{error || t("common.no_data")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void fetchDashboardData({ force: true })}
            >
              <RefreshCw className="size-3.5" />
              {t("companyDashboard.refresh")}
            </Button>
          </div>
        </div>
      </BusinessPageShell>
    );
  }

  return (
    <BusinessPageShell
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "company-dashboard-page p-3 md:p-4 lg:p-5",
        isRtl ? "rtl" : "ltr",
      )}
    >
      <div className="mx-auto max-w-7xl space-y-3 md:space-y-4">
        {error ? (
          <div
            className="business-page-panel flex items-center justify-between gap-3 rounded-[24px] border px-4 py-3 text-sm"
            style={{
              borderColor:
                "color-mix(in srgb, var(--business-warning) 22%, transparent)",
              background: "var(--company-dashboard-warning-bg)",
              color: "var(--company-dashboard-warning-text)",
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchDashboardData({ force: true })}
            >
              <RefreshCw
                className={cn("size-3.5", isRefreshing ? "animate-spin" : "")}
              />
              {t("companyDashboard.refresh")}
            </Button>
          </div>
        ) : null}

        <DashboardIntroBand
          activation={activationState}
          company={company}
          currentRangeLabel={currentRangeLabel}
          currentRangeMeta={currentRangeMeta}
          productCountLabel={productCountLabel}
          isRtl={isRtl}
          onNavigate={navigate}
        />
        <OnboardingResumeCard
          company={company}
          isRtl={isRtl}
          onNavigate={navigate}
        />
        <ActivationLaunchCard
          activation={activationState}
          company={company}
          isRtl={isRtl}
          onNavigate={navigate}
        />

        <DateRangeToolbar
          start={dateRange.start}
          end={dateRange.end}
          presets={presets}
          selectedFilterId={selectedFilterId}
          currentRangeLabel={currentRangeLabel}
          currentRangeMeta={currentRangeMeta}
          customPresetLabel={t("companyDashboard.presets.custom")}
          showCustomRangeInputs={showCustomRangeInputs}
          isRefreshing={isRefreshing}
          fromLabel={t("companyDashboard.from")}
          toLabel={t("companyDashboard.to")}
          rangeLabel={t("companyDashboard.dateRangeLabel")}
          refreshLabel={t("companyDashboard.refresh")}
          onStartChange={handleStartDateChange}
          onEndChange={handleEndDateChange}
          onSelectFilter={handleSelectFilter}
          onRefresh={() => void fetchDashboardData({ force: true })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FinancialSquare
            label={t("companyDashboard.financials.revenue")}
            formattedValue={formatDecimal(dashboardData?.financials?.totalRevenue)}
            isRtl={isRtl}
          />
          <FinancialSquare
            label={t("companyDashboard.financials.profit")}
            formattedValue={formatDecimal(dashboardData?.financials?.grossProfit)}
            isRtl={isRtl}
          />
          <FinancialSquare
            label={t("companyDashboard.financials.aov")}
            formattedValue={formatDecimal(dashboardData?.financials?.aov)}
            isRtl={isRtl}
          />
        </div>

        <div className="mt-6">
          <RevenueTrendChart
            data={dashboardData?.revenueHistory ?? []}
            title={t("companyDashboard.revenueChart.title")}
            revenueLabel={t("companyDashboard.revenueChart.revenueLabel")}
            ordersLabel={t("companyDashboard.revenueChart.ordersLabel")}
            emptyLabel={t("companyDashboard.revenueChart.empty")}
            formatRevenue={(v) => formatMoney(v)}
          />
        </div>

        <DashboardOperationsPanel
          cancelledLabel={t("companyDashboard.labels.cancelled")}
          conversationsLabel={t("companyDashboard.labels.conversations")}
          customersLabel={t("companyDashboard.labels.customers")}
          formatCount={formatCount}
          isRtl={isRtl}
          onNavigate={navigate}
          orderHealth={orderHealth}
          recentActivity={recentActivity}
          returnedLabel={t("companyDashboard.labels.returned")}
        />

        <div className="company-dashboard-metrics">
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("companyDashboard.sections.financials")}
            </h3>
            <BusinessMetricsStrip
              items={metricItems.slice(0, 3)}
              mobileLayout="grid"
              mobileDensity="compact"
            />
          </section>
          <section className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("companyDashboard.sections.growth")}
            </h3>
            <BusinessMetricsStrip
              items={metricItems.slice(3, 7)}
              mobileLayout="grid"
              mobileDensity="compact"
            />
          </section>
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("companyDashboard.sections.operations")}
            </h3>
            <BusinessMetricsStrip
              items={metricItems.slice(7)}
              mobileLayout="grid"
              mobileDensity="compact"
            />
          </section>
        </div>

        {topProducts.length > 0 ? (
          <div className="mt-4">
            <TopProductsPanel
              title={t("companyDashboard.rangeStats.topProducts")}
              emptyLabel={t("companyDashboard.rangeStats.noTopProducts")}
              itemsUnitLabel={t("companyDashboard.rangeStats.itemsUnit")}
              items={topProducts}
              formatCount={formatCount}
            />
          </div>
        ) : null}

        {customerUsagePercentage > 80 ? (
          <DashboardSurfaceCard
            className="flex flex-col items-center gap-3 p-3 md:flex-row md:gap-4"
            style={{
              borderColor:
                "color-mix(in srgb, var(--business-warning) 22%, transparent)",
              background: "var(--company-dashboard-warning-bg)",
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--business-warning)" }}
            >
              <Zap className="size-5" fill="currentColor" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4
                className="text-sm font-bold"
                style={{ color: "var(--company-dashboard-warning-text)" }}
              >
                {t("companyDashboard.warnings.title")}
              </h4>
              <p
                className="text-xs leading-5"
                style={{
                  color:
                    "color-mix(in srgb, var(--company-dashboard-warning-text) 84%, var(--color-muted-foreground))",
                }}
              >
                {t("companyDashboard.warnings.message")}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="whitespace-nowrap"
              style={{
                background: "var(--business-warning)",
                borderColor: "transparent",
                color: "white",
              }}
            >
              {t("common.upgrade_now")}
            </Button>
          </DashboardSurfaceCard>
        ) : null}
      </div>
    </BusinessPageShell>
  );
};

export default CompanyDashboard;
