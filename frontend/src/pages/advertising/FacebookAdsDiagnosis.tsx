import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Clock3,
  Filter,
  Gauge,
  Layers3,
  Megaphone,
  RefreshCw,
  Search,
  Smartphone,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import MetricCard from "../../components/advertising/dashboard/MetricCard";
import SelectFilter from "../../components/advertising/dashboard/SelectFilter";
import MiniMetric from "../../components/advertising/dashboard/MiniMetric";
import CampaignDiagnosticStrip from "../../components/advertising/dashboard/CampaignDiagnosticStrip";
import CampaignBreakdownInline from "../../components/advertising/dashboard/CampaignBreakdownInline";
import { useFacebookAdsAccountContext } from "../../hooks/useFacebookAdsAccountContext";
import {
  type FacebookAdsPerformanceSummary,
  type FacebookCampaignPerformanceBreakdown,
  type FacebookPerformanceBreakdown,
  type FacebookPerformanceBreakdownReport,
  facebookAdsService,
} from "../../services/facebookAdsService";
import {
  type DeliveryFilter,
  formatCurrency,
  formatNumber,
  getApiErrorMessage,
} from "../../utils/facebookAdsHelpers";
import {
  FACEBOOK_ADS_DATE_PRESETS,
  type FacebookAdsDatePreset,
  readStoredFacebookAdsFilters,
  resolveFacebookAdsDateRange,
  writeStoredFacebookAdsFilters,
} from "../../utils/facebookAdsReportFilters";

const PAGE_SIZE = 35;
const FILTER_STORAGE_KEY = "facebookAds.diagnosis.filters.v1";
const BREAKDOWN_RETRYABLE_STATUSES = new Set([502, 503, 504]);

type CampaignSortKey =
  | "delivery"
  | "spend"
  | "roas"
  | "budget"
  | "name"
  | "lastSync";

interface DiagnosisFilters {
  searchTerm: string;
  statusFilter: DeliveryFilter;
  sortBy: CampaignSortKey;
  diagnosisBreakdown: FacebookPerformanceBreakdown;
  datePreset: FacebookAdsDatePreset;
  startDate?: string;
  endDate?: string;
}

const defaultFilters: DiagnosisFilters = {
  searchTerm: "",
  statusFilter: "DELIVERING",
  sortBy: "delivery",
  diagnosisBreakdown: "device",
  datePreset: "last_30d",
};

const sortOptions: Array<{ value: CampaignSortKey; label: string }> = [
  { value: "delivery", label: "حالة التسليم" },
  { value: "spend", label: "الأعلى إنفاقاً" },
  { value: "roas", label: "الأعلى ROAS" },
  { value: "budget", label: "الميزانية" },
  { value: "lastSync", label: "آخر تحديث" },
  { value: "name", label: "الاسم" },
];

const diagnosisBreakdownOptions: Array<{
  value: FacebookPerformanceBreakdown;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "age_gender", label: "العمر والجنس", icon: Users },
  { value: "placement", label: "الموضع والمنصة", icon: Layers3 },
  { value: "platform", label: "المنصة", icon: BarChart3 },
  { value: "device", label: "الجهاز", icon: Smartphone },
  { value: "region", label: "المحافظة", icon: Target },
  { value: "country", label: "الدولة", icon: Target },
];

const deliveryFilterOptions: Array<{ value: DeliveryFilter; label: string }> = [
  { value: "ALL", label: "كل الحالات" },
  { value: "DELIVERING", label: "النشط فقط" },
  { value: "WITH_ISSUES", label: "به مشكلة" },
  { value: "PAUSED_OR_OFF", label: "متوقف / لا يسلم" },
  { value: "ARCHIVED_DELETED", label: "مؤرشف / محذوف" },
];

type SummaryCampaign = FacebookAdsPerformanceSummary["campaigns"][number];

const wait = (durationMs: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

const getErrorStatus = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined;
  }
  return (error as { response?: { status?: number } }).response?.status;
};

const getPerformanceBreakdownReportWithRetry = async (
  request: Parameters<typeof facebookAdsService.getPerformanceBreakdownReport>[0],
) => {
  try {
    return await facebookAdsService.getPerformanceBreakdownReport(request);
  } catch (error) {
    const status = getErrorStatus(error);
    if (!status || !BREAKDOWN_RETRYABLE_STATUSES.has(status)) {
      throw error;
    }
    await wait(900);
    return facebookAdsService.getPerformanceBreakdownReport(request);
  }
};

