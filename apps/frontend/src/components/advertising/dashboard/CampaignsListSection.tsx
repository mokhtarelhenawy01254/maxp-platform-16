import React, { useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Edit2,
  Eye,
  Filter,
  Loader2,
  Megaphone,
  PauseCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import MiniMetric from "./MiniMetric";
import SelectFilter from "./SelectFilter";
import CampaignQuickViewModal from "./CampaignQuickViewModal";
import {
  CAMPAIGN_OBJECTIVES,
  type FacebookCampaign,
  type FacebookAdsPerformanceSummary,
  facebookAdsService,
} from "../../../services/facebookAdsService";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercentage,
  getCampaignDeliveryBadge,
  getCampaignDeliveryLabel,
  getCampaignDeliverySortRank,
  getCampaignEffectiveStatus,
  getDeliveryLabel,
  getHealthDecision,
  isCampaignDelivering,
  matchesDeliveryFilter,
  type DeliveryFilter,
} from "../../../utils/facebookAdsHelpers";
import type {
  CampaignSortKey,
  DashboardFilters,
} from "../../../utils/facebookAdsDashboardTypes";

interface CampaignsListSectionProps {
  campaigns: FacebookCampaign[];
  performanceSummary: FacebookAdsPerformanceSummary | null;
  selectedCurrency: string;
  selectedAdAccountId: string;
  selectedDateLabel: string;
  filters: DashboardFilters;
  updateFilters: (patch: Partial<DashboardFilters>) => void;
  defaultFilters: DashboardFilters;
  onCampaignUpdated?: (updatedCampaign: FacebookCampaign) => void;
  onRefresh?: () => void;
}

const PAGE_SIZE = 35;

const getDeliveryFilterOptions = (isEn: boolean): Array<{ value: DeliveryFilter; label: string }> => [
  { value: "ALL", label: isEn ? "All Statuses" : "كل الحالات" },
  { value: "DELIVERING", label: isEn ? "Active Only" : "النشط فقط" },
  { value: "WITH_ISSUES", label: isEn ? "With Issues" : "به مشكلة" },
  { value: "PAUSED_OR_OFF", label: isEn ? "Paused / Not Delivering" : "متوقف / لا يسلم" },
  { value: "ARCHIVED_DELETED", label: isEn ? "Archived / Deleted" : "مؤرشف / محذوف" },
];

const getSortOptions = (isEn: boolean): Array<{ value: CampaignSortKey; label: string }> => [
  { value: "delivery", label: isEn ? "Delivery Status" : "حالة التسليم" },
  { value: "spend", label: isEn ? "Highest Spend" : "الأعلى إنفاقاً" },
  { value: "roas", label: isEn ? "Highest ROAS" : "الأعلى ROAS" },
  { value: "budget", label: isEn ? "Budget" : "الميزانية" },
  { value: "lastSync", label: isEn ? "Last Updated" : "آخر تحديث" },
  { value: "name", label: isEn ? "Name" : "الاسم" },
];

const getObjectiveLabel = (objective: string) =>
  CAMPAIGN_OBJECTIVES.find((item) => item.value === objective)?.label ||
  objective;

