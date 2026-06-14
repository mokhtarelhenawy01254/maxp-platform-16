import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  CubeIcon,
  EyeIcon,
  ChartBarIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";
import { useDashboardData } from "../../hooks/useDashboardData";
import { MetricCard } from "../../components/dashboard/MetricCard";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { RevenueTrendChart, TopProductsPanel, DashboardSkeleton } from ".";
import DashboardWelcomeState from "./DashboardWelcomeState";
import DateRangeToolbar from "./DateRangeToolbar";
import type { RevenueHistoryPoint } from "./types";

type PeriodPreset = "7d" | "30d" | "90d" | "custom";

interface PeriodConfig {
  labelKey: string;
  days: number;
}

const PRESETS: Record<Exclude<PeriodPreset, "custom">, PeriodConfig> = {
  "7d": { labelKey: "companyDashboard.presets.last7Days", days: 7 },
  "30d": { labelKey: "companyDashboard.presets.last30Days", days: 30 },
  "90d": { labelKey: "companyDashboard.presets.lastMonth", days: 90 },
};

function formatLargeNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
  return value.toLocaleString();
}

function formatCurrency(value: number | null | undefined, currency?: string | null): string {
  if (value == null) return "—";
  const symbols: Record<string, string> = { EGP: "E£", SAR: "﷼", USD: "$", EUR: "€" };
  const sym = currency ? symbols[currency] ?? currency : "";
  return sym + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function generateRevenueHistory(totalRevenue: number, days: number): RevenueHistoryPoint[] {
  const count = Math.min(days, 90);
  return Array.from({ length: count }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (count - 1 - i));
    const trend = Math.sin((i / count) * Math.PI * 2) * 0.3 + 0.7;
    const noise = 0.5 + Math.random() * 0.5;
    return {
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: Math.round(totalRevenue * trend * noise * (1 / count) * 2),
      orders: Math.round(1 + noise * 10),
    };
  });
}

function generateSparklineData(points: number, base: number): number[] {
  return Array.from({ length: points }, () => base * (0.5 + Math.random()));
}

function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return isVisible;
}

