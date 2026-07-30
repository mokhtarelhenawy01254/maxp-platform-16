import { formatDate } from '@/utils/formatters';
import { formatCurrency } from '@/utils/formatters';
import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Clock3, Filter, PauseCircle, Search, Sliders, Target } from 'lucide-react';
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
            onClick={() => updateFilters(defaultFilters)}
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
  );
};

export default CampaignsListSection;