const getCampaignProblem = (
  metrics: SummaryCampaign["performance"],
) => {
  if (metrics.impressions === 0) {
    return {
      label: "لا يوجد تسليم",
      detail: "المشكلة غالباً في حالة الحملة أو المجموعة أو الإعلان.",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    };
  }
  if (metrics.spend >= 150 && metrics.purchases === 0) {
    return {
      label: "إنفاق بدون شراء",
      detail: "افحص Pixel Purchase، صفحة الهبوط، العرض، أو checkout.",
      className: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
    };
  }
  if (metrics.ctr > 0 && metrics.ctr < 1) {
    return {
      label: "Hook ضعيف",
      detail: "الانطباع موجود لكن الضغط قليل. ابدأ بالكريتيف.",
      className: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    };
  }
  if (metrics.frequency >= 3) {
    return {
      label: "إرهاق جمهور",
      detail: "التكرار عالي. اختبر جمهور أو كريتيف جديد.",
      className:
        "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
    };
  }
  if (metrics.roas >= 2 && metrics.purchases > 0) {
    return {
      label: "قابل للتوسيع",
      detail: "زود تدريجياً مع مراقبة CPA وROAS.",
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    };
  }
  return {
    label: "مراقبة",
    detail: "العينة لا تقول قرار حاسم بعد.",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  };
};

const buildCampaignBreakdownMap = (report?: FacebookPerformanceBreakdownReport) => {
  const map = new Map<string, FacebookCampaignPerformanceBreakdown>();
  report?.campaigns.forEach((campaign) => {
    map.set(campaign.campaignId, campaign);
    map.set(campaign.campaignName, campaign);
  });
  return map;
};

const getCampaignBreakdown = (
  map: Map<string, FacebookCampaignPerformanceBreakdown>,
  campaign: SummaryCampaign,
) =>
  (campaign.facebookCampaignId && map.get(campaign.facebookCampaignId)) ||
  map.get(campaign.id) ||
  map.get(campaign.name);

