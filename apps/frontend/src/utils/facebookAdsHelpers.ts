/**
 * Facebook Ads Shared Helpers
 *
 * Shared formatting, status, and display utilities used across
 * FacebookAdsDashboard, AsyncReports, CampaignDetails, and other
 * advertising surfaces.
 */

import type {
  FacebookCampaign,
  FacebookAdsPerformanceSummary,
  FacebookAdsBudgetAlertRule,
} from "../services/facebookAdsService";

// ─── Status Sets ─────────────────────────────────────────

export const issueDeliveryStatuses = new Set([
  "WITH_ISSUES",
  "DISAPPROVED",
  "PENDING_REVIEW",
  "PREAPPROVED",
]);

export const pausedDeliveryStatuses = new Set([
  "PAUSED",
  "CAMPAIGN_PAUSED",
  "ADSET_PAUSED",
]);

export const archivedDeliveryStatuses = new Set(["ARCHIVED", "DELETED"]);

export const deliveryStatusOrder: Record<string, number> = {
  DELIVERING: 0,
  ACTIVE: 0,
  IN_PROCESS: 1,
  WITH_ISSUES: 2,
  ACTIVE_NOT_DELIVERING: 2,
  PAUSED: 3,
  CAMPAIGN_PAUSED: 4,
  ADSET_PAUSED: 5,
  ARCHIVED: 6,
  DELETED: 7,
};

// ─── Status Helpers ──────────────────────────────────────

export const getCampaignEffectiveStatus = (campaign: {
  effectiveStatus?: string;
  configuredStatus?: string;
  status: string;
}) => campaign.effectiveStatus || campaign.configuredStatus || campaign.status;

export const getCampaignConfiguredStatus = (campaign: {
  configuredStatus?: string;
  status: string;
}) => campaign.configuredStatus || campaign.status;

export const getCampaignDeliveryStatus = (campaign: FacebookCampaign) =>
  campaign.deliveryReadiness?.status || getCampaignEffectiveStatus(campaign);

export const isCampaignDelivering = (campaign: FacebookCampaign) =>
  campaign.deliveryReadiness?.isDeliverable ??
  getCampaignEffectiveStatus(campaign) === "ACTIVE";

export const getDeliveryLabel = (status: string) => {
  const labels: Record<string, string> = {
    DELIVERING: "يسلم فعلياً",
    ACTIVE_NOT_DELIVERING: "نشط لكن لا يسلم",
    ACTIVE: "نشط فعلياً",
    IN_PROCESS: "قيد المعالجة",
    WITH_ISSUES: "به مشاكل",
    PAUSED: "متوقف",
    CAMPAIGN_PAUSED: "متوقف من الحملة",
    ADSET_PAUSED: "متوقف من المجموعة",
    ARCHIVED: "مؤرشف",
    DELETED: "محذوف",
    DISAPPROVED: "مرفوض",
    PENDING_REVIEW: "قيد المراجعة",
  };

  return labels[status] || status;
};

export const getDeliveryBadge = (status: string) => {
  if (status === "DELIVERING" || status === "ACTIVE") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
  }

  if (status === "ACTIVE_NOT_DELIVERING") {
    return "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200";
  }

  if (issueDeliveryStatuses.has(status)) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
  }

  if (pausedDeliveryStatuses.has(status)) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
};

export const getCampaignDeliveryLabel = (campaign: FacebookCampaign) =>
  campaign.deliveryReadiness?.label ||
  getDeliveryLabel(getCampaignDeliveryStatus(campaign));

export const getCampaignDeliveryBadge = (campaign: FacebookCampaign) =>
  getDeliveryBadge(getCampaignDeliveryStatus(campaign));

export const getCampaignDeliverySortRank = (campaign: FacebookCampaign) => {
  const status = getCampaignDeliveryStatus(campaign);
  const baseRank = deliveryStatusOrder[status] ?? 99;

  if (isCampaignDelivering(campaign)) return 0;
  if (getCampaignEffectiveStatus(campaign) === "ACTIVE") return 2;
  return baseRank + 10;
};

export const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    ACTIVE: "نشط",
    PAUSED: "متوقف",
    ARCHIVED: "مؤرشف",
    DELETED: "محذوف",
  };
  return labels[status] || status;
};

// ─── Delivery Filter ─────────────────────────────────────

export type DeliveryFilter =
  | "ALL"
  | "DELIVERING"
  | "PAUSED_OR_OFF"
  | "WITH_ISSUES"
  | "ARCHIVED_DELETED";

export const matchesDeliveryFilter = (
  campaign: FacebookCampaign,
  filter: DeliveryFilter,
) => {
  const effectiveStatus = getCampaignEffectiveStatus(campaign);
  const deliveryStatus = getCampaignDeliveryStatus(campaign);

  if (filter === "ALL") return true;
  if (filter === "DELIVERING") return isCampaignDelivering(campaign);
  if (filter === "WITH_ISSUES")
    return (
      issueDeliveryStatuses.has(effectiveStatus) ||
      issueDeliveryStatuses.has(deliveryStatus)
    );
  if (filter === "PAUSED_OR_OFF")
    return (
      !isCampaignDelivering(campaign) &&
      !issueDeliveryStatuses.has(deliveryStatus) &&
      !archivedDeliveryStatuses.has(effectiveStatus) &&
      !archivedDeliveryStatuses.has(deliveryStatus)
    );
  return (
    archivedDeliveryStatuses.has(effectiveStatus) ||
    archivedDeliveryStatuses.has(deliveryStatus)
  );
};

// ─── Formatting ──────────────────────────────────────────

export const formatCurrency = (value?: number | null, currency = "EGP") => {
  if (value === undefined || value === null) {
    return "غير متاح";
  }

  const num = Number(value);
  if (isNaN(num)) return "0.00 ج.م";

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  const symbol = currency === "EGP" ? "ج.م" : currency;
  return `${formatted} ${symbol}`;
};

export const formatNumber = (value?: number, maximumFractionDigits = 0) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(num);
};

export const formatPercentage = (value?: number) =>
  `${formatNumber(value || 0, 2)}%`;

export const formatDate = (date?: string) => {
  if (!date) return "غير متاح";

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

// ─── Error Handling ──────────────────────────────────────

export const getApiErrorMessage = (error: unknown, fallback: string) => {
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

// ─── ROAS Color Coding ──────────────────────────────────

export const getRoasColor = (roas: number) => {
  if (!roas || roas <= 0) return "text-slate-500 dark:text-slate-400";
  if (roas >= 2) return "text-emerald-600 dark:text-emerald-400";
  if (roas >= 1) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

export const getRoasBg = (roas: number) => {
  if (!roas || roas <= 0)
    return "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800";
  if (roas >= 2)
    return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50";
  if (roas >= 1)
    return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50";
  return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50";
};

// ─── SVG Sparkline ───────────────────────────────────────

export const buildSparklinePath = (
  values: number[],
  width: number,
  height: number,
  padding = 2,
): string => {
  if (values.length < 2) return "";

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;
  const stepX = drawWidth / (values.length - 1);

  const points = values.map((v, i) => {
    const x = padding + i * stepX;
    const y = padding + drawHeight - ((v - min) / range) * drawHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M${points.join("L")}`;
};

// ─── Health & Decision Helpers ───────────────────────────

export const getHealthDecision = (
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

export const getDecisionClass = (tone?: string) => {
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

export const getRulePayload = (
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
