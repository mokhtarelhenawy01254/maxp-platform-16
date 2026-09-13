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
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import MetricCard from "../../components/advertising/dashboard/MetricCard";
import SelectFilter from "../../components/advertising/dashboard/SelectFilter";
import CampaignsListSection from "../../components/advertising/dashboard/CampaignsListSection";
import DecisionSummarySection from "../../components/advertising/dashboard/DecisionSummarySection";
import MediaBuyerCopilotWidget from "../../components/advertising/MediaBuyerCopilotWidget";
import { useFacebookAdsAccountContext } from "../../hooks/useFacebookAdsAccountContext";
import {
  type FacebookAdsDecisionSummary,
  type FacebookAdsPerformanceSummary,
  type FacebookCampaign,
  facebookAdsService,
} from "../../services/facebookAdsService";
import {
  formatCurrency,
  formatNumber,
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
  const [searchParams] = useSearchParams();
  const accountContext = useFacebookAdsAccountContext();
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [performanceSummary, setPerformanceSummary] =
    useState<FacebookAdsPerformanceSummary | null>(null);
  const [decisionSummary, setDecisionSummary] =
    useState<FacebookAdsDecisionSummary | null>(null);

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

  const selectedCurrency =
    selectedAdAccount?.currency ||
    selectedAdAccount?.billingHealth?.currency ||
    "EGP";
  const selectedReportingTimezone = selectedAdAccount?.timezone_name;

  const selectedAccountBalance =
    (selectedAdAccount?.billingHealth?.balance as number | undefined) ?? null;

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

  const updateFilters = (patch: Partial<DashboardFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const loadCampaigns = useCallback(
    async (adAccountId = selectedAdAccountId, forceRefresh = false) => {
      if (!adAccountId) {
        setCampaigns([]);
        setPerformanceSummary(null);
        setDecisionSummary(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Load campaigns immediately so the list displays without blocking
        const campaignPromise = facebookAdsService
          .getCampaigns(adAccountId)
          .then((campaignData) => {
            setCampaigns(campaignData);
            setLoading(false);
            return campaignData;
          })
          .catch((err) => {
            console.error("Error loading campaigns:", err);
            setLoading(false);
            return [];
          });

        // Load performance & decision summaries in parallel without delaying campaign display
        const performancePromise = facebookAdsService
          .getAdsPerformanceSummary(
            dateRange.startDate,
            dateRange.endDate,
            adAccountId,
            forceRefresh,
          )
          .then((summary) => {
            setPerformanceSummary(summary);
            return summary;
          })
          .catch((e) => {
            console.warn("Performance summary fetch warning:", e);
            return null;
          });

        const decisionsPromise = facebookAdsService
          .getAdsDecisionSummary(
            dateRange.startDate,
            dateRange.endDate,
            adAccountId,
            forceRefresh,
          )
          .then((decisions) => {
            setDecisionSummary(decisions);
            return decisions;
          })
          .catch((e) => {
            console.warn("Decision summary fetch warning:", e);
            return null;
          });

        await Promise.allSettled([campaignPromise, performancePromise, decisionsPromise]);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "فشل تحميل حملات Meta"));
      } finally {
        setLoading(false);
      }
    },
    [dateRange.endDate, dateRange.startDate, selectedAdAccountId],
  );

  const queryAdAccountId = searchParams.get("adAccountId");
  const activeAdAccountId = selectedAdAccountId || queryAdAccountId || "";

  useEffect(() => {
    if (activeAdAccountId) {
      loadCampaigns(activeAdAccountId);
      return;
    }

    if (contextLoading) return;

    if (accountContext.requiresAdAccountSelection) {
      setCampaigns([]);
      setPerformanceSummary(null);
      setDecisionSummary(null);
      setLoading(false);
      return;
    }

    if (selectedAdAccountId) {
      loadCampaigns(selectedAdAccountId);
    }
  }, [
    accountContext.requiresAdAccountSelection,
    activeAdAccountId,
    contextLoading,
    loadCampaigns,
    selectedAdAccountId,
  ]);

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
    const activeLifetimeBudget = campaigns.reduce(
      (sum, campaign) =>
        isCampaignDelivering(campaign) && campaign.budgetType === "LIFETIME"
          ? sum + campaign.budgetAmount
          : sum,
      0,
    );

    return {
      total: campaigns.length,
      delivering,
      activeButBlocked,
      activeDailyBudget,
      activeLifetimeBudget,
    };
  }, [campaigns]);

  const decisionCounts = useMemo(() => {
    const opportunities = decisionSummary?.opportunities?.length || 0;
    const warnings = decisionSummary?.warnings?.length || 0;
    const stable = decisionSummary?.stable?.length || 0;
    return {
      total: opportunities + warnings + stable,
      opportunities,
      warnings,
    };
  }, [decisionSummary]);

  const datePresets = useMemo(
    () => getFacebookAdsDatePresets(selectedReportingTimezone),
    [selectedReportingTimezone],
  );

  const selectedDateLabel = useMemo(() => {
    const matched = datePresets.find((item) => item.value === filters.datePreset);
    if (matched) return matched.label;
    if (filters.startDate && filters.endDate) {
      return `${filters.startDate} - ${filters.endDate}`;
    }
    return datePresets[0]?.label || "آخر 30 يوم";
  }, [datePresets, filters.datePreset, filters.endDate, filters.startDate]);

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        refreshAdAccounts(),
        selectedAdAccountId ? loadCampaigns(selectedAdAccountId, true) : Promise.resolve(),
      ]);
      tToast.success("FacebookAdsDashboard.success_refresh_fe61");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحديث البيانات"));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncWithMeta = async () => {
    if (!selectedAdAccountId) return;
    try {
      setSyncing(true);
      const result = await facebookAdsService.syncAdAccountCampaigns(selectedAdAccountId, {
        includeStructure: true,
      });
      await loadCampaigns(selectedAdAccountId, true);
      toast.success(result.message || "تمت مزامنة الحملات بنجاح من Meta");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشلت المزامنة المباشرة مع Meta"));
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !selectedAdAccount) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          <p className="text-xs font-bold text-slate-500">جاري تحميل إعلانات فيسبوك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white" dir={isEn ? "ltr" : "rtl"}>
      <main className="mx-auto flex max-w-7xl flex-col gap-3 p-3 sm:p-5">
        {/* Executive Header Controls */}
        <section className="rounded-xl border border-slate-200/80 bg-white/95 p-3 sm:p-4 shadow-xs backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-black text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                  <Megaphone className="h-3.5 w-3.5" />
                  Meta Marketing Suite
                </span>
                {stats.delivering > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    {stats.delivering} {isEn ? "campaigns delivering live" : "حملة تسلم الآن"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-64">
                <select
                  value={selectedAdAccountId}
                  onChange={(e) => setSelectedAdAccountId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">{isEn ? "-- Select Ad Account --" : "-- اختار حساب إعلاني --"}</option>
                  {businessGroups.map(([key, group]) => (
                    <optgroup key={key} label={group.label}>
                      {group.accounts.map((acc) => (
                        <option key={acc.id} value={acc.account_id || acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="w-36">
                <SelectFilter
                  icon={CalendarDays}
                  label={isEn ? "Date Range" : "الفترة"}
                  value={filters.datePreset}
                  onChange={(val) => updateFilters({ datePreset: val as FacebookAdsDatePreset })}
                  options={datePresets}
                />
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isEn ? "Refresh" : "تحديث"}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncWithMeta}
                disabled={syncing || !selectedAdAccountId}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 disabled:opacity-50"
              >
                <Zap className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isEn ? "Sync Meta" : "مزامنة Meta"}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/advertising/marketing-studio")}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 text-xs font-black text-white shadow-xs hover:from-purple-700 hover:to-indigo-700 transition-all shadow-purple-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isEn ? "AI Marketing Studio" : "مركز التسويق الذكي"}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/advertising/facebook-ads/campaigns/create${
                      selectedAdAccountId ? `?adAccountId=${selectedAdAccountId}` : ""
                    }`,
                  )
                }
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 transition-all"
                title={isEn ? "Create empty campaign container" : "إنشاء هيكل حملة فقط"}
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{isEn ? "Campaign Only" : "حملة فقط"}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/advertising/facebook-ads/create-ad${
                      selectedAdAccountId ? `?adAccountId=${selectedAdAccountId}` : ""
                    }`,
                  )
                }
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-black text-white shadow-xs hover:bg-blue-700 transition-all"
                title={isEn ? "Full Ad Creation Wizard (Campaign + AdSet + Creative)" : "معالج إنشاء إعلان كامل (حملة + استهداف + إعلان)"}
              >
                <Plus className="h-4 w-4" />
                <span>{isEn ? "Create Ad" : "إنشاء إعلان جديد"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 4 High-Impact KPI Cards */}
        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <MetricCard
            label={isEn ? "Total Spend" : "إجمالي الإنفاق"}
            value={formatCurrency(performanceSummary?.totals.spend || 0, selectedCurrency)}
            icon={Wallet}
            variant="spend"
            subtitle={isEn ? "Across selected date range" : "خلال الفترة الزمنية المحددة"}
          />
          <MetricCard
            label={isEn ? "Tracked Purchases" : "المبيعات المسجلة"}
            value={formatNumber(performanceSummary?.totals.purchases || 0)}
            icon={ShoppingBag}
            variant="results"
            subtitle={isEn ? "Confirmed via local Pixel telemetry" : "طلبات مؤكدة من البيكسل المحلي"}
          />
          <MetricCard
            label={isEn ? "Blended ROAS" : "عائد الإنفاق ROAS"}
            value={formatNumber(performanceSummary?.totals.roas || 0, 2) + "x"}
            icon={TrendingUp}
            variant="roas"
            badge={{
              text:
                (performanceSummary?.totals.roas || 0) >= 2.5
                  ? isEn
                    ? "Profitable"
                    : "أداء ممتاز"
                  : (performanceSummary?.totals.roas || 0) >= 1.5
                    ? isEn
                      ? "Healthy"
                      : "ضمن الحدود"
                    : isEn
                      ? "Watch"
                      : "متابعة",
              isPositive: (performanceSummary?.totals.roas || 0) >= 1.5,
            }}
            subtitle={isEn ? "Revenue generated per currency unit spent" : "العائد لكل جنيه إنفاق إعلاني"}
          />
          <MetricCard
            label="CPA"
            value={formatCurrency(performanceSummary?.totals.cpa || 0, selectedCurrency)}
            icon={Target}
            variant="cpa"
            subtitle={isEn ? "Average cost per confirmed acquisition" : "متوسط تكلفة الاستحواذ على الطلب"}
          />
        </section>

        {!selectedAdAccountId ? (
          <section className="rounded-xl border border-dashed border-slate-300 p-4 sm:p-8 text-center dark:border-slate-800">
            <h3 className="text-base font-black">
              {isEn ? "No Ad Account Selected" : "لم يتم اختيار حساب إعلاني"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {isEn
                ? "Select an account above to inspect campaigns, spend, and intelligence signals."
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
            {/* Specialized Tools Quick Access Hub */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-2 sm:px-3 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <div className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                  <Layers className="h-3.5 w-3.5" />
                  <span>{isEn ? "Live Campaigns" : "الحملات المباشرة"}</span>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[11px] font-black text-white">
                    {stats.total}
                  </span>
                </div>

                <Link
                  to={`/advertising/facebook-ads/budget-alerts${selectedAdAccountId ? `?adAccountId=${selectedAdAccountId}` : ""}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100/60 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                  <BellRing className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isEn ? "WhatsApp Alerts" : "تنبيهات WhatsApp"}</span>
                  {selectedAccountBalance !== null && (
                    <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[11px] font-black text-white">
                      {formatCurrency(selectedAccountBalance, selectedCurrency)}
                    </span>
                  )}
                </Link>

                <Link
                  to={`/advertising/facebook-ads/decision-reports${selectedAdAccountId ? `?adAccountId=${selectedAdAccountId}` : ""}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <Gauge className="h-3.5 w-3.5 text-blue-600" />
                  <span>{isEn ? "Decisions & Reports" : "القرارات والتقارير الذكية"}</span>
                  {decisionCounts.warnings > 0 && (
                    <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[11px] font-black text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                      {decisionCounts.warnings}
                    </span>
                  )}
                  {decisionCounts.opportunities > 0 && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      +{decisionCounts.opportunities}
                    </span>
                  )}
                </Link>

                <Link
                  to={`/advertising/facebook-ads/geo${selectedAdAccountId ? `?adAccountId=${selectedAdAccountId}` : ""}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <Globe2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isEn ? "Geo Analytics" : "الأداء الجغرافي"}</span>
                </Link>
              </div>

              <div className="ms-auto flex items-center gap-1.5">
                <Link
                  to="/advertising/facebook-ads/audiences"
                  className="hidden lg:inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 transition-all"
                >
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isEn ? "Audiences" : "الجماهير"}</span>
                </Link>
                <Link
                  to="/advertising/facebook-ads/catalogs"
                  className="hidden lg:inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 transition-all"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isEn ? "Catalogs" : "الكتالوجات"}</span>
                </Link>
                <Link
                  to="/advertising/facebook-pixel"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 transition-all"
                >
                  <Target className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isEn ? "Pixel & CAPI" : "البيكسل و CAPI"}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Actionable Decisions Quick Strip */}
            <DecisionSummarySection
              decisionSummary={decisionSummary}
              performanceSummary={performanceSummary}
              selectedCurrency={selectedCurrency}
              selectedAdAccountId={selectedAdAccountId}
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
              onCampaignUpdated={(updatedCampaign) => {
                setCampaigns((prev) =>
                  prev.map((c) =>
                    c.id === updatedCampaign.id ? { ...c, ...updatedCampaign } : c,
                  ),
                );
              }}
              onRefresh={() => {
                if (selectedAdAccountId) {
                  loadCampaigns(selectedAdAccountId, true);
                }
              }}
            />
          </>
        )}
      </main>

      {/* Floating AI Media Buyer Copilot Widget */}
      <MediaBuyerCopilotWidget />
    </div>
  );
};

export default FacebookAdsDashboard;