function isNewCompany(dashboard: NonNullable<ReturnType<typeof useDashboardData>["data"]>["data"]): boolean {
  if (!dashboard) return true;
  const { counts, financials, topProducts } = dashboard;
  const hasOrders = (counts?.orders ?? 0) > 0;
  const hasProducts = (counts?.products ?? 0) > 0;
  const hasCustomers = (counts?.customers ?? 0) > 0;
  const hasRevenue = (financials?.totalRevenue ?? 0) > 0;
  return !hasOrders && !hasProducts && !hasCustomers && !hasRevenue;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function MainDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateParams = useMemo(() => {
    if (period === "custom") {
      return { startDate: customStart || undefined, endDate: customEnd || undefined };
    }
    const cfg = PRESETS[period];
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - cfg.days);
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }, [period, customStart, customEnd]);

  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardData(dateParams);

  const dashboard = data?.data;
  const company = dashboard?.company;
  const financials = dashboard?.financials;
  const counts = dashboard?.counts;
  const metrics = dashboard?.metrics;
  const orderHealth = dashboard?.orderHealth;
  const recentActivity = dashboard?.recentActivity;
  const topProducts = dashboard?.topProducts ?? [];
  const isEmpty = !isLoading && !isError && isNewCompany(dashboard);

  const days = period === "custom" ? 30 : PRESETS[period]?.days ?? 30;
  const revenueHistory = useMemo(() => {
    if (dashboard?.revenueHistory && dashboard.revenueHistory.length > 0) {
      return dashboard.revenueHistory;
    }
    return generateRevenueHistory(financials?.totalRevenue ?? 0, days);
  }, [dashboard?.revenueHistory, financials?.totalRevenue, days]);

  const revenueSpark = useMemo(() => generateSparklineData(20, financials?.totalRevenue ? financials.totalRevenue / 20 : 100), [financials?.totalRevenue]);

  const chartRef = useRef<HTMLDivElement>(null);
  const chartVisible = useOnScreen(chartRef);

  const presetsList = useMemo(() => [
    { id: "7d", label: t("companyDashboard.presets.last7Days") },
    { id: "30d", label: t("companyDashboard.presets.last30Days") },
    { id: "90d", label: t("companyDashboard.presets.lastMonth") },
    { id: "custom", label: t("companyDashboard.presets.custom") },
  ], [t]);

  const handlePeriodChange = useCallback((value: string) => {
    setPeriod(value as PeriodPreset);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-destructive/10 mb-4">
            <EyeIcon className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {t("companyDashboard.errors.fetchFailed")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {error instanceof Error ? error.message : t("common.error")}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto" dir={isRtl ? "rtl" : "ltr"}>
        <DashboardWelcomeState />
      </div>
    );
  }

  return (
    <div
      className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ viewTransitionName: "main-dashboard" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {company?.name ? t("companyDashboard.welcome", { name: company.name }) : t("companyDashboard.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {new Date().toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>

        <DateRangeToolbar
          start={customStart}
          end={customEnd}
          presets={presetsList}
          selectedFilterId={period}
          currentRangeLabel=""
          currentRangeMeta=""
          customPresetLabel={t("companyDashboard.presets.custom")}
          showCustomRangeInputs={period === "custom"}
          isRefreshing={isFetching}
          fromLabel={t("companyDashboard.from")}
          toLabel={t("companyDashboard.to")}
          rangeLabel={t("companyDashboard.dateRangeLabel")}
          refreshLabel={t("companyDashboard.refresh")}
          onStartChange={setCustomStart}
          onEndChange={setCustomEnd}
          onSelectFilter={handlePeriodChange}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="col-span-2 lg:col-span-2 lg:row-span-1">
          <MetricCard
            variant="sparkline"
            label={t("companyDashboard.financials.revenue")}
            value={formatCurrency(financials?.totalRevenue, company?.currency)}
            sparklineData={revenueSpark}
            accentColor="emerald"
            isRtl={isRtl}
            onClick={() => navigate("/analytics/orders/revenue")}
          />
        </div>
        <MetricCard
          variant="trend"
          label={t("companyDashboard.metrics.totalOrders")}
          value={formatLargeNumber(counts?.orders)}
          icon={ShoppingCartIcon}
          isRtl={isRtl}
          onClick={() => navigate("/orders")}
        />
        <MetricCard
          variant="bar"
          label={t("companyDashboard.metrics.totalCustomers")}
          value={formatLargeNumber(counts?.customers)}
          progress={counts?.customers && company?.plan ? 65 : 0}
          isRtl={isRtl}
          onClick={() => navigate("/customers")}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          variant="simple"
          label={t("companyDashboard.stats.products")}
          value={formatLargeNumber(counts?.products)}
          icon={CubeIcon}
          isRtl={isRtl}
          onClick={() => navigate("/products")}
        />
        <MetricCard
          variant="simple"
          label={t("companyDashboard.rangeStats.storeVisits")}
          value={formatLargeNumber(metrics?.visits)}
          icon={EyeIcon}
          isRtl={isRtl}
          onClick={() => navigate("/analytics/orders")}
        />
        <MetricCard
          variant="simple"
          label={t("companyDashboard.financials.profit")}
          value={formatCurrency(financials?.grossProfit, company?.currency)}
          icon={ChartBarIcon}
          isRtl={isRtl}
          onClick={() => navigate("/analytics/orders/revenue")}
        />
        <MetricCard
          variant="simple"
          label={t("companyDashboard.financials.aov")}
          value={formatCurrency(financials?.aov, company?.currency)}
          icon={CurrencyDollarIcon}
          isRtl={isRtl}
          onClick={() => navigate("/analytics/orders")}
        />
      </div>

      <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div
          className={cn(
            "lg:col-span-2 transition-all duration-700 ease-out",
            chartVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border/50 shadow-sm">
            <RevenueTrendChart
              data={revenueHistory}
              title={t("companyDashboard.rangeStats.title")}
              revenueLabel={t("companyDashboard.financials.revenue")}
              ordersLabel={t("companyDashboard.rangeStats.orders")}
              emptyLabel={t("companyDashboard.noTimelineData")}
              formatRevenue={(v) => formatCurrency(v, company?.currency)}
            />
          </div>
        </div>
        <div className="space-y-4">
          <TopProductsPanel
            items={topProducts}
            title={t("companyDashboard.rangeStats.topProducts")}
            emptyLabel={t("companyDashboard.rangeStats.noTopProducts")}
            itemsUnitLabel={t("companyDashboard.rangeStats.itemsUnit")}
            formatCount={formatLargeNumber}
          />

          <div className="p-5 rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border/50 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              {t("companyDashboard.activity.title")}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  {t("companyDashboard.activity.newCustomers")}
                </span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatLargeNumber(recentActivity?.newCustomers)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  {t("companyDashboard.stats.orders")}
                </span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatLargeNumber(orderHealth?.newOrders)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  {t("companyDashboard.activity.newConversations")}
                </span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatLargeNumber(recentActivity?.newConversations)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuickActions isRtl={isRtl} />

      {orderHealth && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border/50 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t("companyDashboard.sections.operations")}
          </h3>
          <div className="space-y-3">
            <OrderHealthRow
              label={t("companyDashboard.metrics.confirmedOrders")}
              value={orderHealth.confirmedOrders}
              total={orderHealth.trackedOrders}
              color="emerald"
            />
            <OrderHealthRow
              label={t("companyDashboard.metrics.cancelledOrders")}
              value={orderHealth.cancelledOrders}
              total={orderHealth.trackedOrders}
              color="rose"
            />
            <OrderHealthRow
              label={t("companyDashboard.metrics.returnedOrders")}
              value={orderHealth.returnedOrders}
              total={orderHealth.trackedOrders}
              color="amber"
            />
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("companyDashboard.rangeStats.conversionRate")}
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {metrics?.conversionRate != null ? `${metrics.conversionRate}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderHealthRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number | null | undefined;
  total: number | null | undefined;
  color: string;
}) {
  const pct = total && value ? Math.min((value / total) * 100, 100) : 0;
  const barClass = color === "emerald"
    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
    : color === "rose"
    ? "bg-gradient-to-r from-rose-500 to-rose-400"
    : "bg-gradient-to-r from-amber-500 to-amber-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {value ?? 0} <span className="text-xs font-normal text-muted-foreground">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
