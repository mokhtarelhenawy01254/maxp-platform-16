import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EyeIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuthSimple";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useDashboardLiveSync } from "../../hooks/useDashboardLiveSync";
import { useWidgetData } from "../../hooks/useWidgetData";
import { QuickActions } from "../../components/dashboard/QuickActions";
import {
  AppWidgetGrid,
  getWidgetsForApps,
  type WidgetDefinition,
} from "../../components/dashboard/widgets";
import { DashboardStatusBar } from "../../components/dashboard/DashboardStatusBar";
import { DashboardActivityFeed } from "../../components/dashboard/DashboardActivityFeed";
import { DashboardAlertsHub } from "../../components/dashboard/DashboardAlertsHub";
import { DashboardSkeleton, OnboardingChecklist, DashboardExportMenu } from ".";
import DateRangeToolbar from "./DateRangeToolbar";

type PeriodPreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

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
  return date.toISOString().slice(0, 10);
}

export default function MainDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeApps: string[] = user?.company?.activeApps ?? [];
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
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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
  const live = useDashboardLiveSync(!isLoading && !isError);
  const { data: widgetAppData } = useWidgetData(!isLoading && !isError);

  const dashboard = data?.data;
  const isEmpty = !isLoading && !isError && isNewCompany(dashboard);
  const isRtl = i18n.language === "ar";
  const activeWidgets = useMemo(() => getWidgetsForApps(activeApps), [activeApps]);

  const getWidgetData = useCallback(
    (widget: WidgetDefinition) => widget.fetchData(dashboard, widgetAppData?.[widget.id]),
    [dashboard, widgetAppData],
  );

  const _t = t as (key: string) => string;
  const presetsList = useMemo(() => [
    { id: "today", label: _t("companyDashboard.presets.today") },
    { id: "yesterday", label: _t("companyDashboard.presets.yesterday") },
    { id: "7d", label: _t("companyDashboard.presets.last7Days") },
    { id: "30d", label: _t("companyDashboard.presets.last30Days") },
    { id: "90d", label: _t("companyDashboard.presets.last90Days") },
    { id: "thisWeek", label: _t("companyDashboard.presets.thisWeek") },
    { id: "thisMonth", label: _t("companyDashboard.presets.thisMonth") },
    { id: "thisYear", label: _t("companyDashboard.presets.thisYear") },
    { id: "custom", label: _t("companyDashboard.presets.custom") },
  ], [t]);

  const now = useMemo(() => new Date(), []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
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
    );
  }

  if (isEmpty && dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {dashboard.company?.name
              ? t("companyDashboard.welcome", { name: dashboard.company.name })
              : t("companyDashboard.title")}
          </h1>
        </div>
        <OnboardingChecklist
          dashboard={dashboard}
          activeApps={activeApps}
          onNavigate={(href) => navigate(href)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ viewTransitionName: "main-dashboard" }}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {dashboard?.company?.name
              ? t("companyDashboard.welcome", { name: dashboard.company.name })
              : t("companyDashboard.title")}
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
          currentRangeLabel={PERIOD_LABEL_MAP[period] ? _t(PERIOD_LABEL_MAP[period]!) : _t("companyDashboard.presets.custom")}
          currentRangeMeta=""
          customPresetLabel={_t("companyDashboard.presets.custom")}
          showCustomRangeInputs={period === "custom"}
          isRefreshing={isFetching}
          fromLabel={_t("companyDashboard.from")}
          toLabel={_t("companyDashboard.to")}
          rangeLabel={_t("companyDashboard.dateRangeLabel")}
          refreshLabel={_t("companyDashboard.refresh")}
          onStartChange={setCustomStart}
          onEndChange={setCustomEnd}
          onSelectFilter={(v: string) => setPeriod(v as PeriodPreset)}
          onRefresh={() => refetch()}
        />
        {dashboard && (
          <DashboardExportMenu
            dashboard={dashboard}
            periodLabel={PERIOD_LABEL_MAP[period] ? _t(PERIOD_LABEL_MAP[period]!) : _t("companyDashboard.presets.custom")}
            disabled={isFetching}
          />
        )}
      </div>

      {dashboard && (
        <DashboardStatusBar dashboard={dashboard} isRtl={isRtl} activeApps={activeApps} />
      )}

      {live.isConnected && (
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: live.liveCount > 0 ? "color-mix(in srgb, var(--color-success) 14%, transparent)" : "color-mix(in srgb, var(--color-border) 20%, transparent)",
              color: live.liveCount > 0 ? "var(--color-success)" : "var(--color-muted-foreground)",
            }}
            title={_t("companyDashboard.live.connected")}
          >
            <span className="relative flex h-2 w-2">
              {live.liveCount > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--color-success)" }} />
              )}
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: live.liveCount > 0 ? "var(--color-success)" : "var(--color-muted-foreground)" }} />
            </span>
            {t("companyDashboard.live.label")}{live.liveCount > 0 ? ` · ${live.liveCount}` : ""}
          </span>
          {live.activities.slice(0, 3).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => a.href && navigate(a.href)}
              className="text-xs px-2 py-1 rounded-full transition-colors hover:underline"
              style={{ background: "color-mix(in srgb, var(--color-border) 22%, transparent)", color: "var(--color-foreground)" }}
            >
              {a.text}
            </button>
          ))}
        </div>
      )}

      <AppWidgetGrid
        widgets={activeWidgets}
        getData={getWidgetData}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dashboard && <DashboardActivityFeed dashboard={dashboard} liveActivities={live.activities} />}
        <DashboardAlertsHub dashboard={dashboard} />
      </div>

      <QuickActions
        activeApps={activeApps}
        badges={{
          orders: dashboard?.orderHealth?.openOrders ?? 0,
          inbox: dashboard?.recentActivity?.newConversations ?? 0,
          products: (dashboard?.inventory?.lowStockCount ?? 0) + (dashboard?.inventory?.outOfStockCount ?? 0),
        }}
      />
    </div>
  );
}
