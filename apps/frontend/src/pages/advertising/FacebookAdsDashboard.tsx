import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Gauge,
  Globe2,
  Layers,
  Megaphone,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import MetricCard from "../../components/advertising/dashboard/MetricCard";
import SelectFilter from "../../components/advertising/dashboard/SelectFilter";
import CampaignsListSection from "../../components/advertising/dashboard/CampaignsListSection";
import DecisionSummarySection from "../../components/advertising/dashboard/DecisionSummarySection";
import BudgetAlertsPanel from "../../components/advertising/dashboard/BudgetAlertsPanel";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import MediaBuyerCopilotWidget from "../../components/advertising/MediaBuyerCopilotWidget";
import { useFacebookAdsAccountContext } from "../../hooks/useFacebookAdsAccountContext";
import {
  type FacebookAdsDecisionSummary,
  type FacebookAdsPerformanceSummary,
  type FacebookCampaign,
  type FacebookGeoPerformanceBreakdown,
  type FacebookGeoPerformanceReport,
  facebookAdsService,
} from "../../services/facebookAdsService";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  getApiErrorMessage,
  getCampaignEffectiveStatus,
  isCampaignDelivering,
} from "../../utils/facebookAdsHelpers";
import {
  getFacebookAdsDatePresets,
  type FacebookAdsDatePreset,
  readStoredFacebookAdsFilters,
  resolveFacebookAdsDateRange,
  writeStoredFacebookAdsFilters,
} from "../../utils/facebookAdsReportFilters";
import type {
  CampaignSortKey,
  DashboardFilters,
} from "../../utils/facebookAdsDashboardTypes";

const FILTER_STORAGE_KEY = "facebookAds.dashboard.filters.v2";

type CockpitTab = "campaigns" | "decisions" | "budget-alerts" | "geo";

const defaultFilters: DashboardFilters = {
  searchTerm: "",
  statusFilter: "ALL",
  objectiveFilter: "ALL",
  sourceFilter: "ALL",
  sortBy: "delivery",
  datePreset: "last_30d",
};

