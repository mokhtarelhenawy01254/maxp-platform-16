import { useMemo, useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  CubeIcon,
  EyeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArchiveBoxXMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuthSimple";
import { useDashboardData } from "../../hooks/useDashboardData";
import { MetricCard } from "../../components/dashboard/MetricCard";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { RevenueTrendChart, TopProductsPanel, DashboardSkeleton, InsightsPanel } from ".";
import DateRangeToolbar from "./DateRangeToolbar";

type PeriodPreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

function pctDelta(current: number | null | undefined, prev: number | null | undefined): { value: string; positive: boolean } | undefined {
  const c = current ?? 0;
  const p = prev ?? 0;
  if (p === 0 && c === 0) return undefined;
  if (p === 0) return c > 0 ? { value: "+100%", positive: true } : undefined;
  const pct = ((c - p) / p) * 100;
  if (Math.abs(pct) < 0.5) return undefined;
  const sign = pct > 0 ? "+" : "";
  return { value: `${sign}${pct.toFixed(1)}%`, positive: pct > 0 };
}

const PERIOD_LABEL_MAP: Record<string, string> = {
  "today": "companyDashboard.presets.today",
  "yesterday": "companyDashboard.presets.yesterday",
  "7d": "companyDashboard.presets.last7Days",
  "30d": "companyDashboard.presets.last30Days",
  "90d": "companyDashboard.presets.last90Days",
  "thisWeek": "companyDashboard.presets.thisWeek",
  "thisMonth": "companyDashboard.presets.thisMonth",
  "thisYear": "companyDashboard.presets.thisYear",
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

function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setIsVisible(true);
      return;
    }
    setIsVisible(false);
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return isVisible;
}

