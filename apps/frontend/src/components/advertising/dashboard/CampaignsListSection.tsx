import React, { useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Edit2,
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
}) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en") || localStorage.getItem("language") === "en";
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const statusChips = useMemo(() => getDeliveryFilterOptions(isEn), [isEn]);

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
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-xs backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95">
      {/* Quick status chips and header */}
      <div className="border-b border-slate-200/80 p-3 sm:p-4 dark:border-slate-800/80">
        <div className="flex flex-col gap-2.5">
          {/* Quick status chips */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {statusChips.map((chip) => {
                const isSelected = filters.statusFilter === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => updateFilters({ statusFilter: chip.value })}
                    className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs shadow-blue-500/25"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>{formatNumber(currentFilteredCampaignCount)} {isEn ? "campaigns" : "حملة"}</span>
              <span>•</span>
              <span dir="ltr">{selectedDateLabel}</span>
            </div>
          </div>

          <div className="grid gap-2.5 md:grid-cols-[2fr_1fr] xl:grid-cols-[2fr_1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute bottom-2.5 end-3 h-3.5 w-3.5 text-slate-400" />
              <input
                type="search"
                value={filters.searchTerm}
                onChange={(event) => updateFilters({ searchTerm: event.target.value })}
                placeholder={isEn ? "Search campaign name, objective, or Meta ID..." : "ابحث باسم الحملة، الهدف، أو Meta ID..."}
                className="h-9 w-full rounded-xl border border-slate-200/90 bg-white px-3 pe-9 text-xs font-bold text-slate-800 shadow-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <SelectFilter
              icon={Clock3}
              label={isEn ? "Sort By" : "الترتيب"}
              value={filters.sortBy}
              onChange={(value) => updateFilters({ sortBy: value as CampaignSortKey })}
              options={getSortOptions(isEn)}
            />

            <button
              type="button"
              onClick={() => setShowExtraFilters((prev) => !prev)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showExtraFilters ? (isEn ? "Fewer Filters" : "فلاتر أقل") : (isEn ? "More Filters" : "المزيد من الفلاتر")}
            </button>
          </div>

          {showExtraFilters && (
            <div className="mt-1 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-2 border-t border-slate-100 dark:border-slate-800">
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
        <div className="flex flex-col items-center gap-3 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 shadow-xs">
            <Megaphone className="h-6 w-6" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
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
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-xs hover:bg-blue-700 transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isEn ? "Create First Ad" : "إنشاء أول إعلان للمنتج"}</span>
            </Link>
          </div>
        </div>
      ) : currentVisibleCampaignCount === 0 ? (
        <div className="flex flex-col items-center gap-3 p-12 text-center">
          <Search className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {isEn ? "No matching campaigns" : "لا توجد حملات مطابقة"}
          </h3>
          <p className="text-xs text-slate-500">
            {isEn
              ? "Try changing your search term or status filter."
              : "جرب تغيير مصطلح البحث أو فلتر الحالة."}
          </p>
          <button
            type="button"
            onClick={() => updateFilters(defaultFilters)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isEn ? "Clear Filters" : "إعادة ضبط الفلاتر"}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
                className="p-3 sm:px-4 sm:py-3 transition-colors hover:bg-blue-50/20 dark:hover:bg-slate-800/40"
              >
                {/* Desktop & Mobile Responsive Row */}
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left Section: Switch + Name + Badges */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Instant Status Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(campaign)}
                      disabled={isToggling}
                      title={isActive ? (isEn ? "Pause Campaign" : "إيقاف الحملة") : (isEn ? "Resume Campaign" : "تنشيط الحملة")}
                      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      {isToggling ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        </span>
                      ) : (
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h2 className="truncate text-xs sm:text-sm font-bold text-slate-900 dark:text-white max-w-[320px] sm:max-w-lg lg:max-w-xl">
                          {campaign.name}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {isActive ? (isEn ? "Active" : "نشط") : (isEn ? "Paused" : "متوقف")}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${decision.className}`}>
                          {decision.label}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{getObjectiveLabel(campaign.objective)}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${campaign.facebookCampaignId ? "bg-blue-500" : "bg-amber-500"}`} />
                          {campaign.facebookCampaignId ? "Meta Synced" : (isEn ? "Local" : "محلي")}
                        </span>
                        {blockerText && !isCampaignDelivering(campaign) && (
                          <>
                            <span>•</span>
                            <span
                              title={blockerText}
                              className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 cursor-help transition-all hover:bg-amber-500/20"
                            >
                              <PauseCircle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                              <span className="truncate max-w-[220px]">
                                {blockerText.includes("لا توجد مجموعات") || campaign.adSets?.length === 0
                                  ? (isEn ? "Awaiting Ad Sets Sync" : "بانتظار مزامنة المجموعات")
                                  : blockerText}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Metrics + Inline Budget + Action */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 lg:justify-end">
                    {/* Inline Budget Editor */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-800/60">
                      <span className="text-[10px] font-medium text-slate-500">
                        {isEn ? "Budget:" : "الميزانية:"}
                      </span>
                      {isEditingBudget ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editBudgetValue}
                            onChange={(e) => setEditBudgetValue(e.target.value)}
                            className="h-6 w-16 rounded-md border border-blue-400 bg-white px-1 text-xs font-semibold tabular-nums text-slate-900 outline-none dark:bg-slate-900 dark:text-white"
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
                        <div className="flex items-center gap-1" dir="ltr">
                          <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(currentBudget, selectedCurrency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditBudget(campaign.id, currentBudget)}
                            title={isEn ? "Edit Budget" : "تعديل الميزانية"}
                            className="rounded p-0.5 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Performance Chips Cluster */}
                    <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/60 px-1 py-0.5 text-xs" dir="ltr">
                      <div className="text-center px-2.5 py-0.5">
                        <span className="block text-[9px] font-medium text-slate-500">{isEn ? "Spend" : "الإنفاق"}</span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(performance?.spend || 0, selectedCurrency)}
                        </span>
                      </div>
                      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="text-center px-2.5 py-0.5">
                        <span className="block text-[9px] font-medium text-slate-500">ROAS</span>
                        <span className={`font-bold tabular-nums ${(performance?.roas || 0) >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                          {formatNumber(performance?.roas || 0, 2)}x
                        </span>
                      </div>
                      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="text-center px-2.5 py-0.5">
                        <span className="block text-[9px] font-medium text-slate-500">CPA</span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(performance?.cpa || 0, selectedCurrency)}
                        </span>
                      </div>
                    </div>

                    {/* Details Link */}
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
                      title={isEn ? "View Campaign Details" : "عرض تفاصيل الحملة"}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs hover:border-blue-500 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-all"
                    >
                      <span className="hidden sm:inline">{isEn ? "Details" : "تفاصيل"}</span>
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
    </section>
  );
};

export default CampaignsListSection;