const FacebookAdsDiagnosis: React.FC = () => {
  const navigate = useNavigate();
  const accountContext = useFacebookAdsAccountContext();
  const [performanceSummary, setPerformanceSummary] =
    useState<FacebookAdsPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [breakdownReports, setBreakdownReports] = useState<
    Partial<Record<FacebookPerformanceBreakdown, FacebookPerformanceBreakdownReport>>
  >({});
  const [filters, setFilters] = useState<DiagnosisFilters>(() =>
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

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [filters, selectedAdAccountId]);

  const updateFilters = (patch: Partial<DiagnosisFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

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

  const loadData = useCallback(
    async (adAccountId = selectedAdAccountId) => {
      if (!adAccountId) {
        setPerformanceSummary(null);
        setBreakdownReports({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const summary = await facebookAdsService
          .getAdsPerformanceSummary(
            dateRange.startDate,
            dateRange.endDate,
            adAccountId,
          )
          .catch(() => null);
        setPerformanceSummary(summary);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "فشل تحميل بيانات التشخيص"));
      } finally {
        setLoading(false);
      }
    },
    [dateRange.endDate, dateRange.startDate, selectedAdAccountId],
  );

  const loadBreakdowns = useCallback(
    async (adAccountId = selectedAdAccountId) => {
      if (!adAccountId) return;

      try {
        setLoadingDiagnosis(true);
        const requiredBreakdowns = Array.from(
          new Set<FacebookPerformanceBreakdown>([
            "age_gender",
            "placement",
            filters.diagnosisBreakdown,
          ]),
        );

        const breakdownEntries = await Promise.all(
          requiredBreakdowns.map(async (breakdown) => {
            try {
              const report = await getPerformanceBreakdownReportWithRetry({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                adAccountId,
                breakdown,
              });
              return [breakdown, report] as const;
            } catch (error) {
              console.warn("Failed to load Meta breakdown", error);
              return [breakdown, null] as const;
            }
          }),
        );

        setBreakdownReports(
          breakdownEntries.reduce<
            Partial<Record<FacebookPerformanceBreakdown, FacebookPerformanceBreakdownReport>>
          >((acc, [breakdown, report]) => {
            if (report) acc[breakdown] = report;
            return acc;
          }, {}),
        );
      } finally {
        setLoadingDiagnosis(false);
      }
    },
    [
      dateRange.endDate,
      dateRange.startDate,
      filters.diagnosisBreakdown,
      selectedAdAccountId,
    ],
  );

  useEffect(() => {
    if (contextLoading) return;
    if (selectedAdAccountId) {
      loadData(selectedAdAccountId);
    } else {
      setPerformanceSummary(null);
      setBreakdownReports({});
      setLoading(false);
    }
  }, [contextLoading, loadData, selectedAdAccountId]);

  useEffect(() => {
    if (!contextLoading && selectedAdAccountId) {
      loadBreakdowns(selectedAdAccountId);
    }
  }, [contextLoading, loadBreakdowns, selectedAdAccountId]);

  const stats = useMemo(() => {
    const total = performanceSummary?.campaigns.length || 0;
    const spend = performanceSummary?.totals.spend || 0;
    const purchases = performanceSummary?.totals.purchases || 0;
    return { total, spend, purchases, roas: performanceSummary?.totals.roas || 0 };
  }, [performanceSummary]);

  const diagnosisCampaigns = useMemo(() => {
    const search = filters.searchTerm.trim().toLowerCase();
    return [...(performanceSummary?.campaigns || [])]
      .filter((campaign) => {
        const effectiveStatus =
          campaign.effectiveStatus || campaign.configuredStatus || campaign.status;
        if (filters.statusFilter === "DELIVERING" && effectiveStatus !== "ACTIVE") return false;
        if (
          filters.statusFilter === "WITH_ISSUES" &&
          !["WITH_ISSUES", "DISAPPROVED", "PENDING_REVIEW"].includes(effectiveStatus)
        ) return false;
        if (
          filters.statusFilter === "PAUSED_OR_OFF" &&
          ["ACTIVE", "ARCHIVED", "DELETED"].includes(effectiveStatus)
        ) return false;
        if (
          filters.statusFilter === "ARCHIVED_DELETED" &&
          !["ARCHIVED", "DELETED"].includes(effectiveStatus)
        ) return false;
        if (!search) return true;
        return [campaign.name, campaign.facebookCampaignId, campaign.objective]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => {
        if (filters.sortBy === "roas") return b.performance.roas - a.performance.roas;
        if (filters.sortBy === "spend") return b.performance.spend - a.performance.spend;
        if (filters.sortBy === "name") return a.name.localeCompare(b.name, "ar");
        return b.performance.purchases - a.performance.purchases;
      });
  }, [filters, performanceSummary?.campaigns]);

  const selectedBreakdownReport = breakdownReports[filters.diagnosisBreakdown];
  const ageGenderByCampaign = useMemo(
    () => buildCampaignBreakdownMap(breakdownReports.age_gender),
    [breakdownReports.age_gender],
  );
  const placementByCampaign = useMemo(
    () => buildCampaignBreakdownMap(breakdownReports.placement),
    [breakdownReports.placement],
  );
  const selectedBreakdownByCampaign = useMemo(
    () => buildCampaignBreakdownMap(selectedBreakdownReport),
    [selectedBreakdownReport],
  );

  const visibleDiagnosisCampaigns = diagnosisCampaigns.slice(0, visibleLimit);
  const selectedDateLabel =
    FACEBOOK_ADS_DATE_PRESETS.find((preset) => preset.value === filters.datePreset)
      ?.label || "آخر 30 يوم";

  const handleRefresh = async () => {
    const id = selectedAdAccountId;
    if (!id) return;
    await Promise.all([
      refreshAdAccounts(),
      loadData(id),
      loadBreakdowns(id),
    ]);
    toast.success("تم تحديث بيانات التشخيص");
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
      <main className="mx-auto flex max-w-[1680px] flex-col gap-3 p-3 sm:p-4">
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 xl:grid-cols-[minmax(230px,0.65fr)_minmax(680px,1.8fr)] xl:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-300">
                <Gauge className="h-4 w-4" />
                تشخيص الأداء
              </div>
              <h1 className="mt-1 text-xl font-black leading-tight">
                تشخيص الحملات
              </h1>
              <p className="mt-1 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                {selectedDateLabel}: {dateRange.startDate} - {dateRange.endDate}
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-[minmax(190px,1.3fr)_minmax(135px,0.75fr)_auto_auto]">
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
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                تحديث
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

        <section className="grid gap-2 md:grid-cols-4">
          <MetricCard
            label="إجمالي الحملات"
            value={formatNumber(stats.total)}
            icon={Megaphone}
          />
          <MetricCard
            label="إجمالي الإنفاق"
            value={formatCurrency(stats.spend, selectedCurrency)}
            icon={Wallet}
          />
          <MetricCard
            label="المشتريات"
            value={formatNumber(stats.purchases)}
            icon={Target}
          />
          <MetricCard
            label="ROAS"
            value={`${formatNumber(stats.roas, 2)}x`}
            icon={BarChart3}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-3 dark:border-slate-800">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]">
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

              <SelectFilter
                icon={Layers3}
                label="تقسيم التشخيص"
                value={filters.diagnosisBreakdown}
                onChange={(value) =>
                  updateFilters({
                    diagnosisBreakdown: value as FacebookPerformanceBreakdown,
                  })
                }
                options={diagnosisBreakdownOptions}
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
            </div>
          </div>

          <div className="flex flex-col gap-1 border-b border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              عرض {formatNumber(visibleDiagnosisCampaigns.length)} من{" "}
              {formatNumber(diagnosisCampaigns.length)} حملة مطابقة
            </span>
            <span>
              الفترة: {selectedDateLabel} ({dateRange.startDate} - {dateRange.endDate})
            </span>
            {loadingDiagnosis ? <span>جاري تحميل التشخيص...</span> : null}
          </div>

          {visibleDiagnosisCampaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Search className="h-10 w-10 text-slate-300" />
              <h3 className="text-lg font-black">لا توجد حملات مطابقة</h3>
              <button
                type="button"
                onClick={() => setFilters(defaultFilters)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                مسح الفلاتر
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleDiagnosisCampaigns.map((campaign) => {
                const problem = getCampaignProblem(campaign.performance);
                const ageGenderBreakdown = getCampaignBreakdown(
                  ageGenderByCampaign,
                  campaign,
                );
                const placementBreakdown = getCampaignBreakdown(
                  placementByCampaign,
                  campaign,
                );
                const selectedCampaignBreakdown =
                  filters.diagnosisBreakdown !== "age_gender" &&
                  filters.diagnosisBreakdown !== "placement"
                    ? getCampaignBreakdown(selectedBreakdownByCampaign, campaign)
                    : null;

                return (
                  <article
                    key={campaign.id}
                    className="px-3 py-2.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/45"
                  >
                    <div className="grid gap-3 xl:grid-cols-[1.1fr_1.2fr_1.2fr_auto] xl:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="max-w-3xl truncate text-sm font-black">
                            {campaign.name}
                          </h2>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-black ${problem.className}`}
                          >
                            {problem.label}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500 dark:text-slate-400">
                          {problem.detail}
                        </p>
                        <CampaignDiagnosticStrip campaign={campaign} />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4 xl:grid-cols-2">
                        <MiniMetric label="الإنفاق" value={formatCurrency(campaign.performance.spend, selectedCurrency)} />
                        <MiniMetric label="الشراء" value={formatNumber(campaign.performance.purchases)} />
                        <MiniMetric label="CPA" value={formatCurrency(campaign.performance.cpa, selectedCurrency)} />
                        <MiniMetric label="ROAS" value={`${formatNumber(campaign.performance.roas, 2)}x`} />
                      </div>

                      <div className="grid gap-1.5">
                        <CampaignBreakdownInline
                          title="العمر/الجنس"
                          campaign={ageGenderBreakdown}
                          currency={selectedCurrency}
                        />
                        <CampaignBreakdownInline
                          title="الموضع"
                          campaign={placementBreakdown}
                          currency={selectedCurrency}
                        />
                        {selectedCampaignBreakdown ? (
                          <CampaignBreakdownInline
                            title={
                              diagnosisBreakdownOptions.find(
                                (item) => item.value === filters.diagnosisBreakdown,
                              )?.label || "تقسيم إضافي"
                            }
                            campaign={selectedCampaignBreakdown}
                            currency={selectedCurrency}
                          />
                        ) : null}
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

          {visibleDiagnosisCampaigns.length < diagnosisCampaigns.length && (
            <div className="border-t border-slate-200 p-4 text-center dark:border-slate-800">
              <button
                type="button"
                onClick={() => setVisibleLimit((current) => current + PAGE_SIZE)}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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

export default FacebookAdsDiagnosis;
