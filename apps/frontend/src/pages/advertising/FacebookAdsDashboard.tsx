import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Gauge,
  Megaphone,
  Plus,
  RefreshCw,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import MetricCard from "../../components/advertising/dashboard/MetricCard";
import SelectFilter from "../../components/advertising/dashboard/SelectFilter";
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
  FACEBOOK_ADS_DATE_PRESETS,
  type FacebookAdsDatePreset,
  readStoredFacebookAdsFilters,
  resolveFacebookAdsDateRange,
  writeStoredFacebookAdsFilters,
} from "../../utils/facebookAdsReportFilters";

const FILTER_STORAGE_KEY = "facebookAds.dashboard.filters.v2";

interface DashboardDateFilters {
  datePreset: FacebookAdsDatePreset;
  startDate?: string;
  endDate?: string;
}

const defaultFilters: DashboardDateFilters = {
  datePreset: "last_30d",
};

const FacebookAdsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const accountContext = useFacebookAdsAccountContext();
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [performanceSummary, setPerformanceSummary] =
    useState<FacebookAdsPerformanceSummary | null>(null);
  const [decisionSummary, setDecisionSummary] =
    useState<FacebookAdsDecisionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<DashboardDateFilters>(() =>
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

  const dateRange = useMemo(
    () =>
      resolveFacebookAdsDateRange({
        preset: filters.datePreset,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }, selectedReportingTimezone),
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

  const updateFilters = (patch: Partial<DashboardDateFilters>) => {
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

  useEffect(() => {
    if (contextLoading) return;

    if (accountContext.requiresAdAccountSelection) {
      setCampaigns([]);
      setPerformanceSummary(null);
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

  const businessGroups = useMemo(() => {
    const groups = new Map<string, { label: string; accounts: typeof adAccounts }>();
    adAccounts.forEach((account) => {
      const key = account.business?.id || "unassigned";
      const label = account.business?.name || "حسابات بدون Business ظاهر";
      if (!groups.has(key)) groups.set(key, { label, accounts: [] });
      groups.get(key)!.accounts.push(account);
    });
    return Array.from(groups.entries());
  }, [adAccounts]);

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
    FACEBOOK_ADS_DATE_PRESETS.find((preset) => preset.value === filters.datePreset)
      ?.label || "آخر 30 يوم";

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshAdAccounts(),
        loadCampaigns(selectedAdAccountId),
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
      await facebookAdsService.syncFromFacebook(selectedAdAccountId, {
        includeStructure: false,
      });
      await loadCampaigns(selectedAdAccountId);
      tToast.success("FacebookAdsDashboard.success_update_f698");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل مزامنة الحملات"));
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
      `/advertising/facebook-ads/campaigns/create?adAccountId=${selectedAdAccountId}`,
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
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <main className="mx-auto flex max-w-[1400px] flex-col gap-2.5 p-2.5 sm:p-3">
        {/* Header Section */}
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 xl:grid-cols-[minmax(230px,0.65fr)_minmax(680px,1.8fr)] xl:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-300">
                <Megaphone className="h-4 w-4" />
                Meta Ads
              </div>
              <h1 className="mt-1 truncate text-xl font-black leading-tight">
                مركز الحملات
              </h1>
              <p className="mt-1 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                {selectedDateLabel}: {dateRange.startDate} - {dateRange.endDate}
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-[minmax(190px,1.3fr)_minmax(135px,0.75fr)_auto_auto_auto]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-black text-slate-500">
                  الحساب
                </span>
                <select
                  value={selectedAdAccountId}
                  onChange={(event) => setSelectedAdAccountId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">اختار حساب إعلاني</option>
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
              </label>

              <SelectFilter
                icon={CalendarDays}
                label="الفترة"
                value={filters.datePreset}
                onChange={(value) =>
                  updateFilters({ datePreset: value as FacebookAdsDatePreset })
                }
                options={FACEBOOK_ADS_DATE_PRESETS}
              />

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                تحديث
              </button>
              <button
                type="button"
                onClick={handleSyncFromFacebook}
                disabled={syncing || !selectedAdAccountId}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                مزامنة
              </button>
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={!selectedAdAccountId}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                إنشاء حملة
              </button>
            </div>
          </div>

          {filters.datePreset === "custom" && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:max-w-sm">
              <input
                type="date"
                value={filters.startDate || dateRange.startDate}
                onChange={(event) => updateFilters({ startDate: event.target.value })}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="date"
                value={filters.endDate || dateRange.endDate}
                onChange={(event) => updateFilters({ endDate: event.target.value })}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          )}
        </section>

        {/* Sub Navigation */}
        <FacebookAdsModuleNav selectedAdAccountId={selectedAdAccountId} />

        {/* Metrics Overview */}
        <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="إجمالي الإنفاق"
            value={formatCurrency(performanceSummary?.totals.spend || 0, selectedCurrency)}
            icon={Wallet}
            variant="spend"
          />
          <MetricCard
            label="المشتريات"
            value={formatNumber(performanceSummary?.totals.purchases || 0)}
            icon={CheckCircle2}
            variant="purchases"
          />
          <MetricCard
            label="ROAS"
            value={`${formatNumber(performanceSummary?.totals.roas || 0, 2)}x`}
            icon={TrendingUp}
            variant="roas"
          />
          <MetricCard
            label="CPA"
            value={formatCurrency(performanceSummary?.totals.cpa || 0, selectedCurrency)}
            icon={Target}
            variant="cpa"
          />
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">
                تسليم فعلي
              </span>
              <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <svg className="h-10 w-10 -rotate-90 shrink-0" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                  className="text-slate-100 dark:text-slate-800" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${stats.total > 0 ? (stats.delivering / stats.total) * 100 : 0} 100`}
                  strokeLinecap="round"
                  className={stats.activeButBlocked > 0 ? "text-amber-500" : "text-emerald-500"} />
              </svg>
              <div>
                <p className="text-lg font-black tracking-tight">
                  {formatNumber(stats.delivering)} / {formatNumber(stats.total)}
                </p>
                {stats.activeButBlocked > 0 && (
                  <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    {formatNumber(stats.activeButBlocked)} محظور
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access Cards */}
        <section className="grid gap-2.5 lg:grid-cols-3">
          {/* Campaigns Card */}
          <Link
            to={buildLink("/advertising/facebook-ads/campaigns")}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <Megaphone className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-black">الحملات</h2>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    إدارة وتصفية ومراقبة
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center dark:bg-slate-800">
                <p className="text-lg font-black text-blue-600 dark:text-blue-300">
                  {formatNumber(stats.total)}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">إجمالي</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-2.5 py-2 text-center dark:bg-emerald-950/30">
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-300">
                  {formatNumber(stats.delivering)}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">يسلم</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-2.5 py-2 text-center dark:bg-amber-950/30">
                <p className="text-lg font-black text-amber-600 dark:text-amber-300">
                  {formatNumber(stats.activeButBlocked)}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">محظور</p>
              </div>
            </div>
            {stats.activeDailyBudget > 0 && (
              <p className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                ميزانية يومية نشطة: {formatCurrency(stats.activeDailyBudget, selectedCurrency)}
              </p>
            )}
          </Link>

          {/* Decisions & Recommendations Card */}
          <Link
            to={buildLink("/advertising/facebook-ads/decision-reports")}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
                  <Gauge className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-black">القرارات والتوصيات</h2>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    تحليل أداء وقرارات ذكية
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-500" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center dark:bg-slate-800">
                <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                  {formatNumber(decisionCounts.total)}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">قرار</p>
              </div>
              <div className="rounded-lg bg-red-50 px-2.5 py-2 text-center dark:bg-red-950/30">
                <p className="text-lg font-black text-red-600 dark:text-red-300">
                  {formatNumber(decisionCounts.warnings)}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">تحذير</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-2.5 py-2 text-center dark:bg-emerald-950/30">
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-300">
                  {formatNumber(decisionCounts.opportunities)}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">فرصة</p>
              </div>
            </div>
            {recommendationCount > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3 w-3" />
                {formatNumber(recommendationCount)} توصية تحتاج مراجعة
              </div>
            )}
          </Link>

          {/* Budget Alerts Card */}
          <Link
            to={buildLink("/advertising/facebook-ads/budget-alerts")}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <BellRing className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-black">تنبيهات الرصيد</h2>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    WhatsApp Budget Alerts
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-500" />
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">
                راقب رصيد حسابك الإعلاني وميزانيات الحملات، واستلم تنبيه WhatsApp عند الوصول للحد المختار.
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              <BellRing className="h-3 w-3" />
              إدارة القواعد والتنبيهات
            </div>
          </Link>
        </section>

        {/* Diagnosis Quick Link */}
        <section className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <Gauge className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-black">تشخيص الحساب</h2>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                تحليل شامل لأداء الحملات والمشاكل المحتملة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/advertising/facebook-ads/diagnosis${selectedAdAccountId ? `?adAccountId=${selectedAdAccountId}` : ""}`,
              )
            }
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[11px] font-black text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
          >
            تشخيص
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </section>
      </main>
    </div>
  );
};

export default FacebookAdsDashboard;
