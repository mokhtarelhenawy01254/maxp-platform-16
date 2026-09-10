import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Clock3,
  Filter,
  PauseCircle,
  Search,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import MiniMetric from "./MiniMetric";
import SelectFilter from "./SelectFilter";
import {
  CAMPAIGN_OBJECTIVES,
  type FacebookCampaign,
  type FacebookAdsPerformanceSummary,
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

  // Reset limit when filters or account changes
  React.useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [filters, selectedAdAccountId]);

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
      <div className="border-b border-slate-200/80 p-3 sm:p-4 dark:border-slate-800/80">
        <div className="grid gap-2.5 md:grid-cols-[2fr_1.2fr_1fr] xl:grid-cols-[1.2fr_0.8fr_0.5fr_0.8fr_0.8fr_0.8fr]">
          <label className="relative block">
            <span className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              {isEn ? "Search" : "بحث"}
            </span>
            <Search className="pointer-events-none absolute bottom-2.5 right-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={filters.searchTerm}
              onChange={(event) => updateFilters({ searchTerm: event.target.value })}
              placeholder={isEn ? "Campaign name or Meta ID" : "اسم الحملة أو Meta ID"}
              className="h-9 w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-3 pr-9 text-xs font-bold text-slate-800 shadow-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <SelectFilter
            icon={Filter}
            label={isEn ? "Delivery Status" : "حالة التسليم"}
            value={filters.statusFilter}
            onChange={(value) =>
              updateFilters({ statusFilter: value as DeliveryFilter })
            }
            options={getDeliveryFilterOptions(isEn)}
          />

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setShowExtraFilters((prev) => !prev)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showExtraFilters ? (isEn ? "Less Filters" : "فلاتر أقل") : (isEn ? "More" : "المزيد")}
            </button>
          </div>

          {showExtraFilters && (
            <>
              <SelectFilter
                icon={Target}
                label={isEn ? "Objective" : "الهدف"}
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
                  { value: "META", label: isEn ? "Meta Only" : "Meta فقط" },
                  { value: "LOCAL", label: isEn ? "Local Only" : "محلي فقط" },
                ]}
              />

              <SelectFilter
                icon={Clock3}
                label={isEn ? "Sort By" : "الترتيب"}
                value={filters.sortBy}
                onChange={(value) =>
                  updateFilters({ sortBy: value as CampaignSortKey })
                }
                options={getSortOptions(isEn)}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>{formatNumber(currentFilteredCampaignCount)} {isEn ? "campaign" : "حملة"}</span>
        <span>{selectedDateLabel}</span>
      </div>

      {currentVisibleCampaignCount === 0 ? (
        <div className="flex flex-col items-center gap-3 p-12 text-center">
          <Search className="h-10 w-10 text-slate-300" />
          <h3 className="text-lg font-black">{isEn ? "No matching campaigns" : "لا توجد حملات مطابقة"}</h3>
          <button
            type="button"
            onClick={() => updateFilters(defaultFilters)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isEn ? "Clear Filters" : "مسح الفلاتر"}
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
                className="px-3.5 py-3 transition-colors hover:bg-blue-50/20 dark:hover:bg-slate-800/40"
              >
                <div className="grid gap-3 xl:grid-cols-[1.5fr_0.9fr_1.1fr_auto] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isCampaignDelivering(campaign) && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                      )}
                      <h2 className="max-w-3xl truncate text-sm font-black text-slate-950 dark:text-white">
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
                      <span>{campaign.facebookCampaignId ? "Meta synced" : (isEn ? "Local only" : "محلي فقط")}</span>
                      <span>{isEn ? "Last Meta:" : "آخر Meta:"} {formatDate(campaign.facebookUpdatedTime || campaign.lastSyncAt)}</span>
                    </div>
                    {blockerText && !isCampaignDelivering(campaign) && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-800 dark:bg-orange-950/40 dark:text-orange-100">
                        <PauseCircle className="h-3.5 w-3.5" />
                        {blockerText}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <MiniMetric label={isEn ? "Budget" : "الميزانية"} value={formatCurrency(campaign.budgetAmount, selectedCurrency)} />
                    <MiniMetric label={isEn ? "Delivery" : "التسليم"} value={getDeliveryLabel(getCampaignEffectiveStatus(campaign))} />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4 xl:grid-cols-2">
                    <MiniMetric label={isEn ? "Spend" : "الإنفاق"} value={formatCurrency(performance?.spend || 0, selectedCurrency)} />
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
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-bold text-slate-700 shadow-xs hover:border-blue-500 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all"
                    >
                      {isEn ? "Details" : "تفاصيل"}
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
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
            {isEn ? "Show More Campaigns" : "عرض حملات أكثر"}
          </button>
        </div>
      )}
    </section>
  );
};

export default CampaignsListSection;
