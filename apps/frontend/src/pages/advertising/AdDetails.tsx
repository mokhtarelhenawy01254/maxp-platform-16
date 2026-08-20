/**
 * Ad Details Page
 *
 * صفحة تشخيص أداء إعلان فردي
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CursorArrowRaysIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  LinkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  FacebookAdDetailResponse,
  FacebookAdPerformanceBreakdownReport,
  FacebookPerformanceBreakdown,
  FacebookPerformanceBreakdownRow,
} from "../../services/facebookAdsService";
import { toFacebookAdsDateInput } from "../../utils/facebookAdsReportFilters";

const STORAGE_KEY = "facebook-ad-details-date-range";

const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);

  return {
    startDate: toFacebookAdsDateInput(start),
    endDate: toFacebookAdsDateInput(end),
  };
};

const getStoredDateRange = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultDateRange();
    const parsed = JSON.parse(stored) as {
      startDate?: string;
      endDate?: string;
    };
    return {
      startDate: parsed.startDate || getDefaultDateRange().startDate,
      endDate: parsed.endDate || getDefaultDateRange().endDate,
    };
  } catch {
    return getDefaultDateRange();
  }
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

const getSafeNumber = (value?: number) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const getCreativePayload = (creative: unknown): Record<string, unknown> => {
  if (!creative) return {};
  if (typeof creative === "object") return creative as Record<string, unknown>;

  if (typeof creative === "string") {
    try {
      const parsed = JSON.parse(creative);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
};

const getStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    ACTIVE: "نشط",
    PAUSED: "متوقف",
    ARCHIVED: "مؤرشف",
    DELETED: "محذوف",
    IN_PROCESS: "قيد المعالجة",
    WITH_ISSUES: "به مشاكل",
    DISAPPROVED: "مرفوض",
  };

  return labels[status || ""] || status || "غير محدد";
};

const getStatusBadge = (status?: string) => {
  const normalized = status || "";
  if (normalized === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "PAUSED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["DISAPPROVED", "WITH_ISSUES", "DELETED"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const getVerdictClass = (tone?: string) => {
  const classes: Record<string, string> = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return classes[tone || "slate"] || classes["slate"];
};

const getPriorityClass = (priority?: string) => {
  if (priority === "HIGH") return "border-red-200 bg-red-50 text-red-800";
  if (priority === "MEDIUM") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const getPreviewHtml = (preview: unknown[]) => {
  const first = preview?.[0];
  if (first && typeof first === "object" && "body" in first) {
    return String((first as { body?: string }).body || "");
  }

  return "";
};

const AdDetails: React.FC = () => {
  const { adId } = useParams<{ adId: string }>();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(getStoredDateRange);
  const [details, setDetails] = useState<FacebookAdDetailResponse | null>(null);
  const [breakdowns, setBreakdowns] = useState<
    Partial<Record<FacebookPerformanceBreakdown, FacebookAdPerformanceBreakdownReport>>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<unknown[]>([]);
  const selectedCurrency = details?.adAccount?.currency || "EGP";

  const formatCurrency = useCallback(
    (value?: number) =>
      new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: selectedCurrency,
        maximumFractionDigits: 2,
      }).format(getSafeNumber(value)),
    [selectedCurrency],
  );

  const formatNumber = (value?: number) =>
    new Intl.NumberFormat("ar-EG", {
      maximumFractionDigits: 0,
    }).format(getSafeNumber(value));

  const formatDecimal = (value?: number, suffix = "") =>
    `${new Intl.NumberFormat("ar-EG", {
      maximumFractionDigits: 2,
    }).format(getSafeNumber(value))}${suffix}`;

  const formatPercent = (value?: number) => formatDecimal(value, "%");

  const loadDetails = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!adId) return;

      try {
        if (!silent) setLoading(true);
        const detailResult = await facebookAdsService.getAdDetails(
          adId,
          dateRange.startDate,
          dateRange.endDate,
        );

        if (!detailResult?.ad) {
          throw new Error("بيانات الإعلان غير مكتملة");
        }

        setDetails(detailResult);

        const breakdownTypes: FacebookPerformanceBreakdown[] = [
          "age_gender",
          "placement",
          "device",
        ];
        const breakdownResults = await Promise.allSettled(
          breakdownTypes.map((breakdown) =>
            facebookAdsService.getAdPerformanceBreakdown({
              adId,
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
              breakdown,
            }),
          ),
        );

        const nextBreakdowns: Partial<
          Record<FacebookPerformanceBreakdown, FacebookAdPerformanceBreakdownReport>
        > = {};
        breakdownResults.forEach((result, index) => {
          const breakdown = breakdownTypes[index];
          if (result.status === "fulfilled" && breakdown) {
            nextBreakdowns[breakdown] = result.value;
          }
        });
        setBreakdowns(nextBreakdowns);
      } catch (error: unknown) {
        console.error("Error loading ad details:", error);
        toast.error(getApiErrorMessage(error, "فشل في تحميل تفاصيل الإعلان"));
      } finally {
        setLoading(false);
      }
    },
    [adId, dateRange.endDate, dateRange.startDate],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
    loadDetails();
  }, [dateRange, loadDetails]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDetails({ silent: true });
    setRefreshing(false);
    tToast.success("AdDetails.success_update_b872");
  };

  const handleSync = async () => {
    if (!adId) return;

    try {
      setSyncing(true);
      await facebookAdsService.syncAdInsights(
        adId,
        dateRange.startDate,
        dateRange.endDate,
      );
      await loadDetails({ silent: true });
      tToast.success("AdDetails.msg_39be");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل في مزامنة الإعلان"));
    } finally {
      setSyncing(false);
    }
  };

  const handlePreview = async () => {
    if (!details?.ad.facebookAdId) {
      tToast.error("AdDetails.msg_d051");
      return;
    }

    try {
      setPreviewLoading(true);
      const result = await facebookAdsService.getAdPreview(
        details.ad.facebookAdId,
        "MOBILE_FEED_STANDARD",
      );
      setPreviewData(result);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل في تحميل معاينة الإعلان"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const creativePayload = useMemo(
    () => getCreativePayload(details?.ad?.creative),
    [details?.ad?.creative],
  );
  const previewHtml = useMemo(() => getPreviewHtml(previewData), [previewData]);
  const dashboardUrl = details?.campaign?.id
    ? `/advertising/facebook-ads/campaigns/${details.campaign.id}`
    : "/advertising/facebook-ads";
  const performanceSourceLabel =
    details?.meta?.performanceSource === "META" ? "Meta مباشر" : "محلي";
  const performanceSourceClass =
    details?.meta?.performanceSource === "META"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  const bestSibling = useMemo(() => {
    const siblings = details?.siblingAds || [];
    return [...siblings].sort((a, b) => b.metrics.roas - a.metrics.roas)[0];
  }, [details?.siblingAds]);

  const metricSummary = details?.summary;
  const metricCards = [
    {
      label: "الإنفاق",
      value: formatCurrency(metricSummary?.spend),
      comparison: details?.comparisons.previousPeriod["spend"],
    },
    {
      label: "المشتريات",
      value: formatNumber(metricSummary?.purchases),
      comparison: details?.comparisons.previousPeriod["purchases"],
    },
    {
      label: "ROAS",
      value: `${formatDecimal(metricSummary?.roas)}x`,
      comparison: details?.comparisons.previousPeriod["roas"],
    },
    {
      label: "CPA",
      value: formatCurrency(metricSummary?.cpa),
      comparison: details?.comparisons.previousPeriod["cpa"],
      inverse: true,
    },
    {
      label: "CTR",
      value: formatPercent(metricSummary?.ctr),
      comparison: details?.comparisons.previousPeriod["ctr"],
    },
    {
      label: "Frequency",
      value: formatDecimal(metricSummary?.frequency),
      comparison: details?.comparisons.previousPeriod["frequency"],
      inverse: true,
    },
  ];

  const renderChange = (value?: number, inverse = false) => {
    const change = getSafeNumber(value);
    const isGood = inverse ? change <= 0 : change >= 0;
    const className = isGood ? "text-emerald-700" : "text-red-700";
    const sign = change > 0 ? "+" : "";
    return (
      <span className={`text-[11px] font-bold ${className}`}>
        {sign}
        {formatPercent(change)} عن الفترة السابقة
      </span>
    );
  };

  const renderBreakdownRows = (
    report: FacebookAdPerformanceBreakdownReport | undefined,
    emptyLabel: string,
  ) => {
    const rows = report?.rows || [];
    const maxSpend = Math.max(...rows.map((row) => row.metrics.spend), 1);

    if (rows.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          {emptyLabel}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {rows.slice(0, 5).map((row: FacebookPerformanceBreakdownRow) => (
          <div
            key={row.key}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">
                  {row.label}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {formatCurrency(row.metrics.spend)} · ROAS{" "}
                  {formatDecimal(row.metrics.roas)}x · CPA{" "}
                  {formatCurrency(row.metrics.cpa)}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-slate-600">
                {formatNumber(row.metrics.purchases)} شراء
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${Math.max(4, (row.metrics.spend / maxSpend) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-600">الإعلان غير موجود</p>
        <button
          onClick={() => navigate("/advertising/facebook-ads")}
          className="mt-4 text-indigo-600 hover:text-indigo-700"
        >
          العودة للوحة الإعلانات
        </button>
      </div>
    );
  }

  const summary = details.summary;
  const decision = details.decision;
  const funnelSteps = details.funnel.steps;
  const maxFunnelValue = Math.max(...funnelSteps.map((step) => step.value), 1);
  const qualityMetrics = details.quality.metrics || {};

  return (
    <div className="space-y-3" dir="rtl">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              onClick={() => navigate(dashboardUrl)}
              className="mt-0.5 rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              title="رجوع"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-black text-slate-950">
                  {details.ad.name}
                </h1>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusBadge(
                    details.ad.effectiveStatus || details.ad.status,
                  )}`}
                >
                  {getStatusLabel(details.ad.effectiveStatus || details.ad.status)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getVerdictClass(
                    details.verdict.tone,
                  )}`}
                >
                  {details.verdict.label}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${performanceSourceClass}`}
                  title={details.meta?.metaInsightError || undefined}
                >
                  {performanceSourceLabel}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-600">
                {details.campaign.name} · {details.adSet.name}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
                {details.verdict.reason}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(event) =>
                setDateRange((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
            />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              تحديث
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || !details.ad.facebookAdId}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <BoltIcon className={`h-4 w-4 ${syncing ? "animate-pulse" : ""}`} />
              مزامنة
            </button>
            <button
              onClick={handlePreview}
              disabled={previewLoading || !details.ad.facebookAdId}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              <EyeIcon className="h-4 w-4" />
              معاينة
            </button>
          </div>
        </div>
      </div>

      {decision ? (
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
          <div className="grid gap-2 xl:grid-cols-[1.35fr_repeat(5,minmax(0,1fr))]">
            <div className={`rounded-md border px-2.5 py-2 ${getVerdictClass(decision.tone)}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black">{decision.label}</span>
                <span className="text-[11px] font-black">
                  ثقة {formatNumber(decision.confidence?.score)}%
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-[11px] font-semibold">
                {decision.reason}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[11px] opacity-80">
                {decision.nextAction}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 px-2.5 py-2">
              <p className="text-[10px] font-bold text-slate-500">هدف CPA</p>
              <p className="mt-0.5 text-sm font-black text-slate-950">
                {formatCurrency(decision.economics?.targetCpa)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 px-2.5 py-2">
              <p className="text-[10px] font-bold text-slate-500">Break-even ROAS</p>
              <p className="mt-0.5 text-sm font-black text-slate-950">
                {formatDecimal(decision.economics?.breakEvenRoas)}x
              </p>
            </div>
            <div className="rounded-md border border-slate-200 px-2.5 py-2">
              <p className="text-[10px] font-bold text-slate-500">ربح تقديري</p>
              <p className="mt-0.5 text-sm font-black text-slate-950">
                {formatCurrency(decision.metrics?.estimatedProfit)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 px-2.5 py-2">
              <p className="text-[10px] font-bold text-slate-500">طلبات منسوبة</p>
              <p className="mt-0.5 text-sm font-black text-slate-950">
                {formatNumber(decision.attribution?.exactDeliveredOrders)} /{" "}
                {formatNumber(decision.attribution?.relatedDeliveredOrders)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 px-2.5 py-2">
              <p className="text-[10px] font-bold text-slate-500">تكلفة المنتج</p>
              <p className="mt-0.5 truncate text-sm font-black text-slate-950">
                {decision.economics?.costSource || "غير متاح"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
          >
            <p className="text-[11px] font-bold text-slate-500">
              {metric.label}
            </p>
            <p className="mt-0.5 text-base font-black text-slate-950">
              {metric.value}
            </p>
            {renderChange(metric.comparison, metric.inverse)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">
                تشخيص الفانل
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {details.funnel.diagnosis.title}
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getPriorityClass(
                details.funnel.diagnosis.severity,
              )}`}
            >
              {details.funnel.diagnosis.severity}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">
            {details.funnel.diagnosis.message}
          </p>

          <div className="mt-3 space-y-2">
            {funnelSteps.map((step) => (
              <div key={step.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{step.label}</span>
                  <span className="font-semibold text-slate-500">
                    {formatNumber(step.value)} · {formatPercent(step.rate)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{
                      width: `${Math.max(2, (step.value / maxFunnelValue) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-black text-slate-950">
              توصيات القرار
            </h2>
          </div>
          <div className="mt-2 space-y-2">
            {details.recommendations.slice(0, 4).map((recommendation) => (
              <div
                key={`${recommendation.priority}-${recommendation.title}`}
                className={`rounded-lg border p-2.5 ${getPriorityClass(
                  recommendation.priority,
                )}`}
              >
                <p className="text-sm font-black">{recommendation.title}</p>
                <p className="mt-1 text-xs leading-5">{recommendation.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CursorArrowRaysIcon className="h-5 w-5 text-slate-700" />
            <h2 className="text-base font-black text-slate-950">
              العمر والجنس
            </h2>
          </div>
          <div className="mt-3">
            {renderBreakdownRows(
              breakdowns.age_gender,
              "لا توجد بيانات عمر/جنس كافية لهذا الإعلان.",
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-slate-700" />
            <h2 className="text-base font-black text-slate-950">
              المنصة والموضع
            </h2>
          </div>
          <div className="mt-3">
            {renderBreakdownRows(
              breakdowns.placement,
              "لا توجد بيانات مواضع كافية لهذا الإعلان.",
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-slate-700" />
            <h2 className="text-base font-black text-slate-950">الأجهزة</h2>
          </div>
          <div className="mt-3">
            {renderBreakdownRows(
              breakdowns.device,
              "لا توجد بيانات أجهزة كافية لهذا الإعلان.",
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black text-slate-950">
            الكريتيف والرسالة
          </h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-500">النص الأساسي</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-800">
                {details.ad.primaryText || "غير متاح"}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <InfoLine label="العنوان" value={details.ad.headline} />
              <InfoLine label="CTA" value={details.ad.callToAction} />
              <InfoLine label="النوع" value={details.ad.creativeType} />
              <InfoLine
                label="Creative ID"
                value={String(creativePayload["creativeId"] || "غير متاح")}
              />
            </div>
            {details.ad.linkUrl && (
              <a
                href={details.ad.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
              >
                <LinkIcon className="h-4 w-4" />
                فتح رابط الإعلان
              </a>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black text-slate-950">
            جودة الإعلان من Meta
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <QualityLine
              label="Quality Ranking"
              value={qualityMetrics.qualityRanking}
            />
            <QualityLine
              label="Engagement Ranking"
              value={qualityMetrics.engagementRateRanking}
            />
            <QualityLine
              label="Conversion Ranking"
              value={qualityMetrics.conversionRateRanking}
            />
          </div>
          {!details.quality.available && (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {details.quality.error ||
                "مؤشرات الجودة غير متاحة من Meta لهذا الإعلان حالياً."}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black text-slate-950">
            مقارنة داخل المجموعة
          </h2>
          <div className="mt-3 space-y-2">
            {bestSibling && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-black">أفضل ROAS: {bestSibling.name}</p>
                <p className="mt-1 text-xs">
                  ROAS {formatDecimal(bestSibling.metrics.roas)}x · CPA{" "}
                  {formatCurrency(bestSibling.metrics.cpa)}
                </p>
              </div>
            )}
            {details.siblingAds.slice(0, 5).map((sibling) => (
              <button
                key={sibling.id}
                onClick={() =>
                  navigate(`/advertising/facebook-ads/ads/${sibling.id}`)
                }
                className={`w-full rounded-lg border p-3 text-right text-sm hover:bg-slate-50 ${
                  sibling.id === details.ad.id
                    ? "border-indigo-200 bg-indigo-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-bold text-slate-950">
                    {sibling.name}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {formatDecimal(sibling.metrics.roas)}x
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatCurrency(sibling.metrics.spend)} ·{" "}
                  {formatNumber(sibling.metrics.purchases)} شراء
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-950">
              معاينة الإعلان
            </h2>
            <button
              onClick={handlePreview}
              disabled={previewLoading || !details.ad.facebookAdId}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <EyeIcon className="h-4 w-4" />
              تحميل المعاينة
            </button>
          </div>

          {previewHtml ? (
            <iframe
              title="Meta Ad Preview"
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-same-origin"
              className="mt-3 h-[420px] w-full rounded-lg border border-slate-200 bg-white"
            />
          ) : (
            <div className="mt-3 flex h-52 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              {details.ad.facebookAdId
                ? "اضغط تحميل المعاينة لعرض شكل الإعلان من Meta."
                : "المعاينة تحتاج Facebook Ad ID."}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-black text-slate-950">
            صحة التتبع والربط
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            <HealthLine
              ok={Boolean(details.ad.facebookAdId)}
              label="Facebook Ad ID"
              value={details.ad.facebookAdId || "غير مربوط"}
            />
            <HealthLine
              ok={Boolean(details.campaign.pixelId)}
              label="Pixel"
              value={details.campaign.pixelId || "غير مسجل محلياً"}
            />
            <HealthLine
              ok={summary.purchases > 0 || summary.spend === 0}
              label="Purchase Event"
              value={
                summary.purchases > 0
                  ? `${formatNumber(summary.purchases)} حدث شراء`
                  : "لا يوجد Purchase في الفترة"
              }
            />
            <HealthLine
              ok={Boolean(details.ad.lastSyncAt)}
              label="آخر مزامنة"
              value={
                details.ad.lastSyncAt
                  ? new Date(details.ad.lastSyncAt).toLocaleString("ar-EG")
                  : "غير متاح"
              }
            />
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            أي قرار إيقاف/توسيع يعتمد على صحة Purchase وCAPI؛ لو التتبع ناقص،
            ROAS وCPA ممكن يضللوا القرار.
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoLine = ({ label, value }: { label: string; value?: string }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <p className="mt-1 truncate text-sm font-bold text-slate-900">
      {value || "غير متاح"}
    </p>
  </div>
);

const QualityLine = ({
  label,
  value,
}: {
  label: string;
  value?: string;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <span className="text-xs font-bold text-slate-500">{label}</span>
    <span className="text-sm font-black text-slate-900">
      {value || "غير متاح"}
    </span>
  </div>
);

const HealthLine = ({
  ok,
  label,
  value,
}: {
  ok: boolean;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
    {ok ? (
      <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
    ) : (
      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
    )}
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

export default AdDetails;
