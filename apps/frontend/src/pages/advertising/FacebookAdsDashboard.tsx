import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
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
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import MetricCard from "../../components/advertising/dashboard/MetricCard";
import SelectFilter from "../../components/advertising/dashboard/SelectFilter";
import BudgetAlertsPanel from "../../components/advertising/dashboard/BudgetAlertsPanel";
import CampaignsListSection from "../../components/advertising/dashboard/CampaignsListSection";
import DecisionSummarySection from "../../components/advertising/dashboard/DecisionSummarySection";
import { useFacebookAdsAccountContext } from "../../hooks/useFacebookAdsAccountContext";
import {
  type FacebookAdsDecisionSummary,
  type FacebookAdsPerformanceSummary,
  type FacebookCampaign,
  facebookAdsService,
} from "../../services/facebookAdsService";
import {
  type DeliveryFilter,
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

export type CampaignSortKey =
  | "delivery"
  | "spend"
  | "roas"
  | "budget"
  | "name"
  | "lastSync";

export interface DashboardFilters {
  searchTerm: string;
  statusFilter: DeliveryFilter;
  objectiveFilter: string;
  sourceFilter: "ALL" | "META" | "LOCAL";
  sortBy: CampaignSortKey;
  datePreset: FacebookAdsDatePreset;
  startDate?: string;
  endDate?: string;
}

const defaultFilters: DashboardFilters = {
  searchTerm: "",
  statusFilter: "ALL",
  objectiveFilter: "ALL",
  sourceFilter: "ALL",
  sortBy: "delivery",
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
  const selectedAccountBalance = selectedAdAccount?.billingHealth?.balance ?? null;
  const selectedSpendCapRemaining =
    selectedAdAccount?.billingHealth?.spendCap != null
      ? selectedAdAccount.billingHealth.spendCap -
        (selectedAdAccount.billingHealth.amountSpent || 0)
      : null;

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
      toast.success("تم تحديث البيانات");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncFromFacebook = async () => {
    if (!selectedAdAccountId) {
      toast.error("اختار حساب إعلاني الأول");
      return;
    }

    try {
      setSyncing(true);
      await facebookAdsService.syncFromFacebook(selectedAdAccountId, {
        includeStructure: false,
      });
      await loadCampaigns(selectedAdAccountId);
      toast.success("تم تحديث الحملات من Meta بسرعة");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل مزامنة الحملات"));
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateCampaign = () => {
    if (!selectedAdAccountId) {
      toast.error("اختار حساب إعلاني الأول");
      return;
    }

    navigate(
      `/advertising/facebook-ads/campaigns/create?adAccountId=${selectedAdAccountId}`,
    );
  };

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

        {/* Diagnosis Bar */}
        <section className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <Gauge className="h-3.5 w-3.5 text-blue-500" />
            القائمة التشغيلية
            <span className="hidden rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500 sm:inline dark:bg-slate-800 dark:text-slate-300">
              {formatNumber(stats.delivering)}/{formatNumber(stats.total)} يسلم
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/advertising/facebook-ads/diagnosis${selectedAdAccountId ? `?adAccountId=${selectedAdAccountId}` : ""}`,
              )
            }
            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-black text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
          >
            تشخيص
          </button>
        </section>

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

        {/* Quick Decisions & Recommendations */}
        <DecisionSummarySection
          decisionSummary={decisionSummary}
          performanceSummary={performanceSummary}
          selectedCurrency={selectedCurrency}
        />

        {/* WhatsApp Budget Alerts */}
        <BudgetAlertsPanel
          selectedAdAccountId={selectedAdAccountId}
          campaigns={campaigns}
          selectedCurrency={selectedCurrency}
          selectedAccountBalance={selectedAccountBalance}
          selectedSpendCapRemaining={selectedSpendCapRemaining}
        />

        {/* Campaigns Listing & Filtering */}
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
      </main>
    </div>
  );
};

export default FacebookAdsDashboard;
