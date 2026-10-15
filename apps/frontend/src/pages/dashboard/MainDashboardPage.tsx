import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, BarChart3, Box, RotateCcw } from "lucide-react";
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
import { SetupProgressBanner } from "./SetupProgressBanner";
import DateRangeToolbar from "./DateRangeToolbar";
import { InstalledAppsDashboard } from "../../components/dashboard/InstalledAppsDashboard";
import { SpecialtyDashboardHeader } from "../../components/dashboard/SpecialtyDashboardHeader";
import { hasStoreApp as checkStoreApp } from "../../utils/storeShortcut";

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
  const live = useDashboardLiveSync(!isError);
  const { data: widgetAppData } = useWidgetData(!isError);

  const dashboard = data?.data;
  const isEmpty = !isLoading && !isError && isNewCompany(dashboard);
  const isRtl = i18n.language === "ar";
  const activeWidgets = useMemo(() => getWidgetsForApps(activeApps), [activeApps]);

  type DashboardTab = "specialty" | "installed-apps";
  const [activeTab, setActiveTab] = useState<DashboardTab>("specialty");

  const installedApps = useMemo(() => {
    if (dashboard?.installedApps && dashboard.installedApps.length > 0) {
      return dashboard.installedApps;
    }
    return activeApps.map((slug) => ({
      id: slug,
      appId: slug,
      slug,
      name: slug,
      category: "general",
      status: "ACTIVE",
      pricingModel: "SUBSCRIPTION",
    }));
  }, [dashboard?.installedApps, activeApps]);

  const hasStoreApp = useMemo(() => {
    return checkStoreApp(activeApps);
  }, [activeApps]);

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
          <Eye className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          {t("companyDashboard.errors.fetchFailed")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error instanceof Error ? error.message : t("common.error")}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" style={{ viewTransitionName: "main-dashboard" }}>
      {/* Top Welcome Bar with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {dashboard?.company?.name
              ? t("companyDashboard.welcome", { name: dashboard.company.name })
              : t("companyDashboard.title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {now.toLocaleDateString(locale, {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>

        {/* Dashboard Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/70 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("specialty")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.97] transition-all ${
              activeTab === "specialty"
                ? "bg-card text-foreground shadow-2xs border border-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>لوحة التخصص والأعمال</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("installed-apps")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.97] transition-all ${
              activeTab === "installed-apps"
                ? "bg-card text-foreground shadow-2xs border border-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>التطبيقات المثبتة <span className="tabular-nums font-mono">({installedApps.length})</span></span>
          </button>
        </div>
      </div>

      {activeTab === "installed-apps" ? (
        <InstalledAppsDashboard
          installedApps={installedApps}
          businessSpecialty={dashboard?.businessSpecialty}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />
      ) : (
        <>
          {dashboard && <SpecialtyDashboardHeader dashboard={dashboard} />}

          {/* Date range toolbar & actions bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-card border border-border/70 shadow-2xs">
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

          {dashboard && hasStoreApp && (
            isEmpty ? (
              <OnboardingChecklist
                dashboard={dashboard}
                activeApps={activeApps}
                onNavigate={(href) => navigate(href)}
              />
            ) : (
              <SetupProgressBanner dashboard={dashboard} />
            )
          )}

          {hasStoreApp && (
            <QuickActions
              activeApps={activeApps}
              badges={{
                orders: dashboard?.orderHealth?.openOrders ?? 0,
                inbox: dashboard?.recentActivity?.newConversations ?? 0,
                products: (dashboard?.inventory?.lowStockCount ?? 0) + (dashboard?.inventory?.outOfStockCount ?? 0),
              }}
            />
          )}

          <AppWidgetGrid
            widgets={activeWidgets}
            getData={getWidgetData}
            companyId={user?.companyId}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {dashboard && (
              <DashboardActivityFeed
                dashboard={dashboard}
                liveActivities={live.activities}
                liveCount={live.liveCount}
              />
            )}
            <div className="lg:col-span-2">
              <DashboardAlertsHub dashboard={dashboard} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