const FacebookAdsDashboard: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = Boolean(
    i18n.language?.startsWith("en") ||
      (typeof window !== "undefined" &&
        localStorage.getItem("language") === "en" &&
        document.documentElement.lang !== "ar")
  );

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountContext = useFacebookAdsAccountContext();
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [performanceSummary, setPerformanceSummary] =
    useState<FacebookAdsPerformanceSummary | null>(null);
  const [decisionSummary, setDecisionSummary] =
    useState<FacebookAdsDecisionSummary | null>(null);

  const [geoBreakdown, setGeoBreakdown] =
    useState<FacebookGeoPerformanceBreakdown>("region");
  const [geoPerformance, setGeoPerformance] =
    useState<FacebookGeoPerformanceReport | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(() =>
    readStoredFacebookAdsFilters(FILTER_STORAGE_KEY, defaultFilters),
  );

  const {
    adAccounts,
    selectedAdAccount,
    selectedAdAccountId,
    loading: contextLoading,
    refreshAdAccounts,
    setSelectedAdAccountId,
  } = accountContext;

  const currentTab = useMemo<CockpitTab>(() => {
    const queryTab = searchParams.get("tab");
    if (
      queryTab === "decisions" ||
      queryTab === "budget-alerts" ||
      queryTab === "geo"
    ) {
      return queryTab;
    }
    return "campaigns";
  }, [searchParams]);

  const setTab = (tab: CockpitTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "campaigns") {
      next.delete("tab");
    } else {
      next.set("tab", tab);
    }
    setSearchParams(next, { replace: true });
  };

  const selectedCurrency =
    selectedAdAccount?.currency ||
    selectedAdAccount?.billingHealth?.currency ||
    "EGP";
  const selectedReportingTimezone = selectedAdAccount?.timezone_name;

  const selectedAccountBalance =
    (selectedAdAccount?.billingHealth?.balance as number | undefined) ?? null;
  const selectedSpendCapRemaining =
    (selectedAdAccount?.billingHealth?.spendCapRemaining as number | undefined) ??
    null;

  const dateRange = useMemo(
    () =>
      resolveFacebookAdsDateRange(
        {
          preset: filters.datePreset,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        selectedReportingTimezone,
      ),
    [
      filters.datePreset,
      filters.endDate,
      filters.startDate,
      selectedReportingTimezone,
    ],
  );

  useEffect(() => {
    writeStoredFacebookAdsFilters(FILTER_STORAGE_KEY, filters);
  }, [filters]);

  const topGeoRows = useMemo(
    () => geoPerformance?.rows?.slice(0, 6) || [],
    [geoPerformance],
  );

  const updateFilters = (patch: Partial<DashboardFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const loadCampaigns = useCallback(
    async (adAccountId = selectedAdAccountId) => {
      if (!adAccountId) {
        setCampaigns([]);
        setPerformanceSummary(null);
        setDecisionSummary(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [campaignData, summary, decisions] = await Promise.all([
          facebookAdsService.getCampaigns(adAccountId),
          facebookAdsService
            .getAdsPerformanceSummary(
              dateRange.startDate,
              dateRange.endDate,
              adAccountId,
            )
            .catch(() => null),
          facebookAdsService
            .getAdsDecisionSummary(
              dateRange.startDate,
              dateRange.endDate,
              adAccountId,
            )
            .catch(() => null),
        ]);

        setCampaigns(campaignData);
        setPerformanceSummary(summary);
        setDecisionSummary(decisions);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "فشل تحميل حملات Meta"));
      } finally {
        setLoading(false);
      }
    },
    [dateRange.endDate, dateRange.startDate, selectedAdAccountId],
  );

  const loadGeoPerformance = useCallback(
    async (adAccountId = selectedAdAccountId) => {
      if (!adAccountId) {
        setGeoPerformance(null);
        setGeoError(null);
        return;
      }

      try {
        setGeoLoading(true);
        setGeoError(null);
        const report = await facebookAdsService.getGeoPerformanceReport({
          adAccountId,
          breakdown: geoBreakdown,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });
        setGeoPerformance(report);
      } catch (error: unknown) {
        setGeoError(
          getApiErrorMessage(error, "تعذر تحميل تقرير الأداء الجغرافي"),
        );
      } finally {
        setGeoLoading(false);
      }
    },
    [dateRange.endDate, dateRange.startDate, geoBreakdown, selectedAdAccountId],
  );

  useEffect(() => {
    if (contextLoading) return;

    if (accountContext.requiresAdAccountSelection) {
      setCampaigns([]);
      setPerformanceSummary(null);
      setDecisionSummary(null);
      setLoading(false);
      return;
    }

    loadCampaigns(selectedAdAccountId);
  }, [
    accountContext.requiresAdAccountSelection,
    contextLoading,
    loadCampaigns,
    selectedAdAccountId,
  ]);

  useEffect(() => {
    if (currentTab === "geo" && selectedAdAccountId) {
      loadGeoPerformance(selectedAdAccountId);
    }
  }, [currentTab, loadGeoPerformance, selectedAdAccountId]);

  const businessGroups = useMemo(() => {
    const groups = new Map<string, { label: string; accounts: typeof adAccounts }>();
    adAccounts.forEach((account) => {
      const key = account.business?.id || "unassigned";
      const label = account.business?.name || (isEn ? "Personal / Unassigned" : "حسابات بدون Business ظاهر");
      if (!groups.has(key)) groups.set(key, { label, accounts: [] });
      groups.get(key)!.accounts.push(account);
    });
    return Array.from(groups.entries());
  }, [adAccounts, isEn]);

  const stats = useMemo(() => {
    const delivering = campaigns.filter(isCampaignDelivering).length;
    const activeButBlocked = campaigns.filter(
      (campaign) =>
        getCampaignEffectiveStatus(campaign) === "ACTIVE" &&
        !isCampaignDelivering(campaign),
    ).length;
    const activeDailyBudget = campaigns.reduce(
      (sum, campaign) =>
        isCampaignDelivering(campaign) && campaign.budgetType === "DAILY"
          ? sum + campaign.budgetAmount
          : sum,
      0,
    );

    return {
      total: campaigns.length,
      delivering,
      activeButBlocked,
      activeDailyBudget,
    };
  }, [campaigns]);

  const decisionCounts = useMemo(() => {
    const rows = decisionSummary?.rows || [];
    const warnings = rows.filter((r) => r.decision.tone === "warning" || r.decision.tone === "danger").length;
    const opportunities = rows.filter((r) => r.decision.tone === "success").length;
    return { total: rows.length, warnings, opportunities };
  }, [decisionSummary?.rows]);

  const recommendationCount = performanceSummary?.recommendations?.length || 0;

  const selectedDateLabel =
    getFacebookAdsDatePresets(isEn).find((preset) => preset.value === filters.datePreset)
      ?.label || (isEn ? "Last 30 Days" : "آخر 30 يوم");

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshAdAccounts(),
        loadCampaigns(selectedAdAccountId),
        currentTab === "geo" && selectedAdAccountId
          ? loadGeoPerformance(selectedAdAccountId)
          : Promise.resolve(),
      ]);
      tToast.success("FacebookAdsDashboard.success_update_4f77");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncFromFacebook = async () => {
    if (!selectedAdAccountId) {
      tToast.error("FacebookAdsDashboard.msg_2888");
      return;
    }

    try {
      setSyncing(true);
      await Promise.all([
        refreshAdAccounts(),
        facebookAdsService.syncFromFacebook(selectedAdAccountId, {
          includeStructure: false,
        }),
      ]);
      await loadCampaigns(selectedAdAccountId);
      if (currentTab === "geo") {
        await loadGeoPerformance(selectedAdAccountId);
      }
      toast.success(isEn ? "Live sync with Meta completed" : "تمت المزامنة وتحديث البيانات مع Meta بنجاح");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل مزامنة الحملات مع Meta"));
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateCampaign = () => {
    if (!selectedAdAccountId) {
      tToast.error("FacebookAdsDashboard.msg_2888");
      return;
    }

    navigate(
      `/advertising/facebook-ads/create-full-ad?adAccountId=${selectedAdAccountId}`,
    );
  };

  const buildLink = (path: string) =>
    selectedAdAccountId ? `${path}?adAccountId=${selectedAdAccountId}` : path;

  if (loading || contextLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-950 dark:bg-slate-950 dark:text-white font-sans">
      <main className="w-full max-w-[1780px] mx-auto flex flex-col gap-3.5 p-3 sm:p-5 lg:p-6">
        {/* Module Navigation Bar */}
        <FacebookAdsModuleNav selectedAdAccountId={selectedAdAccountId} />

        {/* Compact Operational Header */}
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 sm:p-4 shadow-xs backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Title & Date display */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                  <Megaphone className="h-3.5 w-3.5" />
                  {isEn ? "Meta Ads Cockpit" : "لوحة تحكم إعلانات Meta"}
                </div>
                {selectedAccountBalance != null && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <Wallet className="h-3 w-3" />
                    {isEn ? "Balance:" : "الرصيد المتاح:"} <span dir="ltr" className="tabular-nums font-bold">{formatCurrency(selectedAccountBalance, selectedCurrency)}</span>
                  </span>
                )}
              </div>
              <h1 className="mt-1 truncate text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {isEn ? "Ad Campaigns Center" : "مركز الحملات الإعلانية"}
              </h1>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>{selectedDateLabel}: </span>
                <span dir="ltr" className="font-semibold tabular-nums">{dateRange.startDate} → {dateRange.endDate}</span>
              </p>
            </div>

            {/* Quick Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Ad Account Selector */}
              <div className="min-w-[170px] flex-1 sm:flex-initial">
                <select
                  value={selectedAdAccountId}
                  onChange={(event) => setSelectedAdAccountId(event.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200/90 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">{isEn ? "Select Ad Account" : "اختار حساب إعلاني"}</option>
                  {businessGroups.map(([key, group]) => (
                    <optgroup key={key} label={group.label}>
                      {group.accounts.map((account) => (
                        <option key={account.id} value={account.account_id || account.id}>
                          {account.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Date Preset */}
              <div className="min-w-[130px]">
                <SelectFilter
                  icon={CalendarDays}
                  label={isEn ? "Date" : "الفترة"}
                  value={filters.datePreset}
                  onChange={(value) =>
                    updateFilters({ datePreset: value as FacebookAdsDatePreset })
                  }
                  options={getFacebookAdsDatePresets(isEn)}
                />
              </div>

              {/* Single Unified Sync Button */}
              <button
                type="button"
                onClick={handleSyncFromFacebook}
                disabled={syncing || refreshing || !selectedAdAccountId}
                title={isEn ? "Sync live data with Meta" : "مزامنة البيانات الحية مع Meta"}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-blue-200/70 bg-blue-50/70 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100/80 disabled:opacity-60 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 transition-all shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing || refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isEn ? "Sync Meta" : "مزامنة Meta"}</span>
              </button>

              {/* Quick Campaign CTA */}
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={!selectedAdAccountId}
                className="hidden sm:inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-all shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isEn ? "Quick Campaign" : "حملة سريعة"}</span>
              </button>

              {/* Create Full Ad CTA */}
              <Link
                to="/advertising/facebook-ads/create-ad"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 text-xs font-black text-white shadow-xs shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isEn ? "Create Full Ad" : "إنشاء إعلان كامل"}</span>
              </Link>
            </div>
          </div>

          {filters.datePreset === "custom" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:max-w-sm pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="date"
                value={filters.startDate || dateRange.startDate}
                onChange={(event) => updateFilters({ startDate: event.target.value })}
                className="h-9 rounded-xl border border-slate-200/90 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
              <input
                type="date"
                value={filters.endDate || dateRange.endDate}
                onChange={(event) => updateFilters({ endDate: event.target.value })}
                className="h-9 rounded-xl border border-slate-200/90 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </section>

        {/* Metrics Overview */}
        <section className="grid gap-2 grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label={isEn ? "Total Spend" : "إجمالي الإنفاق"}
            value={formatCurrency(performanceSummary?.totals.spend || 0, selectedCurrency)}
            icon={Wallet}
            variant="spend"
            delta={{ text: isEn ? "active" : "الفترة المحددة", isPositive: true }}
          />
          <MetricCard
            label={isEn ? "Purchases" : "المشتريات"}
            value={formatNumber(performanceSummary?.totals.purchases || 0)}
            icon={CheckCircle2}
            variant="purchases"
            subtitle={`${formatCurrency(performanceSummary?.totals.purchaseValue || 0, selectedCurrency)} ${isEn ? "revenue" : "مبيعات"}`}
          />
          <MetricCard
            label="ROAS"
            value={`${formatNumber(performanceSummary?.totals.roas || 0, 2)}x`}
            icon={TrendingUp}
            variant="roas"
            delta={{
              text: (performanceSummary?.totals.roas || 0) >= 3 ? (isEn ? "Profitable" : "رابح") : (isEn ? "Watch" : "متابعة"),
              isPositive: (performanceSummary?.totals.roas || 0) >= 3,
            }}
          />
          <MetricCard
            label="CPA"
            value={formatCurrency(performanceSummary?.totals.cpa || 0, selectedCurrency)}
            icon={Target}
            variant="cpa"
          />
          <div
            onClick={() => {
              if (stats.activeButBlocked > 0) {
                updateFilters({ statusFilter: "WITH_ISSUES" });
              }
            }}
            className={`group relative overflow-hidden rounded-2xl border p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md col-span-2 sm:col-span-1 ${
              stats.activeButBlocked > 0
                ? "border-amber-300/80 bg-amber-50/40 cursor-pointer dark:border-amber-900/50 dark:bg-amber-950/20"
                : "border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isEn ? "Active Delivery" : "تسليم الحملات"}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:bg-blue-400/20 dark:text-blue-300">
                <BarChart3 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <svg className="h-10 w-10 -rotate-90 shrink-0" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                  className="text-slate-100 dark:text-slate-800" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${stats.total > 0 ? (stats.delivering / stats.total) * 100 : 0} 100`}
                  strokeLinecap="round"
                  className={stats.activeButBlocked > 0 ? "text-amber-500" : "text-emerald-500"} />
              </svg>
              <div>
                <p dir="ltr" className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white tabular-nums">
                  {formatNumber(stats.delivering)} / {formatNumber(stats.total)}
                </p>
                {stats.activeButBlocked > 0 ? (
                  <span className="block text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                    ⚠️ {formatNumber(stats.activeButBlocked)} {isEn ? "blocked" : "محظور (انقر للفلترة)"}
                  </span>
                ) : (
                  <span className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {isEn ? "All delivering smoothly" : "كل شيء يعمل بكفاءة"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>



        {!selectedAdAccountId ? (
          <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200/90 bg-white p-8 text-center dark:border-blue-900/60 dark:bg-slate-900 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <Megaphone className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-black text-slate-900 dark:text-white">
              {isEn ? "Select an Ad Account to Begin" : "يرجى اختيار حساب إعلاني لبدء إدارة الحملات"}
            </h2>
            <p className="mt-1 max-w-md text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEn
                ? "Choose your Meta Ad Account from the selector above, or connect a new account to see live data."
                : "اختر حسابك الإعلاني من القائمة العلوية لعرض الحملات والنتائج الحية، أو قم بربط حساب جديد."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/advertising/facebook-ads/connection"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-xs hover:bg-blue-700 transition-all"
              >
                <ArrowUpRight className="h-4 w-4" />
                {isEn ? "Connect / Manage Ad Accounts" : "إدارة وربط الحسابات الإعلانية"}
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Cockpit Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xs backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setTab("campaigns")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                currentTab === "campaigns"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" />
              {isEn ? "Ad Campaigns" : "الحملات الإعلانية"}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  currentTab === "campaigns"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("decisions")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                currentTab === "decisions"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              }`}
            >
              <Gauge className="h-4 w-4" />
              {isEn ? "Decisions & Recommendations" : "القرارات والتوصيات"}
              {decisionCounts.warnings > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950/60 dark:text-red-300">
                  {decisionCounts.warnings} {isEn ? "warning" : "تحذير"}
                </span>
              )}
              {decisionCounts.opportunities > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {decisionCounts.opportunities} {isEn ? "opportunity" : "فرصة"}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab("budget-alerts")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                currentTab === "budget-alerts"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              }`}
            >
              <BellRing className="h-4 w-4" />
              {isEn ? "WhatsApp Budget Alerts" : "تنبيهات الرصيد WhatsApp"}
            </button>

            <button
              type="button"
              onClick={() => setTab("geo")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                currentTab === "geo"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              }`}
            >
              <Globe2 className="h-4 w-4" />
              {isEn ? "Geo Performance" : "الأداء الجغرافي"}
            </button>
          </div>

          <div className="ms-auto flex items-center gap-1.5">
            <Link
              to="/advertising/facebook-ads/audiences"
              className="hidden lg:inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 transition-all"
            >
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span>{isEn ? "Audiences" : "الجماهير"}</span>
            </Link>
            <Link
              to="/advertising/facebook-ads/catalogs"
              className="hidden lg:inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 transition-all"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
              <span>{isEn ? "Catalogs" : "الكتالوجات"}</span>
            </Link>
            <Link
              to="/advertising/facebook-pixel"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-[11px] font-black text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 transition-all"
            >
              <Target className="h-3.5 w-3.5 text-slate-400" />
              <span>{isEn ? "Pixel & CAPI" : "البيكسل و CAPI"}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Tab 1: Campaigns View */}
        {currentTab === "campaigns" && (
          <div className="space-y-3">
            {/* Actionable Decisions Quick Strip */}
            <DecisionSummarySection
              decisionSummary={decisionSummary}
              performanceSummary={performanceSummary}
              selectedCurrency={selectedCurrency}
            />

            {/* Live Interactive Campaigns List */}
            <CampaignsListSection
              campaigns={campaigns}
              performanceSummary={performanceSummary}
              selectedCurrency={selectedCurrency}
              selectedAdAccountId={selectedAdAccountId}
              selectedDateLabel={selectedDateLabel}
              filters={filters}
              updateFilters={updateFilters}
              defaultFilters={defaultFilters}
            />
          </div>
        )}

        {/* Tab 2: Decisions & Smart Recommendations */}
        {currentTab === "decisions" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black">
                    {isEn ? "Media Buying Decisions & Recommendations Center" : "مركز قرارات وتوصيات Media Buying"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {isEn
                      ? "Automated analysis of live results to identify winning ads to scale and losing ads to stop, with confidence scores."
                      : "تحليل آلي للنتائج الحية لتحديد الإعلانات الرابحة للتوسيع والإعلانات الخاسرة للإيقاف مع درجات الثقة."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/advertising/facebook-ads/decision-reports${
                        selectedAdAccountId
                          ? `?adAccountId=${selectedAdAccountId}`
                          : ""
                      }`,
                    )
                  }
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 text-xs font-black text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                >
                  {isEn ? "Open Expanded Decision Report" : "فتح تقرير القرارات الموسع"}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <DecisionSummarySection
              decisionSummary={decisionSummary}
              performanceSummary={performanceSummary}
              selectedCurrency={selectedCurrency}
            />

            {recommendationCount > 0 && (
              <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200">
                  <Sparkles className="h-4 w-4" />
                  {isEn ? `Direct Optimization Recommendations (${recommendationCount})` : `توصيات التحسين المباشرة (${recommendationCount})`}
                </div>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {performanceSummary?.recommendations?.map((rec, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-amber-200/80 bg-white p-3 shadow-xs dark:border-amber-900/40 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-slate-900 dark:text-white">
                          {rec.title}
                        </span>
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {rec.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {rec.message}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Tab 3: Budget Alerts Panel */}
        {currentTab === "budget-alerts" && (
          <div className="space-y-3">
            <BudgetAlertsPanel
              selectedAdAccountId={selectedAdAccountId}
              campaigns={campaigns}
              selectedCurrency={selectedCurrency}
              selectedAccountBalance={selectedAccountBalance}
              selectedSpendCapRemaining={selectedSpendCapRemaining}
            />
          </div>
        )}

        {/* Tab 4: Geo Performance */}
        {currentTab === "geo" && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black">
                  {isEn ? "Geo Performance (Where do we spend & expand?)" : "الأداء الجغرافي (أين نصرف وأين نوسع؟)"}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {isEn
                    ? "Distribution of spend, sales, and CPA by regions and countries for your ad account."
                    : "توزيع الإنفاق والمبيعات وتكلفة الاكتساب CPA حسب المحافظات والدول لحسابك الإعلاني."}
                </p>
              </div>

              <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setGeoBreakdown("region")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    geoBreakdown === "region"
                      ? "bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  {isEn ? "Regions / Governorates" : "المحافظات / المناطق"}
                </button>
                <button
                  type="button"
                  onClick={() => setGeoBreakdown("country")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    geoBreakdown === "country"
                      ? "bg-white text-slate-950 shadow-xs dark:bg-slate-950 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  {isEn ? "Countries" : "الدول"}
                </button>
              </div>
            </div>

            {geoLoading ? (
              <div className="mt-6 flex h-40 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
              </div>
            ) : geoError ? (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {geoError}
              </div>
            ) : topGeoRows.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {isEn
                  ? "No sufficient geo data yet for this period and selected account."
                  : "لا توجد بيانات جغرافية كافية بعد لهذه الفترة للحساب المختار."}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topGeoRows.map((row) => (
                  <div
                    key={row.key}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-950 dark:text-white">
                          {row.label}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-500">
                          {row.campaignsCount || row.campaigns.length} {isEn ? "campaign" : "حملة"}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                        {formatCurrency(row.metrics.spend, selectedCurrency)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500">
                          {isEn ? "Purchases:" : "المشتريات:"}
                        </span>
                        <p className="font-black text-slate-950 dark:text-white">
                          {formatNumber(row.metrics.purchases)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500">
                          CPA:
                        </span>
                        <p className="font-black text-slate-950 dark:text-white">
                          {row.metrics.purchases > 0
                            ? formatCurrency(
                                row.metrics.cpa,
                                selectedCurrency,
                              )
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500">
                          ROAS:
                        </span>
                        <p className="font-black text-slate-950 dark:text-white">
                          {formatNumber(row.metrics.roas, 2)}x
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500">
                          CTR:
                        </span>
                        <p className="font-black text-slate-950 dark:text-white">
                          {formatPercentage(row.metrics.ctr)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
          </>
        )}
      </main>

      {/* Floating AI Media Buyer Copilot Widget */}
      <MediaBuyerCopilotWidget />
    </div>
  );
};

export default FacebookAdsDashboard;
