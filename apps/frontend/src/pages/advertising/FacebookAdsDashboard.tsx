import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Gauge,
  Megaphone,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import MetricCard from "../../components/advertising/dashboard/MetricCard";
import SelectFilter from "../../components/advertising/dashboard/SelectFilter";
import MiniMetric from "../../components/advertising/dashboard/MiniMetric";
import { useFacebookAdsAccountContext } from "../../hooks/useFacebookAdsAccountContext";
import {
  CAMPAIGN_OBJECTIVES,
  type FacebookAdsBudgetAlertLog,
  type FacebookAdsBudgetAlertMetric,
  type FacebookAdsBudgetAlertRule,
  type FacebookAdsBudgetAlertScope,
  type FacebookAdsDecisionSummary,
  type FacebookAdsPerformanceSummary,
  type FacebookCampaign,
  facebookAdsService,
} from "../../services/facebookAdsService";
import {
  type DeliveryFilter,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercentage,
  getApiErrorMessage,
  getCampaignDeliveryBadge,
  getCampaignDeliveryLabel,
  getCampaignDeliverySortRank,
  getCampaignEffectiveStatus,
  getDeliveryLabel,
  isCampaignDelivering,
  matchesDeliveryFilter,
} from "../../utils/facebookAdsHelpers";
import {
  FACEBOOK_ADS_DATE_PRESETS,
  type FacebookAdsDatePreset,
  readStoredFacebookAdsFilters,
  resolveFacebookAdsDateRange,
  writeStoredFacebookAdsFilters,
} from "../../utils/facebookAdsReportFilters";

const PAGE_SIZE = 35;
const FILTER_STORAGE_KEY = "facebookAds.dashboard.filters.v2";

type CampaignSortKey =
  | "delivery"
  | "spend"
  | "roas"
  | "budget"
  | "name"
  | "lastSync";

interface DashboardFilters {
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

interface BudgetAlertFormState {
  scope: FacebookAdsBudgetAlertScope;
  metric: FacebookAdsBudgetAlertMetric;
  campaignId: string;
  thresholdAmount: string;
  recipientPhones: string;
  cooldownMinutes: string;
}

const defaultBudgetAlertForm: BudgetAlertFormState = {
  scope: "AD_ACCOUNT",
  metric: "ACCOUNT_BALANCE",
  campaignId: "",
  thresholdAmount: "100",
  recipientPhones: "",
  cooldownMinutes: "720",
};

const budgetAlertMetricOptions: Record<
  FacebookAdsBudgetAlertScope,
  Array<{ value: FacebookAdsBudgetAlertMetric; label: string }>
> = {
  AD_ACCOUNT: [
    { value: "ACCOUNT_BALANCE", label: "رصيد الحساب الإعلاني" },
    { value: "SPEND_CAP_REMAINING", label: "المتبقي من حد إنفاق الحساب" },
  ],
  CAMPAIGN: [
    { value: "CAMPAIGN_BUDGET_REMAINING", label: "المتبقي من ميزانية الحملة" },
    { value: "CAMPAIGN_FINISHED", label: "عند انتهاء الحملة/نفاد الميزانية" },
  ],
};

const budgetAlertScopeOptions: Array<{
  value: FacebookAdsBudgetAlertScope;
  label: string;
}> = [
  { value: "AD_ACCOUNT", label: "الحساب الإعلاني" },
  { value: "CAMPAIGN", label: "حملة محددة" },
];

const deliveryFilterOptions: Array<{ value: DeliveryFilter; label: string }> = [
  { value: "ALL", label: "كل الحالات" },
  { value: "DELIVERING", label: "النشط فقط" },
  { value: "WITH_ISSUES", label: "به مشكلة" },
  { value: "PAUSED_OR_OFF", label: "متوقف / لا يسلم" },
  { value: "ARCHIVED_DELETED", label: "مؤرشف / محذوف" },
];

const sortOptions: Array<{ value: CampaignSortKey; label: string }> = [
  { value: "delivery", label: "حالة التسليم" },
  { value: "spend", label: "الأعلى إنفاقاً" },
  { value: "roas", label: "الأعلى ROAS" },
  { value: "budget", label: "الميزانية" },
  { value: "lastSync", label: "آخر تحديث" },
  { value: "name", label: "الاسم" },
];

const getObjectiveLabel = (objective: string) =>
  CAMPAIGN_OBJECTIVES.find((item) => item.value === objective)?.label ||
  objective;

const getHealthDecision = (
  performance?: FacebookAdsPerformanceSummary["campaigns"][number]["performance"],
) => {
  if (!performance || performance.impressions === 0) {
    return {
      label: "لا توجد عينة",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    };
  }

  if (performance.spend >= 150 && performance.purchases === 0) {
    return {
      label: "افحص النزيف",
      className: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
    };
  }

  if (performance.roas >= 2 && performance.purchases > 0) {
    return {
      label: "مرشح للتوسيع",
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    };
  }

  if (performance.ctr > 0 && performance.ctr < 1) {
    return {
      label: "الكريتيف ضعيف",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    };
  }

  return {
    label: "راقب",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  };
};

const getDecisionClass = (tone?: string) => {
  if (tone === "green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100";
  }
  if (tone === "red") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100";
  }
  if (tone === "blue") {
    return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100";
  }
  return "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100";
};