function isNewCompany(dashboard: { company?: unknown; counts?: { orders?: number | null; products?: number | null; customers?: number | null } | null; financials?: { totalRevenue?: number | null } | null } | undefined): boolean {
  if (!dashboard || !("counts" in dashboard)) return true;
  const { counts, financials } = dashboard as { counts?: { orders?: number | null; products?: number | null; customers?: number | null } | null; financials?: { totalRevenue?: number | null } | null };
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
  const { user } = useAuth();
  const activeApps: string[] = user?.company?.activeApps ?? [];
  const hasEcommerce = activeApps.some((a) => a.toLowerCase() === "ecommerce-basic");
  const hasInbox = activeApps.some((a) => a.toLowerCase() === "unified-inbox");
  const hasAI = activeApps.some((a) => a.toLowerCase() === "ai-chat-basic");
  const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";

  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateParams = useMemo(() => {
    if (period === "custom") {
      return { startDate: customStart || undefined, endDate: customEnd || undefined };
    }
    const end = new Date();
    let start: Date;
    switch (period) {
      case "today":
        start = new Date(end);
        break;
      case "yesterday":
        start = new Date(end);
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case "thisWeek": {
        start = new Date(end);
        const dayOfWeek = start.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start
        start.setDate(start.getDate() - diff);
        break;
      }
      case "thisMonth":
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case "thisYear":
        start = new Date(end.getFullYear(), 0, 1);
        break;
      default: {
        const dayMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
        const days = dayMap[period] ?? 30;
        start = new Date(end);
        start.setDate(start.getDate() - days);
      }
    }
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
  const inventory = dashboard?.inventory;
  const prev = dashboard?.previousPeriod;
  const isEmpty = !isLoading && !isError && isNewCompany(dashboard);

  const revenueHistory = dashboard?.revenueHistory ?? [];

  const chartRef = useRef<HTMLDivElement>(null);
  const chartVisible = useOnScreen(chartRef);

  const presetsList = useMemo(() => [
    { id: "today", label: t("companyDashboard.presets.today") },
    { id: "yesterday", label: t("companyDashboard.presets.yesterday") },
    { id: "7d", label: t("companyDashboard.presets.last7Days") },
    { id: "30d", label: t("companyDashboard.presets.last30Days") },
    { id: "90d", label: t("companyDashboard.presets.last90Days") },
    { id: "thisWeek", label: t("companyDashboard.presets.thisWeek") },
    { id: "thisMonth", label: t("companyDashboard.presets.thisMonth") },
    { id: "thisYear", label: t("companyDashboard.presets.thisYear") },
    { id: "custom", label: t("companyDashboard.presets.custom") },
  ], [t]);

  const now = useMemo(() => new Date(), []);

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
            onClick={() => navigate("/apps")}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto"
      style={{ viewTransitionName: "main-dashboard" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {company?.name ? t("companyDashboard.welcome", { name: company.name }) : t("companyDashboard.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {now.toLocaleDateString(locale, {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>

        <DateRangeToolbar
          start={customStart}
          end={customEnd}
          presets={presetsList}
          selectedFilterId={period}
          currentRangeLabel={PERIOD_LABEL_MAP[period] ? t(PERIOD_LABEL_MAP[period]) : t("companyDashboard.presets.custom")}
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
          onSelectFilter={(v) => setPeriod(v as PeriodPreset)}
          onRefresh={() => refetch()}
        />
      </div>

      <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className={cn(
            "lg:col-span-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            chartVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          )}
        >
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm" style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}>
            <RevenueTrendChart
              data={revenueHistory}
              title={t("companyDashboard.financials.revenue")}
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

          <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm" style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">
              {t("companyDashboard.activity.title")}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: "color-mix(in srgb, var(--color-border) 30%, transparent)" }}>
                <span className="text-xs text-muted-foreground">{t("companyDashboard.activity.newCustomers")}</span>
                <span className="text-sm font-bold tabular-nums text-foreground">{formatLargeNumber(recentActivity?.newCustomers)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: "color-mix(in srgb, var(--color-border) 30%, transparent)" }}>
                <span className="text-xs text-muted-foreground">{t("companyDashboard.stats.orders")}</span>
                <span className="text-sm font-bold tabular-nums text-foreground">{formatLargeNumber(orderHealth?.newOrders)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: "color-mix(in srgb, var(--color-border) 30%, transparent)" }}>
                <span className="text-xs text-muted-foreground">{t("companyDashboard.activity.newConversations")}</span>
                <span className="text-sm font-bold tabular-nums text-foreground">{formatLargeNumber(recentActivity?.newConversations)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          variant="trend"
          label={t("companyDashboard.metrics.totalOrders")}
          value={formatLargeNumber(counts?.orders)}
          icon={ShoppingCartIcon}
          isRtl={i18n.language === "ar"}
          trend={pctDelta(orderHealth?.trackedOrders, prev?.trackedOrders)}
          onClick={() => navigate("/orders")}
        />
        <MetricCard
          variant="bar"
          label={t("companyDashboard.metrics.totalCustomers")}
          value={formatLargeNumber(counts?.customers)}
          progress={counts?.customers ? 65 : 0}
          isRtl={i18n.language === "ar"}
          onClick={() => navigate("/customers")}
        />
        <MetricCard
          variant="simple"
          label={t("companyDashboard.stats.products")}
          value={formatLargeNumber(counts?.products)}
          icon={CubeIcon}
          isRtl={i18n.language === "ar"}
          onClick={() => navigate("/products")}
        />
        <MetricCard
          variant="simple"
          label={t("companyDashboard.rangeStats.storeVisits")}
          value={formatLargeNumber(metrics?.visits)}
          icon={EyeIcon}
          isRtl={i18n.language === "ar"}
          trend={pctDelta(metrics?.visits, prev?.visits)}
          onClick={() => navigate("/analytics/orders")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          variant="simple"
          label={t("companyDashboard.financials.profit")}
          value={formatCurrency(financials?.grossProfit, company?.currency)}
          icon={ChartBarIcon}
          isRtl={i18n.language === "ar"}
          trend={pctDelta(financials?.grossProfit, prev?.revenue)}
          onClick={() => navigate("/analytics/orders/revenue")}
        />
        <MetricCard
          variant="simple"
          label={t("companyDashboard.financials.aov")}
          value={formatCurrency(financials?.aov, company?.currency)}
          icon={CurrencyDollarIcon}
          isRtl={i18n.language === "ar"}
          trend={pctDelta(financials?.aov, prev?.aov)}
          onClick={() => navigate("/analytics/orders")}
        />
      </div>

      <QuickActions
        activeApps={activeApps}
        badges={{
          orders: orderHealth?.openOrders ?? 0,
          inbox: recentActivity?.newConversations ?? 0,
          products: (inventory?.lowStockCount ?? 0) + (inventory?.outOfStockCount ?? 0),
        }}
      />

      {inventory && (inventory.lowStockCount > 0 || inventory.outOfStockCount > 0) && (
        <div
          className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm"
          style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t("companyDashboard.sections.inventoryAlerts")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {inventory.outOfStockCount > 0 && (
              <button
                type="button"
                onClick={() => navigate("/products?filter=out-of-stock")}
                className="flex items-center gap-3 p-3 rounded-xl text-right transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: "color-mix(in srgb, var(--color-destructive) 12%, transparent)" }}
              >
                <div className="p-2 rounded-lg shrink-0" style={{ background: "color-mix(in srgb, var(--color-destructive) 18%, transparent)" }}>
                  <ArchiveBoxXMarkIcon className="w-5 h-5" style={{ color: "var(--color-destructive)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground block">
                    {t("companyDashboard.inventory.outOfStock")}
                  </span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: "var(--color-destructive)" }}>
                    {formatLargeNumber(inventory.outOfStockCount)}
                  </span>
                </div>
              </button>
            )}
            {inventory.lowStockCount > 0 && (
              <button
                type="button"
                onClick={() => navigate("/products?filter=low-stock")}
                className="flex items-center gap-3 p-3 rounded-xl text-right transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: "color-mix(in srgb, var(--color-warning) 12%, transparent)" }}
              >
                <div className="p-2 rounded-lg shrink-0" style={{ background: "color-mix(in srgb, var(--color-warning) 18%, transparent)" }}>
                  <ExclamationTriangleIcon className="w-5 h-5" style={{ color: "var(--color-warning)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground block">
                    {t("companyDashboard.inventory.lowStock")}
                  </span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: "var(--color-warning)" }}>
                    {formatLargeNumber(inventory.lowStockCount)}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {dashboard && (
        <InsightsPanel dashboard={dashboard} onNavigate={(href) => navigate(href)} />
      )}

      <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm" style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}>
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {t("companyDashboard.sections.operations")}
        </h3>
        <div className="space-y-3">
          <OrderHealthRow
            label={t("companyDashboard.metrics.confirmedOrders")}
            value={orderHealth?.confirmedOrders}
            total={orderHealth?.trackedOrders}
            accent="var(--color-success)"
          />
          <OrderHealthRow
            label={t("companyDashboard.metrics.cancelledOrders")}
            value={orderHealth?.cancelledOrders}
            total={orderHealth?.trackedOrders}
            accent="var(--color-destructive)"
          />
          <OrderHealthRow
            label={t("companyDashboard.metrics.returnedOrders")}
            value={orderHealth?.returnedOrders}
            total={orderHealth?.trackedOrders}
            accent="var(--color-warning)"
          />
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("companyDashboard.rangeStats.conversionRate")}</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {metrics?.conversionRate != null ? `${metrics.conversionRate}%` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderHealthRow({ label, value, total, accent }: {
  label: string;
  value: number | null | undefined;
  total: number | null | undefined;
  accent: string;
}) {
  const pct = total && value ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {value ?? 0} <span className="text-xs font-normal text-muted-foreground">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--color-border) 38%, transparent)" }}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ width: `${pct}%`, background: `color-mix(in srgb, ${accent} 70%, transparent)` }}
        />
      </div>
    </div>
  );
}