const CampaignsListSection: React.FC<CampaignsListSectionProps> = ({
  campaigns,
  performanceSummary,
  selectedCurrency,
  selectedAdAccountId,
  selectedDateLabel,
  filters,
  updateFilters,
  defaultFilters,
  onCampaignUpdated,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en") || localStorage.getItem("language") === "en";
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const statusChips = useMemo(() => getDeliveryFilterOptions(isEn), [isEn]);

  // Quick View / Edit & Diagnosis Modal state
  const [quickViewCampaign, setQuickViewCampaign] = useState<FacebookCampaign | null>(null);
  const [quickViewPerformance, setQuickViewPerformance] = useState<
    FacebookAdsPerformanceSummary["campaigns"][number]["performance"] | null
  >(null);

  // Status and budget overrides for instant optimistic UI
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [budgetOverrides, setBudgetOverrides] = useState<Record<string, number>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Inline budget edit state
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editBudgetValue, setEditBudgetValue] = useState<string>("");
  const [savingBudget, setSavingBudget] = useState(false);

  // Reset limit when filters or account changes
  React.useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [filters, selectedAdAccountId]);

  // Toggle campaign status handler (optimistic)
  const handleToggleStatus = async (campaign: FacebookCampaign) => {
    const currentEffective =
      statusOverrides[campaign.id] || getCampaignEffectiveStatus(campaign);
    const isCurrentlyActive = currentEffective === "ACTIVE";
    const nextStatus = isCurrentlyActive ? "PAUSED" : "ACTIVE";

    // Optimistic local state update
    setStatusOverrides((prev) => ({ ...prev, [campaign.id]: nextStatus }));
    setTogglingId(campaign.id);

    try {
      if (isCurrentlyActive) {
        await facebookAdsService.pauseCampaign(campaign.id);
        toast.success(
          isEn
            ? `Paused "${campaign.name}"`
            : `تم إيقاف حملة "${campaign.name}"`,
        );
      } else {
        await facebookAdsService.resumeCampaign(campaign.id);
        toast.success(
          isEn
            ? `Activated "${campaign.name}"`
            : `تم تنشيط حملة "${campaign.name}"`,
        );
      }
    } catch (err) {
      // Rollback on error
      setStatusOverrides((prev) => ({ ...prev, [campaign.id]: currentEffective }));
      toast.error(
        isEn
          ? `Failed to update status for "${campaign.name}"`
          : `تعذر تحديث حالة "${campaign.name}" على Meta`,
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Inline budget edit handlers
  const startEditBudget = (campaignId: string, currentBudget: number) => {
    setEditingBudgetId(campaignId);
    setEditBudgetValue(String(currentBudget));
  };

  const cancelEditBudget = () => {
    setEditingBudgetId(null);
    setEditBudgetValue("");
  };

  const handleSaveBudget = async (campaign: FacebookCampaign) => {
    const num = parseFloat(editBudgetValue);
    if (isNaN(num) || num <= 0) {
      toast.error(isEn ? "Please enter a valid budget" : "يرجى إدخال رقم ميزانية صحيح");
      return;
    }

    setSavingBudget(true);
    try {
      await facebookAdsService.updateCampaign(campaign.id, { budgetAmount: num });
      setBudgetOverrides((prev) => ({ ...prev, [campaign.id]: num }));
      setEditingBudgetId(null);
      toast.success(
        isEn
          ? `Budget updated for "${campaign.name}"`
          : `تم تحديث ميزانية "${campaign.name}" بنجاح`,
      );
    } catch (err) {
      toast.error(
        isEn
          ? `Failed to update budget for "${campaign.name}"`
          : `فشل تحديث ميزانية "${campaign.name}"`,
      );
    } finally {
      setSavingBudget(false);
    }
  };

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

  const handleOpenQuickView = useCallback(
    (campaign: FacebookCampaign) => {
      const perf = getCampaignPerformance(campaign);
      setQuickViewCampaign(campaign);
      setQuickViewPerformance(perf || null);
    },
    [getCampaignPerformance],
  );

  const handleCloseQuickView = useCallback(() => {
    setQuickViewCampaign(null);
    setQuickViewPerformance(null);
  }, []);

  const handleModalCampaignUpdated = useCallback(
    (updated: FacebookCampaign) => {
      if (updated.status) {
        setStatusOverrides((prev) => ({ ...prev, [updated.id]: updated.status }));
      }
      if (updated.budgetAmount) {
        setBudgetOverrides((prev) => ({ ...prev, [updated.id]: updated.budgetAmount }));
      }
      onCampaignUpdated?.(updated);
      onRefresh?.();
    },
    [onCampaignUpdated, onRefresh],
  );

  const objectiveOptions = useMemo(
    () =>
      Array.from(new Set(campaigns.map((campaign) => campaign.objective)))
        .filter(Boolean)
        .sort(),
    [campaigns],
  );

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
  const currentVisibleCampaignCount = visibleCampaigns.length;
  const currentFilteredCampaignCount = filteredCampaigns.length;

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
      {/* Integrated Unified Toolbar */}
      <div className="border-b border-slate-200/80 p-3 sm:p-4 dark:border-slate-800/80">
        <div className="flex flex-col gap-3">
          {/* Status Segmented Control & Summary Counter */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {statusChips.map((chip) => {
                const isSelected = filters.statusFilter === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => updateFilters({ statusFilter: chip.value })}
                    className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs shadow-blue-500/25"
                        : "border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {formatNumber(currentFilteredCampaignCount)} {isEn ? "campaigns" : "حملة"}
              </span>
              <span>•</span>
              <span dir="ltr" className="text-xs font-semibold">{selectedDateLabel}</span>
            </div>
          </div>

          {/* Search, Sort, and Collapsible Filter Controls */}
          <div className="grid gap-2.5 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute bottom-2.5 end-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={filters.searchTerm}
                onChange={(event) => updateFilters({ searchTerm: event.target.value })}
                placeholder={
                  isEn
                    ? "Search campaigns by name, objective, or Meta ID..."
                    : "ابحث باسم الحملة، الهدف الإعلاني، أو Meta ID..."
                }
                className="h-9 w-full rounded-xl border border-slate-200/90 bg-white px-3 pe-9 text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="w-44 sm:w-48">
              <SelectFilter
                icon={Clock3}
                label={isEn ? "Sort By" : "الترتيب"}
                value={filters.sortBy}
                onChange={(value) => updateFilters({ sortBy: value as CampaignSortKey })}
                options={getSortOptions(isEn)}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowExtraFilters((prev) => !prev)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold shadow-2xs transition-all ${
                showExtraFilters
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                  : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{showExtraFilters ? (isEn ? "Fewer Filters" : "فلاتر أقل") : (isEn ? "More Filters" : "المزيد من الفلاتر")}</span>
            </button>
          </div>

          {showExtraFilters && (
            <div className="grid gap-2.5 sm:grid-cols-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <SelectFilter
                icon={Target}
                label={isEn ? "Objective" : "الهدف الإعلاني"}
                value={filters.objectiveFilter}
                onChange={(value) => updateFilters({ objectiveFilter: value })}
                options={[
                  { value: "ALL", label: isEn ? "All Objectives" : "كل الأهداف" },
                  ...objectiveOptions.map((objective) => ({
                    value: objective,
                    label: getObjectiveLabel(objective),
                  })),
                ]}
              />

              <SelectFilter
                icon={SlidersHorizontal}
                label={isEn ? "Source" : "المصدر"}
                value={filters.sourceFilter}
                onChange={(value) =>
                  updateFilters({ sourceFilter: value as DashboardFilters["sourceFilter"] })
                }
                options={[
                  { value: "ALL", label: isEn ? "All Sources" : "كل المصادر" },
                  { value: "META", label: isEn ? "Meta Synced Only" : "Meta فقط" },
                  { value: "LOCAL", label: isEn ? "Local Only" : "محلي فقط" },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Campaigns Listing */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-6 sm:p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 shadow-xs">
            <Megaphone className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isEn ? "No campaigns in this account yet" : "لا توجد حملات في هذا الحساب بعد"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {isEn
              ? "Start launching your first product ad campaign or sync your existing campaigns from Meta."
              : "ابدأ بإطلاق أول حملة إعلانية لمنتجاتك أو قم بمزامنة حملاتك الحالية من Meta."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <Link
              to="/advertising/facebook-ads/create-ad"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isEn ? "Create First Ad" : "إنشاء أول إعلان للمنتج"}</span>
            </Link>
          </div>
        </div>
      ) : currentVisibleCampaignCount === 0 ? (
        <div className="flex flex-col items-center gap-3 p-6 sm:p-12 text-center">
          <Search className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isEn ? "No matching campaigns" : "لا توجد حملات مطابقة"}
          </h3>
          <p className="text-xs text-slate-500">
            {isEn
              ? "Try adjusting your search query or switching delivery status filters."
              : "جرب تعديل كلمة البحث أو تغيير فلتر حالة التسليم."}
          </p>
          <button
            type="button"
            onClick={() => updateFilters(defaultFilters)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
          >
            {isEn ? "Reset All Filters" : "إعادة ضبط جميع الفلاتر"}
          </button>
        </div>
      ) : (
        <div>
          {/* Desktop Table Header - Columns for Vertical Scanning */}
          <div className="hidden lg:grid grid-cols-12 items-center gap-2.5 border-b border-slate-200/80 bg-slate-50/90 px-4 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
            <div className="col-span-4 flex items-center gap-2">
              <span>{isEn ? "Campaign & Status" : "الحملة والحالة"}</span>
            </div>
            <div className="col-span-2 text-center">
              <span>{isEn ? "Daily Budget" : "الميزانية اليومية"}</span>
            </div>
            <div className="col-span-1 text-center">
              <span>{isEn ? "Spend" : "الإنفاق"}</span>
            </div>
            <div className="col-span-1 text-center">
              <span>{isEn ? "Sales" : "المبيعات"}</span>
            </div>
            <div className="col-span-1 text-center">
              <span>CPA</span>
            </div>
            <div className="col-span-1 text-center">
              <span>ROAS</span>
            </div>
            <div className="col-span-1 text-center">
              <span>Hook / Freq</span>
            </div>
            <div className="col-span-1 text-end">
              <span>{isEn ? "Actions" : "الإجراء"}</span>
            </div>
          </div>

          {/* Campaigns Row List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {visibleCampaigns.map((campaign) => {
              const performance = getCampaignPerformance(campaign);
              const decision = getHealthDecision(performance);
              const blockerText =
                campaign.deliveryReadiness?.reasonText ||
                campaign.deliveryReadiness?.reasons?.[0]?.label;

              const effectiveStatus =
                statusOverrides[campaign.id] || getCampaignEffectiveStatus(campaign);
              const isActive = effectiveStatus === "ACTIVE";
              const currentBudget = budgetOverrides[campaign.id] ?? campaign.budgetAmount;
              const isEditingBudget = editingBudgetId === campaign.id;
              const isToggling = togglingId === campaign.id;

              return (
                <article
                  key={campaign.id}
                  className="p-3 sm:px-4 sm:py-3 transition-colors hover:bg-blue-50/20 dark:hover:bg-slate-800/30"
                >
                  {/* Desktop Grid Layout (lg+) */}
                  <div className="hidden lg:grid grid-cols-12 items-center gap-2.5">
                    {/* Col 1-4: Switch + Campaign Info */}
                    <div className="col-span-4 flex items-start gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(campaign)}
                        disabled={isToggling}
                        title={isActive ? (isEn ? "Pause Campaign" : "إيقاف الحملة") : (isEn ? "Resume Campaign" : "تنشيط الحملة")}
                        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                          isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        {isToggling ? (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
                          </span>
                        ) : (
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickView(campaign)}
                            className="truncate text-start text-xs font-bold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition-colors"
                            title={isEn ? `Quick View: ${campaign.name}` : `ملخص وتشخيص: ${campaign.name}`}
                          >
                            {campaign.name}
                          </button>
                          {decision.label && decision.label !== "مستقر" && (
                            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${decision.className}`}>
                              {isEn ? decision.labelEn : decision.label}
                            </span>
                          )}
                          {!isActive && (
                            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {isEn ? "Paused" : "متوقف"}
                            </span>
                          )}
                        </div>

                        {/* Metadata sub-row */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {getObjectiveLabel(campaign.objective)}
                          </span>
                          {!campaign.facebookCampaignId && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                                {isEn ? "Local" : "محلي"}
                              </span>
                            </>
                          )}
                          {blockerText && !isCampaignDelivering(campaign) && (
                            <>
                              <span>•</span>
                              <span
                                title={blockerText}
                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400"
                              >
                                <PauseCircle className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[180px]">
                                  {blockerText.includes("لا توجد مجموعات") || campaign.adSets?.length === 0
                                    ? (isEn ? "Awaiting Ad Sets" : "بانتظار المجموعات")
                                    : blockerText}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 5-6: Budget */}
                    <div className="col-span-2 flex items-center justify-center">
                      {isEditingBudget ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editBudgetValue}
                            onChange={(e) => setEditBudgetValue(e.target.value)}
                            className="h-6 w-20 rounded-md border border-blue-400 bg-white px-1 text-xs font-semibold tabular-nums text-slate-900 outline-none dark:bg-slate-900 dark:text-white"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveBudget(campaign);
                              if (e.key === "Escape") cancelEditBudget();
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveBudget(campaign)}
                            disabled={savingBudget}
                            className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditBudget}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="group/b flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50/60 px-2 py-0.5 dark:border-slate-800 dark:bg-slate-800/40" dir="ltr">
                          <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(currentBudget, selectedCurrency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditBudget(campaign.id, currentBudget)}
                            title={isEn ? "Edit Budget" : "تعديل الميزانية"}
                            className="rounded p-0.5 text-slate-400 opacity-0 group-hover/b:opacity-100 hover:text-blue-600 transition-all"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Col 7: Spend */}
                    <div className="col-span-1 text-center" dir="ltr">
                      <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(performance?.spend || 0, selectedCurrency)}
                      </span>
                    </div>

                    {/* Col 8: Purchases */}
                    <div className="col-span-1 text-center" dir="ltr">
                      <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatNumber(performance?.purchases || 0)}
                      </span>
                    </div>

                    {/* Col 9: CPA */}
                    <div className="col-span-1 text-center" dir="ltr">
                      <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(performance?.cpa || 0, selectedCurrency)}
                      </span>
                    </div>

                    {/* Col 10: ROAS */}
                    <div className="col-span-1 text-center" dir="ltr">
                      <span
                        className={`text-xs font-black tabular-nums ${
                          (performance?.roas || 0) >= 2
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {formatNumber(performance?.roas || 0, 2)}x
                      </span>
                    </div>

                    {/* Col 11: Hook / Freq */}
                    <div className="col-span-1 text-center text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400" dir="ltr">
                      <span>{formatPercentage(performance?.ctr || 0)}</span>
                      <span className="mx-0.5 text-slate-300 dark:text-slate-600">/</span>
                      <span>{formatNumber(performance?.frequency || 0, 1)}x</span>
                    </div>

                    {/* Col 12: Action */}
                    <div className="col-span-1 text-end">
                      <button
                        type="button"
                        onClick={() => handleOpenQuickView(campaign)}
                        title={isEn ? "Quick View, Edit & Diagnostics" : "عرض ملخص وتشخيص وتعديل الحملة"}
                        className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-blue-500 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-all active:scale-[0.97]"
                      >
                        <span>{isEn ? "Details" : "تفاصيل"}</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile & Tablet Card Layout (< lg) */}
                  <div className="flex flex-col gap-2.5 lg:hidden">
                    {/* Top line: Switch + Title + Badges */}
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(campaign)}
                        disabled={isToggling}
                        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        {isToggling ? (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
                          </span>
                        ) : (
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                              isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickView(campaign)}
                            className="text-start text-xs font-bold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 transition-colors"
                          >
                            {campaign.name}
                          </button>
                          {decision.label && decision.label !== "مستقر" && (
                            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${decision.className}`}>
                              {isEn ? decision.labelEn : decision.label}
                            </span>
                          )}
                          {!isActive && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {isEn ? "Paused" : "متوقف"}
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{getObjectiveLabel(campaign.objective)}</span>
                          {!campaign.facebookCampaignId && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 font-bold">{isEn ? "Local" : "محلي"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Single-depth metric row for mobile */}
                    <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50/50 p-2 text-center text-xs dark:border-slate-800 dark:bg-slate-800/30" dir="ltr">
                      <div>
                        <span className="block text-[11px] text-slate-400">{isEn ? "Spend" : "الإنفاق"}</span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(performance?.spend || 0, selectedCurrency)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-400">{isEn ? "Purchases" : "المبيعات"}</span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatNumber(performance?.purchases || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-400">ROAS</span>
                        <span
                          className={`font-black tabular-nums ${
                            (performance?.roas || 0) >= 2 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {formatNumber(performance?.roas || 0, 2)}x
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-400">CPA</span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(performance?.cpa || 0, selectedCurrency)}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Footer with Details Link */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500" dir="ltr">
                        <span>{isEn ? "Budget: " : "الميزانية: "}</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(currentBudget, selectedCurrency)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickView(campaign)}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 active:scale-[0.97]"
                      >
                        <span>{isEn ? "Details" : "تفاصيل"}</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {currentVisibleCampaignCount < currentFilteredCampaignCount && (
        <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800">
          <button
            type="button"
            onClick={() => setVisibleLimit((current) => current + PAGE_SIZE)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
          >
            {isEn ? "Show More Campaigns" : "عرض المزيد من الحملات"}
          </button>
        </div>
      )}

      {/* Campaign Quick View, Edit & Weakness Diagnostic Modal */}
      <CampaignQuickViewModal
        isOpen={Boolean(quickViewCampaign)}
        campaign={quickViewCampaign}
        performance={quickViewPerformance}
        selectedCurrency={selectedCurrency}
        selectedAdAccountId={selectedAdAccountId}
        onClose={handleCloseQuickView}
        onCampaignUpdated={handleModalCampaignUpdated}
      />
    </section>
  );
};

export default CampaignsListSection;