const splitAlertPhones = (value: string) =>
  value
    .split(/[\n,;،؛]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const getBudgetAlertMetricLabel = (metric: string) =>
  Object.values(budgetAlertMetricOptions)
    .flat()
    .find((option) => option.value === metric)?.label || metric;

const getBudgetAlertTargetName = (rule: FacebookAdsBudgetAlertRule) =>
  rule.scope === "CAMPAIGN"
    ? rule.campaign?.name || "حملة غير محددة"
    : rule.adAccount?.name || "حساب إعلاني";

const getRulePayload = (
  rule: FacebookAdsBudgetAlertRule,
  isEnabled = rule.isEnabled,
) => ({
  adAccountId: rule.adAccountId || null,
  campaignId: rule.campaignId || null,
  scope: rule.scope,
  metric: rule.metric,
  thresholdAmount: rule.thresholdAmount,
  currency: rule.currency,
  recipientPhones: rule.recipientPhones,
  isEnabled,
  cooldownMinutes: rule.cooldownMinutes,
  settings: rule.settings,
});

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
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [budgetAlertRules, setBudgetAlertRules] = useState<
    FacebookAdsBudgetAlertRule[]
  >([]);
  const [budgetAlertLogs, setBudgetAlertLogs] = useState<
    FacebookAdsBudgetAlertLog[]
  >([]);
  const [budgetAlertForm, setBudgetAlertForm] =
    useState<BudgetAlertFormState>(defaultBudgetAlertForm);
  const [savingBudgetAlert, setSavingBudgetAlert] = useState(false);
  const [testingBudgetAlertId, setTestingBudgetAlertId] = useState<string | null>(
    null,
  );
  const [checkingBudgetAlerts, setCheckingBudgetAlerts] = useState(false);
  const [showExtraFilters, setShowExtraFilters] = useState(false);
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
  const selectedAccountAlertRules = useMemo(
    () =>
      budgetAlertRules.filter((rule) => {
        if (!selectedAdAccountId) return true;
        const normalizedSelected = String(selectedAdAccountId).replace(/^act_/i, "");
        const normalizedRuleAccount = String(
          rule.adAccount?.accountId || rule.adAccountId || "",
        ).replace(/^act_/i, "");
        return !normalizedRuleAccount || normalizedRuleAccount === normalizedSelected;
      }),
    [budgetAlertRules, selectedAdAccountId],
  );

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

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [filters, selectedAdAccountId]);

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
        const [campaignData, summary, decisions, alertRules, alertLogs] = await Promise.all([
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
          facebookAdsService.getBudgetAlertRules().catch(() => []),
          facebookAdsService.getBudgetAlertLogs(20).catch(() => []),
        ]);

        setCampaigns(campaignData);
        setPerformanceSummary(summary);
        setDecisionSummary(decisions);
        setBudgetAlertRules(alertRules);
        setBudgetAlertLogs(alertLogs);
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

  const performanceByCampaignKey = useMemo(() => {
    const map = new Map<
      string,
      FacebookAdsPerformanceSummary["campaigns"][number]["performance"]
    >();

    performanceSummary?.campaigns.forEach((campaign) => {
      map.set(campaign.id, campaign.performance);
      if (campaign.facebookCampaignId) {
        map.set(campaign.facebookCampaignId, campaign.performance);
      }
    });

    return map;
  }, [performanceSummary?.campaigns]);

  const getCampaignPerformance = useCallback(
    (campaign: FacebookCampaign) =>
      (campaign.facebookCampaignId &&
        performanceByCampaignKey.get(campaign.facebookCampaignId)) ||
      performanceByCampaignKey.get(campaign.id),
    [performanceByCampaignKey],
  );

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

  const objectiveOptions = useMemo(
    () =>
      Array.from(new Set(campaigns.map((campaign) => campaign.objective)))
        .filter(Boolean)
        .sort(),
    [campaigns],
  );

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

  const filteredCampaigns = useMemo(() => {
    const search = filters.searchTerm.trim().toLowerCase();

    return [...campaigns]
      .filter((campaign) => {
        if (!matchesDeliveryFilter(campaign, filters.statusFilter)) return false;
        if (
          filters.objectiveFilter !== "ALL" &&
          campaign.objective !== filters.objectiveFilter
        ) {
          return false;
        }
        if (filters.sourceFilter === "META" && !campaign.facebookCampaignId) {
          return false;
        }
        if (filters.sourceFilter === "LOCAL" && campaign.facebookCampaignId) {
          return false;
        }
        if (!search) return true;

        return [
          campaign.name,
          campaign.objective,
          campaign.facebookCampaignId,
          campaign.metaAccountId,
          campaign.pixelId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => {
        const perfA = getCampaignPerformance(a);
        const perfB = getCampaignPerformance(b);

        if (filters.sortBy === "spend") {
          return (perfB?.spend || 0) - (perfA?.spend || 0);
        }
        if (filters.sortBy === "roas") {
          return (perfB?.roas || 0) - (perfA?.roas || 0);
        }
        if (filters.sortBy === "budget") {
          return b.budgetAmount - a.budgetAmount;
        }
        if (filters.sortBy === "name") {
          return a.name.localeCompare(b.name, "ar");
        }
        if (filters.sortBy === "lastSync") {
          return (
            new Date(b.facebookUpdatedTime || b.lastSyncAt || b.updatedAt).getTime() -
            new Date(a.facebookUpdatedTime || a.lastSyncAt || a.updatedAt).getTime()
          );
        }
        return getCampaignDeliverySortRank(a) - getCampaignDeliverySortRank(b);
      });
  }, [campaigns, filters, getCampaignPerformance]);

  const visibleCampaigns = filteredCampaigns.slice(0, visibleLimit);
  const topDecisionRows = useMemo(
    () => (decisionSummary?.rows || []).slice(0, 4),
    [decisionSummary?.rows],
  );
  const currentVisibleCampaignCount = visibleCampaigns.length;
  const currentFilteredCampaignCount = filteredCampaigns.length;
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

  const reloadBudgetAlerts = async () => {
    const [rules, logs] = await Promise.all([
      facebookAdsService.getBudgetAlertRules(),
      facebookAdsService.getBudgetAlertLogs(20),
    ]);
    setBudgetAlertRules(rules);
    setBudgetAlertLogs(logs);
  };

  const updateBudgetAlertForm = (patch: Partial<BudgetAlertFormState>) => {
    setBudgetAlertForm((current) => {
      const next = { ...current, ...patch };
      if (patch.scope && patch.scope !== current.scope) {
        next.metric =
          budgetAlertMetricOptions[patch.scope]?.[0]?.value || current.metric;
        next.campaignId = patch.scope === "CAMPAIGN" ? current.campaignId : "";
        if (next.metric === "CAMPAIGN_FINISHED") {
          next.thresholdAmount = "0";
        }
      }
      if (patch.metric === "CAMPAIGN_FINISHED") {
        next.thresholdAmount = "0";
      }
      return next;
    });
  };

  const handleCreateBudgetAlert = async () => {
    if (!selectedAdAccountId) {
      toast.error("اختار حساب إعلاني الأول");
      return;
    }

    const recipientPhones = splitAlertPhones(budgetAlertForm.recipientPhones);
    if (recipientPhones.length === 0) {
      toast.error("اكتب رقم WhatsApp واحد على الأقل");
      return;
    }

    if (budgetAlertForm.scope === "CAMPAIGN" && !budgetAlertForm.campaignId) {
      toast.error("اختار الحملة المراد مراقبتها");
      return;
    }

    const thresholdAmount =
      budgetAlertForm.metric === "CAMPAIGN_FINISHED"
        ? 0
        : Number(budgetAlertForm.thresholdAmount);

    if (!Number.isFinite(thresholdAmount)) {
      toast.error("قيمة التنبيه غير صحيحة");
      return;
    }

    try {
      setSavingBudgetAlert(true);
      await facebookAdsService.createBudgetAlertRule({
        adAccountId: selectedAdAccountId,
        campaignId:
          budgetAlertForm.scope === "CAMPAIGN"
            ? budgetAlertForm.campaignId
            : null,
        scope: budgetAlertForm.scope,
        metric: budgetAlertForm.metric,
        thresholdAmount,
        currency: selectedCurrency,
        recipientPhones,
        cooldownMinutes: Number(budgetAlertForm.cooldownMinutes) || 720,
        isEnabled: true,
      });
      setBudgetAlertForm((current) => ({
        ...defaultBudgetAlertForm,
        recipientPhones: current.recipientPhones,
      }));
      await reloadBudgetAlerts();
      toast.success("تم إنشاء تنبيه WhatsApp للإعلانات");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل إنشاء التنبيه"));
    } finally {
      setSavingBudgetAlert(false);
    }
  };

  const handleTestBudgetAlert = async (ruleId: string) => {
    try {
      setTestingBudgetAlertId(ruleId);
      await facebookAdsService.testBudgetAlertRule(ruleId);
      await reloadBudgetAlerts();
      toast.success("تم إرسال اختبار التنبيه");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل اختبار التنبيه"));
    } finally {
      setTestingBudgetAlertId(null);
    }
  };

  const handleToggleBudgetAlert = async (rule: FacebookAdsBudgetAlertRule) => {
    try {
      await facebookAdsService.updateBudgetAlertRule(
        rule.id,
        getRulePayload(rule, !rule.isEnabled),
      );
      await reloadBudgetAlerts();
      toast.success(rule.isEnabled ? "تم إيقاف التنبيه" : "تم تفعيل التنبيه");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحديث التنبيه"));
    }
  };

  const handleDeleteBudgetAlert = async (ruleId: string) => {
    try {
      await facebookAdsService.deleteBudgetAlertRule(ruleId);
      await reloadBudgetAlerts();
      toast.success("تم حذف التنبيه");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل حذف التنبيه"));
    }
  };

  const handleRunBudgetAlertsNow = async () => {
    try {
      setCheckingBudgetAlerts(true);
      await facebookAdsService.runBudgetAlertRulesNow();
      await reloadBudgetAlerts();
      toast.success("تم فحص تنبيهات الرصيد الآن");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل فحص التنبيهات"));
    } finally {
      setCheckingBudgetAlerts(false);
    }
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

        <FacebookAdsModuleNav selectedAdAccountId={selectedAdAccountId} />

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

        {topDecisionRows.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                <h2 className="text-sm font-black text-slate-950 dark:text-white">
                  قرارات مختصرة
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {formatNumber(decisionSummary?.totals.ads || 0)} إعلان
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                read-only: لا يتم إيقاف أو توسيع أي إعلان تلقائياً
              </span>
            </div>
            <div className="grid gap-2 xl:grid-cols-4">
              {topDecisionRows.map((row) => (
                <button
                  key={row.ad.id}
                  type="button"
                  onClick={() =>
                    navigate(`/advertising/facebook-ads/ads/${row.ad.id}`)
                  }
                  className={`min-w-0 rounded-lg border px-2.5 py-2 text-right transition hover:shadow-sm ${getDecisionClass(
                    row.decision.tone,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-black">
                      {row.decision.label}
                    </span>
                    <span className="shrink-0 text-[10px] font-black">
                      {formatNumber(row.decision.confidence.score)}%
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-bold opacity-90">
                    {row.ad.name}
                  </p>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] font-black">
                    <span>CPA {formatCurrency(row.decision.metrics.cpa || 0, selectedCurrency)}</span>
                    <span>ROAS {formatNumber(row.decision.metrics.roas || 0, 2)}x</span>
                    <span>ربح {formatCurrency(row.decision.metrics.estimatedProfit || 0, selectedCurrency)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {performanceSummary?.recommendations?.length ? (
          <section className="grid gap-2 lg:grid-cols-3">
            {performanceSummary.recommendations.slice(0, 3).map((item) => (
              <div
                key={`${item.title}-${item.priority}`}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-black">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {item.priority}
                </div>
                <h3 className="mt-1 text-xs font-black">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 opacity-80">
                  {item.message}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-blue-200 bg-white p-3 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-300">
                  <BellRing className="h-4 w-4" />
                  WhatsApp Budget Alerts
                </div>
                <h2 className="mt-1 text-base font-black">تنبيهات رصيد الإعلانات</h2>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                  راقب رصيد الحساب وحد إنفاقه، أو المتبقي من ميزانية حملة محددة،
                  وابعت رسالة WhatsApp عند الوصول للحد المختار.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunBudgetAlertsNow}
                disabled={checkingBudgetAlerts}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-black text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${checkingBudgetAlerts ? "animate-spin" : ""}`}
                />
                افحص الآن
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <MiniMetric
                label="رصيد الحساب الحالي"
                value={
                  selectedAccountBalance === null
                    ? "غير متاح من Meta"
                    : formatCurrency(selectedAccountBalance, selectedCurrency)
                }
              />
              <MiniMetric
                label="المتبقي من حد الإنفاق"
                value={
                  selectedSpendCapRemaining === null
                    ? "غير متاح من Meta"
                    : formatCurrency(selectedSpendCapRemaining, selectedCurrency)
                }
              />
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <SelectFilter
                icon={SlidersHorizontal}
                label="نوع الرصيد"
                value={budgetAlertForm.scope}
                onChange={(value) =>
                  updateBudgetAlertForm({
                    scope: value as FacebookAdsBudgetAlertScope,
                  })
                }
                options={budgetAlertScopeOptions}
              />
              <SelectFilter
                icon={Gauge}
                label="متى أرسل؟"
                value={budgetAlertForm.metric}
                onChange={(value) =>
                  updateBudgetAlertForm({
                    metric: value as FacebookAdsBudgetAlertMetric,
                  })
                }
                options={budgetAlertMetricOptions[budgetAlertForm.scope]}
              />
            </div>

            {budgetAlertForm.scope === "CAMPAIGN" ? (
              <label className="mt-2 block">
                <span className="mb-1 block text-[11px] font-black text-slate-500">
                  الحملة
                </span>
                <select
                  value={budgetAlertForm.campaignId}
                  onChange={(event) =>
                    updateBudgetAlertForm({ campaignId: event.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">اختار حملة</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} - {formatCurrency(campaign.budgetAmount, selectedCurrency)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-black text-slate-500">
                  قيمة التنبيه
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={budgetAlertForm.thresholdAmount}
                  disabled={budgetAlertForm.metric === "CAMPAIGN_FINISHED"}
                  onChange={(event) =>
                    updateBudgetAlertForm({ thresholdAmount: event.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-black text-slate-500">
                  منع التكرار بالدقائق
                </span>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={budgetAlertForm.cooldownMinutes}
                  onChange={(event) =>
                    updateBudgetAlertForm({ cooldownMinutes: event.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>

            <label className="mt-2 block">
              <span className="mb-1 block text-[11px] font-black text-slate-500">
                أرقام WhatsApp المستقبلة
              </span>
              <textarea
                rows={3}
                value={budgetAlertForm.recipientPhones}
                onChange={(event) =>
                  updateBudgetAlertForm({ recipientPhones: event.target.value })
                }
                placeholder="مثال: 01000000000&#10;01200000000"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <button
              type="button"
              onClick={handleCreateBudgetAlert}
              disabled={savingBudgetAlert || !selectedAdAccountId}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BellRing className="h-4 w-4" />
              {savingBudgetAlert ? "جاري الحفظ..." : "إنشاء تنبيه WhatsApp"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black">التنبيهات المفعلة</h2>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  يتم الفحص تلقائياً كل 15 دقيقة، مع منع تكرار الرسائل لنفس الحد.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                {formatNumber(selectedAccountAlertRules.length)} قواعد
              </span>
            </div>

            <div className="mt-3 grid gap-2">
              {selectedAccountAlertRules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  لا توجد تنبيهات بعد. أضف حد مثل 100 جنيه وسيتم الإرسال عند الوصول له.
                </div>
              ) : (
                selectedAccountAlertRules.map((rule) => (
                  <article
                    key={rule.id}
                    className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"
                  >
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-black">
                            {getBudgetAlertTargetName(rule)}
                          </h3>
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-[11px] font-black",
                              rule.isEnabled
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
                            ].join(" ")}
                          >
                            {rule.isEnabled ? "مفعل" : "متوقف"}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                            {getBudgetAlertMetricLabel(rule.metric)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span>
                            الحد: {formatCurrency(rule.thresholdAmount, rule.currency)}
                          </span>
                          <span>آخر قراءة: {rule.lastObservedLabel || "لم يتم الفحص"}</span>
                          <span>
                            الأرقام: {rule.recipientPhones.join("، ") || "غير محدد"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => handleTestBudgetAlert(rule.id)}
                          disabled={testingBudgetAlertId === rule.id}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-blue-200 px-2 text-[11px] font-black text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900/60 dark:text-blue-200 dark:hover:bg-blue-950/30"
                        >
                          <Send className="h-3.5 w-3.5" />
                          اختبار
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBudgetAlert(rule)}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 px-2 text-[11px] font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {rule.isEnabled ? "إيقاف" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBudgetAlert(rule.id)}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-red-200 px-2 text-[11px] font-black text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            {budgetAlertLogs.length ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
                <h3 className="mb-2 text-xs font-black text-slate-500 dark:text-slate-300">
                  آخر رسائل WhatsApp
                </h3>
                <div className="grid gap-1.5">
                  {budgetAlertLogs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col gap-1 rounded-lg bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="truncate">
                        {getBudgetAlertMetricLabel(log.metric)} → {log.recipientPhone}
                      </span>
                      <span
                        className={
                          log.status === "SENT"
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-red-600 dark:text-red-300"
                        }
                      >
                        {log.status} · {formatDate(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-3 dark:border-slate-800">
            <div className="grid gap-2 md:grid-cols-[2fr_1.2fr_1fr] xl:grid-cols-[1.2fr_0.8fr_0.5fr_0.8fr_0.8fr_0.8fr]">
              <label className="relative block">
                <span className="mb-1 block text-[11px] font-black text-slate-500">
                  بحث
                </span>
                <Search className="pointer-events-none absolute bottom-2.5 right-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="search"
                  value={filters.searchTerm}
                  onChange={(event) => updateFilters({ searchTerm: event.target.value })}
                  placeholder="اسم الحملة أو Meta ID"
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <SelectFilter
                icon={Filter}
                label="حالة التسليم"
                value={filters.statusFilter}
                onChange={(value) =>
                  updateFilters({ statusFilter: value as DeliveryFilter })
                }
                options={deliveryFilterOptions}
              />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setShowExtraFilters((prev) => !prev)}
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-transparent text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {showExtraFilters ? "فلاتر أقل" : "المزيد"}
                </button>
              </div>

              {showExtraFilters && (
                <>
                  <SelectFilter
                    icon={Target}
                    label="الهدف"
                    value={filters.objectiveFilter}
                    onChange={(value) => updateFilters({ objectiveFilter: value })}
                    options={[
                      { value: "ALL", label: "كل الأهداف" },
                      ...objectiveOptions.map((objective) => ({
                        value: objective,
                        label: getObjectiveLabel(objective),
                      })),
                    ]}
                  />

                  <SelectFilter
                    icon={SlidersHorizontal}
                    label="المصدر"
                    value={filters.sourceFilter}
                    onChange={(value) =>
                      updateFilters({ sourceFilter: value as DashboardFilters["sourceFilter"] })
                    }
                    options={[
                      { value: "ALL", label: "كل المصادر" },
                      { value: "META", label: "Meta فقط" },
                      { value: "LOCAL", label: "محلي فقط" },
                    ]}
                  />

                  <SelectFilter
                    icon={Clock3}
                    label="الترتيب"
                    value={filters.sortBy}
                    onChange={(value) =>
                      updateFilters({ sortBy: value as CampaignSortKey })
                    }
                    options={sortOptions}
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>{formatNumber(currentFilteredCampaignCount)} حملة</span>
            <span>{selectedDateLabel}</span>
          </div>

          {currentVisibleCampaignCount === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Search className="h-10 w-10 text-slate-300" />
              <h3 className="text-lg font-black">لا توجد حملات مطابقة</h3>
              <button
                type="button"
                onClick={() => setFilters(defaultFilters)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                مسح الفلاتر
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleCampaigns.map((campaign) => {
                const performance = getCampaignPerformance(campaign);
                const decision = getHealthDecision(performance);
                const blockerText =
                  campaign.deliveryReadiness?.reasonText ||
                  campaign.deliveryReadiness?.reasons?.[0]?.label;

                return (
                  <article
                    key={campaign.id}
                    className="px-3 py-2.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/45"
                  >
                    <div className="grid gap-3 xl:grid-cols-[1.5fr_0.9fr_1.1fr_auto] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="max-w-3xl truncate text-sm font-black">
                            {campaign.name}
                          </h2>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-black ${getCampaignDeliveryBadge(
                              campaign,
                            )}`}
                          >
                            {getCampaignDeliveryLabel(campaign)}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${decision.className}`}>
                            {decision.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span>{getObjectiveLabel(campaign.objective)}</span>
                          <span>{campaign.facebookCampaignId ? "Meta synced" : "محلي فقط"}</span>
                          <span>آخر Meta: {formatDate(campaign.facebookUpdatedTime || campaign.lastSyncAt)}</span>
                        </div>
                        {blockerText && !isCampaignDelivering(campaign) && (
                          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-800 dark:bg-orange-950/40 dark:text-orange-100">
                            <PauseCircle className="h-3.5 w-3.5" />
                            {blockerText}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <MiniMetric label="الميزانية" value={formatCurrency(campaign.budgetAmount, selectedCurrency)} />
                        <MiniMetric label="التسليم" value={getDeliveryLabel(getCampaignEffectiveStatus(campaign))} />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4 xl:grid-cols-2">
                        <MiniMetric label="الإنفاق" value={formatCurrency(performance?.spend || 0, selectedCurrency)} />
                        <MiniMetric label="ROAS" value={`${formatNumber(performance?.roas || 0, 2)}x`} />
                        <MiniMetric label="CPA" value={formatCurrency(performance?.cpa || 0, selectedCurrency)} />
                        <MiniMetric label="CTR" value={formatPercentage(performance?.ctr || 0)} />
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/advertising/facebook-ads/campaigns/${campaign.id}${
                                selectedAdAccountId
                                  ? `?adAccountId=${selectedAdAccountId}`
                                  : ""
                              }`,
                            )
                          }
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          تفاصيل
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {currentVisibleCampaignCount < currentFilteredCampaignCount && (
            <div className="border-t border-slate-200 p-4 text-center dark:border-slate-800">
              <button
                type="button"
                onClick={() => setVisibleLimit((current) => current + PAGE_SIZE)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                عرض حملات أكثر
              </button>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};



export default FacebookAdsDashboard;
