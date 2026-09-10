/**
 * Campaign Details Page
 *
 * صفحة تفاصيل الحملة الإعلانية
 */

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  ShoppingBagIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  FacebookCampaign,
  CAMPAIGN_OBJECTIVES,
} from "../../services/facebookAdsService";
import type { FacebookCampaignInsightsResponse } from "../../services/facebookAdsService";

type CampaignWithCurrency = FacebookCampaign & {
  adAccount?: { currency?: string | null } | null;
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "response" in error) {
    const response = error.response as {
      data?: { error?: string };
    };

    if (typeof response.data?.error === "string") {
      return response.data.error;
    }
  }

  return fallback;
};

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const [campaign, setCampaign] = useState<FacebookCampaign | null>(null);
  const [insights, setInsights] =
    useState<FacebookCampaignInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const selectedAdAccountId = searchParams.get("adAccountId") || "";
  const dashboardUrl = `/advertising/facebook-ads${
    selectedAdAccountId
      ? `?adAccountId=${encodeURIComponent(selectedAdAccountId)}`
      : ""
  }`;
  const withAdAccountParam = (path: string) =>
    `${path}${
      selectedAdAccountId
        ? `?adAccountId=${encodeURIComponent(selectedAdAccountId)}`
        : ""
    }`;

  const loadCampaign = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [campaignResult, insightsResult] = await Promise.allSettled([
        facebookAdsService.getCampaign(id),
        facebookAdsService.getCampaignInsights(id),
      ]);

      if (campaignResult.status === "rejected") {
        throw campaignResult.reason;
      }

      setCampaign(campaignResult.value);
      setInsights(
        insightsResult.status === "fulfilled" ? insightsResult.value : null,
      );
    } catch (error: unknown) {
      console.error("Error loading campaign:", error);
      toast.error(getApiErrorMessage(error, isEn ? "Failed to load campaign" : "فشل في تحميل الحملة"));
      navigate(dashboardUrl);
    } finally {
      setLoading(false);
    }
  }, [dashboardUrl, id, isEn, navigate]);

  useEffect(() => {
    if (id) {
      loadCampaign();
    }
  }, [id, loadCampaign]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaign();
    setRefreshing(false);
    tToast.success("CampaignDetails.success_update_c9e9");
  };

  const handlePause = async () => {
    if (!id) return;
    try {
      await facebookAdsService.pauseCampaign(id);
      tToast.success("CampaignDetails.msg_c0fb");
      await loadCampaign();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, isEn ? "Failed to pause campaign" : "فشل في إيقاف الحملة"));
    }
  };

  const handleResume = async () => {
    if (!id) return;
    try {
      await facebookAdsService.resumeCampaign(id);
      tToast.success("CampaignDetails.msg_00e5");
      await loadCampaign();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, isEn ? "Failed to resume campaign" : "فشل في استئناف الحملة"));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm(isEn ? "Are you sure you want to delete this campaign?" : "هل أنت متأكد من حذف هذه الحملة؟")) {
      return;
    }

    try {
      await facebookAdsService.deleteCampaign(id);
      tToast.success("CampaignDetails.success_delete_b4c9");
      navigate(dashboardUrl);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, isEn ? "Failed to delete campaign" : "فشل في حذف الحملة"));
    }
  };

  const getObjectiveLabel = (objective: string) => {
    const obj = CAMPAIGN_OBJECTIVES.find((o) => o.value === objective);
    return obj?.label || objective;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      ACTIVE: "bg-green-100 text-green-800",
      PAUSED: "bg-yellow-100 text-yellow-800",
      ARCHIVED: "bg-gray-100 text-gray-800",
      DELETED: "bg-red-100 text-red-800",
    };
    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: isEn ? "Active" : "نشط",
      PAUSED: isEn ? "Paused" : "متوقف",
      ARCHIVED: isEn ? "Archived" : "مؤرشف",
      DELETED: isEn ? "Deleted" : "محذوف",
    };
    return labels[status] || status;
  };

  const formatCurrency = (value?: number, currency = "EGP") =>
    new Intl.NumberFormat(isEn ? "en-US" : "ar-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value || 0);

  const formatNumber = (value?: number) =>
    new Intl.NumberFormat(isEn ? "en-US" : "ar-EG").format(value || 0);

  const formatPercent = (value?: number) =>
    `${new Intl.NumberFormat(isEn ? "en-US" : "ar-EG", {
      maximumFractionDigits: 2,
    }).format(value || 0)}%`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{isEn ? "Campaign not found" : "الحملة غير موجودة"}</p>
        <button
          onClick={() => navigate(dashboardUrl)}
          className="mt-4 text-indigo-600 hover:text-indigo-700 font-bold"
        >
          {isEn ? "Back to Dashboard" : "العودة للقائمة"}
        </button>
      </div>
    );
  }

  const campaignAdSets = campaign.adSets || [];
  const campaignAds = campaignAdSets.flatMap((adSet) => adSet.ads || []);
  const activeAdSets = campaignAdSets.filter(
    (adSet) => adSet.status === "ACTIVE" || adSet.effectiveStatus === "ACTIVE",
  ).length;
  const activeAds = campaignAds.filter(
    (ad) => ad.status === "ACTIVE" || ad.effectiveStatus === "ACTIVE",
  ).length;
  const campaignCurrency =
    (campaign as CampaignWithCurrency).adAccount?.currency || "EGP";
  const dateRangeLabel = insights?.dateRange
    ? `${insights.dateRange.startDate} → ${insights.dateRange.endDate}`
    : isEn ? "Last 30 days" : "آخر 30 يوم";
  const metricItems = [
    {
      label: isEn ? "Spend" : "الإنفاق",
      value: formatCurrency(insights?.data.spend, campaignCurrency),
      sub: `${formatNumber(insights?.data.impressions)} ${isEn ? "impressions" : "ظهور"}`,
    },
    {
      label: isEn ? "Purchases" : "المشتريات",
      value: formatNumber(insights?.data.purchases),
      sub: `${formatNumber(insights?.data.clicks)} ${isEn ? "clicks" : "نقرة"}`,
    },
    {
      label: "ROAS",
      value: `${(insights?.data.roas || 0).toFixed(2)}x`,
      sub: `CPA ${formatCurrency(insights?.data.cpa, campaignCurrency)}`,
    },
    {
      label: "CTR",
      value: formatPercent(insights?.data.ctr),
      sub: `Frequency ${(insights?.data.frequency || 0).toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-3" dir={isEn ? "ltr" : "rtl"}>
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              onClick={() => navigate(dashboardUrl)}
              className="mt-0.5 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label={isEn ? "Back to Campaigns" : "العودة لقائمة الحملات"}
              title={isEn ? "Back" : "رجوع"}
            >
              <ArrowLeftIcon className={`h-4 w-4 ${isEn ? "" : "rotate-180"}`} />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="max-w-3xl truncate text-xl font-black text-slate-950">
                  {campaign.name}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadge(campaign.status)}`}
                >
                  {getStatusLabel(campaign.status)}
                </span>
                {campaign.deliveryReadiness?.label && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {campaign.deliveryReadiness.label}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-lg bg-slate-50 px-2.5 py-1">
                  {isEn ? "Objective:" : "الهدف:"} {getObjectiveLabel(campaign.objective)}
                </span>
                <span className="rounded-lg bg-slate-50 px-2.5 py-1">
                  {isEn ? "Budget:" : "الميزانية:"}{" "}
                  {formatCurrency(campaign.budgetAmount, campaignCurrency)}
                  {campaign.budgetType === "DAILY" ? (isEn ? " / day" : " / يوم") : ""}
                </span>
                <span className="rounded-lg bg-slate-50 px-2.5 py-1">
                  {isEn ? "Ad Sets:" : "المجموعات:"} {activeAdSets}/{campaignAdSets.length}
                </span>
                <span className="rounded-lg bg-slate-50 px-2.5 py-1">
                  {isEn ? "Ads:" : "الإعلانات:"} {activeAds}/{campaignAds.length}
                </span>
                <span className="rounded-lg bg-slate-50 px-2.5 py-1">
                  {isEn ? "Period:" : "الفترة:"} {dateRangeLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {isEn ? "Refresh" : "تحديث"}
            </button>
            {campaign.status === "ACTIVE" ? (
              <button
                onClick={handlePause}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                <PauseIcon className="h-4 w-4" />
                {isEn ? "Pause" : "إيقاف"}
              </button>
            ) : campaign.status === "PAUSED" ? (
              <button
                onClick={handleResume}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <PlayIcon className="h-4 w-4" />
                {isEn ? "Resume" : "تشغيل"}
              </button>
            ) : null}
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4" />
              {isEn ? "Delete" : "حذف"}
            </button>
          </div>
        </div>

        <div className="grid border-t border-slate-100 sm:grid-cols-2 xl:grid-cols-4">
          {metricItems.map((item) => (
            <div
              key={item.label}
              className="flex min-h-[72px] items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:border-l sm:border-t-0"
            >
              <div>
                <p className="text-xs font-bold text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {item.value}
                </p>
              </div>
              <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500">
                {item.sub}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">
              {isEn ? "Campaign Ad Sets" : "مجموعات الإعلانات داخل الحملة"}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {isEn
                ? "Open any ad to view detailed performance & diagnosis."
                : "افتح أي إعلان لمراجعة الأداء والتشخيص التفصيلي."}
            </p>
          </div>
          <button
            onClick={() =>
              navigate(
                withAdAccountParam(
                  `/advertising/facebook-ads/campaigns/${id}/adsets/create`,
                ),
              )
            }
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            <PlusIcon className="h-4 w-4" />
            {isEn ? "Add Ad Set" : "إضافة مجموعة"}
          </button>
        </div>

        {campaignAdSets.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">
              {isEn ? "No ad sets yet" : "لا توجد مجموعات إعلانات بعد"}
            </p>
            <button
              onClick={() =>
                navigate(
                  withAdAccountParam(
                    `/advertising/facebook-ads/campaigns/${id}/adsets/create`,
                  ),
                )
              }
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <PlusIcon className="h-4 w-4" />
              {isEn ? "Create First Ad Set" : "إنشاء أول مجموعة"}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {campaignAdSets.map((adSet) => {
              const ads = adSet.ads || [];

              return (
                <div key={adSet.id} className="px-4 py-3 hover:bg-slate-50/70">
                  <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-black text-slate-950">
                          {adSet.name}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadge(adSet.status)}`}
                        >
                          {getStatusLabel(adSet.effectiveStatus || adSet.status)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                        <span>
                          {formatCurrency(adSet.budgetAmount, campaignCurrency)}
                          {adSet.budgetType === "DAILY" ? (isEn ? " / day" : " / يوم") : ""}
                        </span>
                        <span>{ads.length} {isEn ? "ads" : "إعلان"}</span>
                        {adSet.optimizationGoal && (
                          <span>{adSet.optimizationGoal}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            withAdAccountParam(
                              `/advertising/facebook-ads/adsets/${adSet.id}/ads/create`,
                            ),
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                        title={isEn ? "Create New Ad" : "إنشاء إعلان جديد"}
                      >
                        <PlusIcon className="h-4 w-4" />
                        {isEn ? "New Ad" : "إعلان جديد"}
                      </button>
                      <button
                        onClick={() =>
                          navigate(
                            withAdAccountParam(
                              `/advertising/facebook-ads/adsets/${adSet.id}/dynamic-ads/create`,
                            ),
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                        title={isEn ? "Create Dynamic Ad" : "إنشاء Dynamic Ad"}
                      >
                        <ShoppingBagIcon className="h-4 w-4" />
                        {isEn ? "Dynamic" : "Dynamic"}
                      </button>
                    </div>
                  </div>

                  {ads.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {ads.map((ad) => (
                        <button
                          key={ad.id}
                          onClick={() =>
                            navigate(
                              withAdAccountParam(
                                `/advertising/facebook-ads/ads/${ad.id}`,
                              ),
                            )
                          }
                          className={`flex min-h-[50px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 ${
                            isEn ? "text-left" : "text-right"
                          } hover:border-indigo-200 hover:bg-indigo-50`}
                          title={isEn ? "Open ad details and analysis" : "فتح تفاصيل وتحليل الإعلان"}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-950">
                              {ad.name}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              {getStatusLabel(ad.effectiveStatus || ad.status)} ·{" "}
                              {ad.facebookAdId ? "Meta Synced" : (isEn ? "Local only" : "محلي")}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                            <ChartBarIcon className="h-4 w-4" />
                            {isEn ? "Performance" : "الأداء"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default CampaignDetails;
