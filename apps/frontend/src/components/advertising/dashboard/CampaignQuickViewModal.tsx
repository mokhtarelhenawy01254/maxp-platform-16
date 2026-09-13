/**
 * CampaignQuickViewModal
 *
 * شاشة منبثقة تفاعلية وسريعة لملخص الحملة، تشخيص نقاط الضعف،
 * والتعديل الفوري للاسم والميزانية والحالة دون مغادرة لوحة الإعلانات.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  X,
  Check,
  Loader2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  ExternalLink,
  Copy,
  CheckCheck,
  BarChart3,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  facebookAdsService,
  type FacebookCampaign,
  type FacebookAdsPerformanceTotals,
  type FacebookCampaignInsightsResponse,
  CAMPAIGN_OBJECTIVES,
} from "../../../services/facebookAdsService";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  getCampaignDeliveryBadge,
  getCampaignDeliveryLabel,
  getCampaignEffectiveStatus,
  isCampaignDelivering,
  getRoasColor,
  getRoasBg,
} from "../../../utils/facebookAdsHelpers";

interface CampaignQuickViewModalProps {
  isOpen: boolean;
  campaign: FacebookCampaign | null;
  performance?: FacebookAdsPerformanceTotals | null;
  selectedCurrency: string;
  selectedAdAccountId: string;
  onClose: () => void;
  onCampaignUpdated?: (updatedCampaign: FacebookCampaign) => void;
}

type TabType = "summary" | "weaknesses" | "structure";

interface DiagnosedWeakness {
  id: string;
  severity: "critical" | "warning" | "opportunity";
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  metricLabel?: string;
  metricValue?: string;
  actionLabel?: string;
  actionLabelEn?: string;
  action?: () => void;
}

export const CampaignQuickViewModal: React.FC<CampaignQuickViewModalProps> = ({
  isOpen,
  campaign,
  performance,
  selectedCurrency,
  selectedAdAccountId,
  onClose,
  onCampaignUpdated,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [fullCampaign, setFullCampaign] = useState<FacebookCampaign | null>(null);
  const [liveInsights, setLiveInsights] = useState<FacebookCampaignInsightsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Editable fields
  const [campaignName, setCampaignName] = useState("");
  const [budgetType, setBudgetType] = useState<"DAILY" | "LIFETIME">("DAILY");
  const [budgetAmount, setBudgetAmount] = useState<number>(0);
  const [campaignStatus, setCampaignStatus] = useState<string>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Sync initial campaign data
  useEffect(() => {
    if (!campaign) return;
    setCampaignName(campaign.name || "");
    setBudgetType(campaign.budgetType || "DAILY");
    setBudgetAmount(campaign.budgetAmount || 0);
    setCampaignStatus(getCampaignEffectiveStatus(campaign));
    setFullCampaign(campaign);
    setActiveTab("summary");
  }, [campaign]);

  // Load deep campaign details and live insights asynchronously
  const fetchDeepDetails = useCallback(async () => {
    if (!campaign?.id) return;
    setLoadingDetails(true);
    try {
      const [campaignData, insightsData] = await Promise.allSettled([
        facebookAdsService.getCampaign(campaign.id),
        facebookAdsService.getCampaignInsights(campaign.id),
      ]);

      if (campaignData.status === "fulfilled" && campaignData.value?.id) {
        setFullCampaign(campaignData.value);
        if (campaignData.value.name) setCampaignName(campaignData.value.name);
        if (campaignData.value.budgetType) setBudgetType(campaignData.value.budgetType);
        if (campaignData.value.budgetAmount !== undefined) setBudgetAmount(campaignData.value.budgetAmount);
        setCampaignStatus(getCampaignEffectiveStatus(campaignData.value));
      }

      if (insightsData.status === "fulfilled" && insightsData.value) {
        setLiveInsights(insightsData.value);
      }
    } catch (err) {
      console.error("Error fetching deep campaign details:", err);
    } finally {
      setLoadingDetails(false);
    }
  }, [campaign?.id]);

  useEffect(() => {
    if (isOpen && campaign?.id) {
      fetchDeepDetails();
    }
  }, [isOpen, campaign?.id, fetchDeepDetails]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const activeCampaign = fullCampaign || campaign;

  // Resolved metrics: prefer live insights totals if available, else passed performance summary
  const metrics: FacebookAdsPerformanceTotals = useMemo(() => {
    if (liveInsights?.totals) {
      return {
        spend: liveInsights.totals.spend || 0,
        impressions: liveInsights.totals.impressions || 0,
        clicks: liveInsights.totals.clicks || 0,
        ctr: liveInsights.totals.ctr || 0,
        cpc: liveInsights.totals.cpc || 0,
        cpa: liveInsights.totals.cpa || 0,
        roas: liveInsights.totals.roas || 0,
        purchases: liveInsights.totals.purchases || 0,
        purchaseValue: liveInsights.totals.purchaseValue || 0,
        frequency: liveInsights.totals.frequency || 0,
      };
    }
    return (
      performance || {
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
        purchases: 0,
        purchaseValue: 0,
        frequency: 0,
      }
    );
  }, [liveInsights?.totals, performance]);

  const deliveryBadgeClass = activeCampaign ? getCampaignDeliveryBadge(activeCampaign) : "";
  const deliveryLabel = activeCampaign ? getCampaignDeliveryLabel(activeCampaign) : "";
  const isDelivering = activeCampaign ? isCampaignDelivering(activeCampaign) : false;
  const objectiveLabel = activeCampaign
    ? CAMPAIGN_OBJECTIVES.find((o) => o.value === activeCampaign.objective)?.label ||
      activeCampaign.objective
    : "";

  const handleCopyMetaId = () => {
    if (!activeCampaign?.facebookCampaignId) return;
    navigator.clipboard.writeText(activeCampaign.facebookCampaignId);
    setCopiedId(true);
    toast.success(isEn ? "Meta Campaign ID copied" : "تم نسخ معرّف الحملة على Meta");
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Toggle status immediately with optimistic update
  const handleToggleStatus = async () => {
    if (!activeCampaign) return;
    const isCurrentlyActive = campaignStatus === "ACTIVE";
    const nextStatus = isCurrentlyActive ? "PAUSED" : "ACTIVE";
    setTogglingStatus(true);
    setCampaignStatus(nextStatus);

    try {
      if (isCurrentlyActive) {
        await facebookAdsService.pauseCampaign(activeCampaign.id);
        toast.success(
          isEn
            ? `Campaign "${activeCampaign.name}" paused`
            : `تم إيقاف حملة "${activeCampaign.name}" بنجاح`,
        );
      } else {
        await facebookAdsService.resumeCampaign(activeCampaign.id);
        toast.success(
          isEn
            ? `Campaign "${activeCampaign.name}" activated`
            : `تم تنشيط حملة "${activeCampaign.name}" بنجاح`,
        );
      }
      const updated = {
        ...activeCampaign,
        status: nextStatus as any,
        effectiveStatus: nextStatus,
        configuredStatus: nextStatus,
      };
      setFullCampaign(updated);
      onCampaignUpdated?.(updated);
    } catch (err) {
      setCampaignStatus(isCurrentlyActive ? "ACTIVE" : "PAUSED");
      toast.error(isEn ? "Failed to update campaign status" : "فشل تغيير حالة الحملة على Meta");
    } finally {
      setTogglingStatus(false);
    }
  };

  // Save all campaign edits (Name, Budget Type, Budget Amount)
  const handleSaveChanges = async () => {
    if (!activeCampaign) return;
    if (!campaignName.trim()) {
      toast.error(isEn ? "Campaign name cannot be empty" : "اسم الحملة لا يمكن أن يكون فارغاً");
      return;
    }
    if (budgetAmount <= 0) {
      toast.error(isEn ? "Please enter a valid budget" : "يرجى تحديد ميزانية صالحة أكبر من صفر");
      return;
    }

    setSaving(true);
    try {
      const updatedData = await facebookAdsService.updateCampaign(activeCampaign.id, {
        name: campaignName.trim(),
        budgetType,
        budgetAmount,
      });

      const updated = {
        ...activeCampaign,
        name: campaignName.trim(),
        budgetType,
        budgetAmount,
        ...(updatedData || {}),
      };

      setFullCampaign(updated);
      onCampaignUpdated?.(updated);
      toast.success(isEn ? "Campaign updated successfully" : "تم حفظ تعديلات الحملة بنجاح ومزامنتها");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          (isEn ? "Failed to save campaign updates" : "حدث خطأ أثناء حفظ تعديلات الحملة"),
      );
    } finally {
      setSaving(false);
    }
  };

  // Budget quick adjustments
  const applyBudgetPercent = (percent: number) => {
    const current = budgetAmount || 100;
    const next = Math.max(10, Math.round(current * (1 + percent / 100)));
    setBudgetAmount(next);
  };

  // ─────────────────────────────────────────────────────────────
  // Diagnostic Engine: Comprehensive Weakness Analysis ("نقاط الضعف")
  // ─────────────────────────────────────────────────────────────
  const weaknesses: DiagnosedWeakness[] = useMemo(() => {
    if (!activeCampaign) return [];
    const list: DiagnosedWeakness[] = [];
    const adSetsCount =
      activeCampaign.adSets?.length ??
      activeCampaign.deliveryReadiness?.counts?.adSetsTotal ??
      0;

    // 1. Critical Bleed: Significant spend without any purchases
    if (metrics.spend >= 120 && metrics.purchases === 0) {
      list.push({
        id: "spend-without-purchases",
        severity: "critical",
        title: "نزيف ميزانية حرج (إنفاق بدون مبيعات)",
        titleEn: "Critical Budget Bleed (Spend without Purchases)",
        description:
          "تم إنفاق ميزانية معتبرة دون تسجيل أي طلب شراء. افحص تتبع حدث الشراء في البيكسل، سرعة صفحة الهبوط، وتناسق العرض التسويقي.",
        descriptionEn:
          "Significant ad spend recorded with zero purchases. Verify Purchase Pixel tracking, page load speed, and checkout flow.",
        metricLabel: isEn ? "Spent" : "الإنفاق المهدور",
        metricValue: formatCurrency(metrics.spend, selectedCurrency),
        actionLabel: isEn ? "Pause Campaign" : "إيقاف الحملة مؤقتاً للحد من الخسارة",
        actionLabelEn: "Pause Campaign",
        action: () => handleToggleStatus(),
      });
    }

    // 2. Delivery Blocker: Active but not delivering
    if (getCampaignEffectiveStatus(activeCampaign) === "ACTIVE" && !isDelivering) {
      const blockerDetail =
        activeCampaign.deliveryReadiness?.reasonText ||
        activeCampaign.deliveryReadiness?.reasons?.[0]?.label ||
        (adSetsCount === 0
          ? isEn
            ? "No Ad Sets created inside this campaign container."
            : "الحملة فارغة ولا تحتوي على أي مجموعات إعلانية."
          : isEn
          ? "No active ads delivering in active ad sets."
          : "لا توجد إعلانات نشطة مؤهلة للتسليم داخل المجموعات.");

      list.push({
        id: "active-not-delivering",
        severity: "critical",
        title: "الحملة نشطة ولكن لا تسلم إعلانات على Meta",
        titleEn: "Campaign Active but Not Delivering on Meta",
        description: blockerDetail,
        descriptionEn: blockerDetail,
        actionLabel: isEn ? "Create Ad Set" : "إضافة مجموعة إعلانية",
        actionLabelEn: "Add Ad Set",
      });
    }

    // 3. Local unsynced campaign
    if (!activeCampaign.facebookCampaignId) {
      list.push({
        id: "local-only",
        severity: "critical",
        title: "حملة مسودة محلية (غير منشورة على فيسبوك)",
        titleEn: "Local Draft Campaign (Not Published to Meta)",
        description:
          "هذه الحملة مسجلة فقط في النظام المحلي ولم يتم رفعها أو مزامنتها مع خوادم Meta Ads Manager.",
        descriptionEn:
          "This campaign is stored locally and has not been published or linked to Meta Ads Manager yet.",
      });
    }

    // 4. Missing Pixel on conversion/sales campaigns
    if (
      (activeCampaign.objective?.includes("CONVERSIONS") ||
        activeCampaign.objective?.includes("SALES") ||
        activeCampaign.objective?.includes("OUTCOME_SALES")) &&
      !activeCampaign.pixelId
    ) {
      list.push({
        id: "missing-pixel",
        severity: "warning",
        title: "حملة مبيعات بدون ربط بيكسل تتبع (Pixel ID)",
        titleEn: "Sales Campaign Missing Conversion Pixel ID",
        description:
          "هدف الحملة تحويلات ومبيعات ولكن لم يتم ربطها بمعرّف بيكسل محدد، مما يمنع خوارزميات Meta من تحسين توجيه الإعلانات للمشترين الفعليين.",
        descriptionEn:
          "Targeting sales conversions without a linked Meta Pixel ID impedes machine learning optimization.",
      });
    }

    // 5. Creative Hook Weakness: Low CTR
    if (metrics.impressions > 500 && metrics.ctr > 0 && metrics.ctr < 1.0) {
      list.push({
        id: "weak-hook",
        severity: "warning",
        title: "ضعف الـ Hook والجاذبية الأولية (CTR أقل من 1%)",
        titleEn: "Weak Creative Hook (CTR below 1.0%)",
        description:
          "الإعلان يحصل على انطباعات ولكن نسبة النقر منخفضة جداً. هذا يعني أن أول 3 ثوانٍ في الفيديو أو الصورة الرئيسية لا تجذب الجمهور المستهدف.",
        descriptionEn:
          "Impressions are delivering but click-through rate is low. Consider revising the opening 3 seconds of the video or creative thumbnail.",
        metricLabel: "CTR",
        metricValue: formatPercentage(metrics.ctr),
      });
    }

    // 6. Audience Fatigue: High Frequency
    if (metrics.frequency >= 2.8) {
      list.push({
        id: "audience-fatigue",
        severity: "warning",
        title: "إرهاق الجمهور والتشبع الإعلاني (Frequency مرتفع)",
        titleEn: "Audience Fatigue & Saturation (High Frequency)",
        description:
          `معدل التكرار (${formatNumber(metrics.frequency, 1)}x) يشير إلى أن نفس الأشخاص يشاهدون الإعلان عدة مرات، مما يرفع تكلفة الـ CPA ويسبب تجاهل الإعلان. وسّع نطاق الجمهور أو اختبر زاوية تسويقية جديدة.`,
        descriptionEn:
          `Frequency (${formatNumber(metrics.frequency, 1)}x) indicates audience saturation. Broaden target audience or test fresh creatives.`,
        metricLabel: isEn ? "Frequency" : "معدل التكرار",
        metricValue: `${formatNumber(metrics.frequency, 1)}x`,
      });
    }

    // 7. Low / Unprofitable ROAS
    if (metrics.spend >= 100 && metrics.purchases > 0 && metrics.roas > 0 && metrics.roas < 1.4) {
      list.push({
        id: "low-roas",
        severity: "warning",
        title: "عائد إعلاني منخفض أو قريب من الخسارة (ROAS < 1.4x)",
        titleEn: "Unprofitable or Thin ROAS (ROAS < 1.4x)",
        description:
          "العائد الإعلاني الحالي لا يغطي تكلفة المنتج والشحن والتشغيل. يجب إعادة مراجعة تسعير العرض أو خفض تكلفة الإجراء CPA.",
        descriptionEn:
          "Current ROAS is below healthy margin thresholds. Re-evaluate product pricing bundles or optimize conversion cost.",
        metricLabel: "ROAS",
        metricValue: `${formatNumber(metrics.roas, 2)}x`,
      });
    }

    // 8. Scale Opportunity: High ROAS
    if (metrics.roas >= 2.0 && metrics.purchases >= 2) {
      list.push({
        id: "scale-opportunity",
        severity: "opportunity",
        title: "فرصة توسيع ممتازة (ROAS استثنائي >= 2.0x)",
        titleEn: "Scaling Opportunity (High ROAS >= 2.0x)",
        description:
          "الحملة تحقق أرباحاً ممتازة وتكلفة اكتساب مستقرة. نوصي بزيادة الميزانية تدريجياً بنسبة 15% إلى 20% للاستفادة من الزخم دون إعادة تعلم الخوارزمية.",
        descriptionEn:
          "Strong performance and profitable acquisition. Scale budget vertically by +15-20% to capture volume without resetting learning phase.",
        metricLabel: "ROAS",
        metricValue: `${formatNumber(metrics.roas, 2)}x`,
        actionLabel: isEn ? "Increase Budget by +15%" : "رفع الميزانية +15% فوراً",
        actionLabelEn: "+15% Budget",
        action: () => applyBudgetPercent(15),
      });
    }

    return list;
  }, [activeCampaign, isDelivering, metrics, selectedCurrency, isEn]);

  const criticalWeaknessesCount = weaknesses.filter((w) => w.severity === "critical").length;
  const warningWeaknessesCount = weaknesses.filter((w) => w.severity === "warning").length;

  if (!isOpen || !activeCampaign) return null;

  const fullDetailsUrl = `/advertising/facebook-ads/campaigns/${activeCampaign.id}${
    selectedAdAccountId ? `?adAccountId=${encodeURIComponent(selectedAdAccountId)}` : ""
  }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        dir={isEn ? "ltr" : "rtl"}
      >
        {/* Modal Top Control Bar (Unified Seamless Chassis Header) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 bg-slate-50/70 px-4 py-3 sm:px-6 dark:border-slate-800/90 dark:bg-slate-900/50">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Quick Status Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              title={
                campaignStatus === "ACTIVE"
                  ? isEn
                    ? "Pause Campaign"
                    : "إيقاف الحملة مؤقتاً"
                  : isEn
                  ? "Activate Campaign"
                  : "تنشيط الحملة"
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.97] ${
                campaignStatus === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              {togglingStatus ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                </span>
              ) : (
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    campaignStatus === "ACTIVE"
                      ? isEn
                        ? "translate-x-5"
                        : "-translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              )}
            </button>

            {/* Campaign Title & Meta ID */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={isEn ? "Campaign Name" : "اسم الحملة الإعلانية"}
                  className="w-full max-w-md truncate rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-extrabold text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:text-white dark:hover:border-slate-700 dark:focus:bg-slate-900"
                />
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${deliveryBadgeClass}`}>
                  {deliveryLabel}
                </span>
                {activeCampaign.facebookCampaignId ? (
                  <button
                    type="button"
                    onClick={handleCopyMetaId}
                    title={isEn ? "Copy Meta Campaign ID" : "نسخ معرّف الحملة على Meta"}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <span>ID: {activeCampaign.facebookCampaignId}</span>
                    {copiedId ? <CheckCheck className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
                  </button>
                ) : (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {isEn ? "Local Only" : "مسودة محلية"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Close & Meta Actions */}
          <div className="flex items-center gap-2">
            {activeCampaign.facebookCampaignId && (
              <a
                href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${activeCampaign.metaAccountId || selectedAdAccountId}&selected_campaign_ids=${activeCampaign.facebookCampaignId}`}
                target="_blank"
                rel="noreferrer"
                title={isEn ? "Open in Meta Ads Manager" : "فتح في مدير إعلانات Meta"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-slate-200/80 bg-white px-4 pt-2 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              activeTab === "summary"
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>{isEn ? "Overview & Telemetry" : "الملخص والمؤشرات المالية"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("weaknesses")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              activeTab === "weaknesses"
                ? "border-amber-600 text-amber-600 dark:border-amber-500 dark:text-amber-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>{isEn ? "Weakness & Audit" : "نقاط الضعف والتشخيص"}</span>
            {criticalWeaknessesCount > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                {criticalWeaknessesCount}
              </span>
            ) : warningWeaknessesCount > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                {warningWeaknessesCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("structure")}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
              activeTab === "structure"
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>{isEn ? "Ad Sets & Creatives" : "الهيكل والمجموعات"}</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {activeCampaign.adSets?.length || 0}
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: Summary & Performance */}
          {activeTab === "summary" && (
            <div className="space-y-5">
              {/* Quick Budget Editing Bar */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isEn ? "Budget Configuration:" : "إعداد الميزانية الحالية:"}
                    </span>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-bold dark:border-slate-800 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => setBudgetType("DAILY")}
                        className={`rounded-md px-2 py-1 transition-all ${
                          budgetType === "DAILY"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        {isEn ? "Daily" : "يومية"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetType("LIFETIME")}
                        className={`rounded-md px-2 py-1 transition-all ${
                          budgetType === "LIFETIME"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        {isEn ? "Lifetime" : "إجمالية"}
                      </button>
                    </div>
                  </div>

                  {/* Budget Input & Fast Scaling Pills */}
                  <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
                    <div className="flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-900">
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(Number(e.target.value) || 0)}
                        className="w-24 border-0 bg-transparent text-end text-xs font-black tabular-nums text-slate-900 outline-none dark:text-white"
                      />
                      <span className="ms-1 text-slate-500 font-semibold">{selectedCurrency}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyBudgetPercent(15)}
                      title={isEn ? "Scale +15%" : "زيادة الميزانية +15%"}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      +15%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBudgetPercent(25)}
                      title={isEn ? "Scale +25%" : "زيادة الميزانية +25%"}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      +25%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBudgetPercent(-20)}
                      title={isEn ? "Trim -20%" : "خفض الميزانية -20%"}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                    >
                      -20%
                    </button>
                  </div>
                </div>
              </div>

              {/* Bento Grid: Performance Telemetry (8 Cards) */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {/* Spend */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {isEn ? "Total Spend" : "إجمالي الإنفاق"}
                  </span>
                  <div className="mt-1 text-base font-black tabular-nums text-slate-900 dark:text-white" dir="ltr">
                    {formatCurrency(metrics.spend, selectedCurrency)}
                  </div>
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    {budgetType === "DAILY" ? (isEn ? "Daily cap" : "ميزانية يومية") : (isEn ? "Lifetime cap" : "ميزانية الحملة")}
                  </span>
                </div>

                {/* Purchases / Revenue */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {isEn ? "Purchases / Sales" : "المبيعات والطلبات"}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1 text-base font-black tabular-nums text-slate-900 dark:text-white" dir="ltr">
                    <span>{formatNumber(metrics.purchases)}</span>
                    <span className="text-xs font-medium text-slate-400">{isEn ? "orders" : "طلب"}</span>
                  </div>
                  <span className="mt-0.5 block text-[10px] tabular-nums text-slate-400" dir="ltr">
                    {formatCurrency(metrics.purchaseValue, selectedCurrency)}
                  </span>
                </div>

                {/* ROAS */}
                <div className={`rounded-xl border p-3 shadow-2xs ${getRoasBg(metrics.roas)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">ROAS</span>
                    {metrics.roas >= 2 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    ) : metrics.roas > 0 && metrics.roas < 1.2 ? (
                      <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                    ) : null}
                  </div>
                  <div className={`mt-1 text-base font-black tabular-nums ${getRoasColor(metrics.roas)}`} dir="ltr">
                    {formatNumber(metrics.roas, 2)}x
                  </div>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">
                    {metrics.roas >= 2
                      ? isEn
                        ? "Profitable • Scaling ready"
                        : "مربح جداً • جاهز للتوسيع"
                      : metrics.roas >= 1
                      ? isEn
                        ? "Stable • Monitor CPA"
                        : "مستقر • راقب CPA"
                      : isEn
                      ? "Bleed • Review offer"
                      : "نزيف • راقب تكلفة الشراء"}
                  </span>
                </div>

                {/* CPA */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {isEn ? "Cost Per Acquisition (CPA)" : "تكلفة الطلب (CPA)"}
                  </span>
                  <div className="mt-1 text-base font-black tabular-nums text-slate-900 dark:text-white" dir="ltr">
                    {metrics.purchases > 0
                      ? formatCurrency(metrics.cpa, selectedCurrency)
                      : isEn
                      ? "No sales yet"
                      : "لا مبيعات بعد"}
                  </div>
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    {isEn ? "Per converted order" : "لكل طلب مكتمل"}
                  </span>
                </div>

                {/* CTR (Hook Strength) */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {isEn ? "CTR (Hook Strength)" : "معدل النقر CTR (قوة الـ Hook)"}
                  </span>
                  <div className="mt-1 text-base font-black tabular-nums text-slate-900 dark:text-white" dir="ltr">
                    {formatPercentage(metrics.ctr)}
                  </div>
                  <span
                    className={`mt-0.5 block text-[10px] font-bold ${
                      metrics.ctr >= 1.5
                        ? "text-emerald-600"
                        : metrics.ctr > 0 && metrics.ctr < 1.0
                        ? "text-amber-600"
                        : "text-slate-400"
                    }`}
                  >
                    {metrics.ctr >= 1.5
                      ? isEn
                        ? "Strong hook"
                        : "محتوى جذاب جداً"
                      : metrics.ctr > 0 && metrics.ctr < 1.0
                      ? isEn
                        ? "Weak opening hook"
                        : "بداية إعلان ضعيفة"
                      : isEn
                      ? "Average engagement"
                      : "تفاعل طبيعي"}
                  </span>
                </div>

                {/* Frequency (Audience Saturation) */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {isEn ? "Frequency (Saturation)" : "معدل التكرار (التشبع)"}
                  </span>
                  <div className="mt-1 text-base font-black tabular-nums text-slate-900 dark:text-white" dir="ltr">
                    {formatNumber(metrics.frequency || 1, 1)}x
                  </div>
                  <span
                    className={`mt-0.5 block text-[10px] font-bold ${
                      metrics.frequency >= 2.8
                        ? "text-amber-600"
                        : "text-slate-400"
                    }`}
                  >
                    {metrics.frequency >= 2.8
                      ? isEn
                        ? "Audience saturated"
                        : "الجمهور تشبع بالإعلان"
                      : isEn
                      ? "Fresh audience"
                      : "جمهور متجدد"}
                  </span>
                </div>

                {/* Impressions */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {isEn ? "Impressions" : "الانطباعات (الظهور)"}
                  </span>
                  <div className="mt-1 text-base font-black tabular-nums text-slate-900 dark:text-white" dir="ltr">
                    {formatNumber(metrics.impressions)}
                  </div>
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    {isEn ? "Total ad deliveries" : "مرات ظهور الإعلانات"}
                  </span>
                </div>

                {/* Clicks & CPC */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {isEn ? "Clicks / CPC" : "النقرات / تكلفة النقرة"}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1 text-base font-black tabular-nums text-slate-900 dark:text-white" dir="ltr">
                    <span>{formatNumber(metrics.clicks)}</span>
                    <span className="text-xs font-medium text-slate-400">
                      ({formatCurrency(metrics.cpc, selectedCurrency)})
                    </span>
                  </div>
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    {isEn ? "Link clicks to store" : "نقرات رابط المتجر"}
                  </span>
                </div>
              </div>

              {/* Metadata Sub-Bar */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800/80 dark:bg-slate-900/30">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <span className="block text-[11px] text-slate-400">{isEn ? "Objective" : "الهدف الإعلاني"}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{objectiveLabel}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">{isEn ? "Linked Pixel" : "بيكسل التتبع"}</span>
                    <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                      {activeCampaign.pixelId || (isEn ? "None linked" : "غير مربوط")}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">{isEn ? "Start Date" : "تاريخ البدء"}</span>
                    <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                      {formatDate(activeCampaign.facebookStartTime || activeCampaign.startDate || activeCampaign.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">{isEn ? "Last Sync" : "آخر مزامنة"}</span>
                    <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                      {formatDate(activeCampaign.facebookUpdatedTime || activeCampaign.lastSyncAt || activeCampaign.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Intelligent Weakness Diagnostics ("نقاط الضعف") */}
          {activeTab === "weaknesses" && (
            <div className="space-y-4">
              {/* Weakness Audit Banner */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {isEn ? "AI Audit & Diagnostic Engine" : "فحص وتشخيص نقاط الضعف والمخاطر الإعلانية"}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isEn
                          ? "Automated audit inspecting bleed, delivery readiness, hook strength, and audience fatigue."
                          : "فحص ذكي مباشر لكشف نزيف الميزانية، عوائق التسليم، ضعف المحتوى الإعلاني، وتشبع الجمهور."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {criticalWeaknessesCount > 0 && (
                      <span className="rounded-md bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-950/40 dark:text-red-200">
                        {criticalWeaknessesCount} {isEn ? "Critical" : "حرجة"}
                      </span>
                    )}
                    {warningWeaknessesCount > 0 && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        {warningWeaknessesCount} {isEn ? "Warnings" : "تحذيرات"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Weaknesses List */}
              {weaknesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-8 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <Check className="h-5 w-5" />
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    {isEn ? "No Critical Weaknesses Detected" : "لا توجد نقاط ضعف حرجة مكتشفة"}
                  </h4>
                  <p className="mt-1 max-w-md text-xs text-emerald-700 dark:text-emerald-300">
                    {isEn
                      ? "Campaign delivery status, pacing, and basic conversion telemetry are stable and performing within healthy ranges."
                      : "أداء الحملة، ومعدلات النقر، وحالة التسليم مستقرة وتعمل ضمن الحدود الطبيعية."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {weaknesses.map((w) => {
                    const isCritical = w.severity === "critical";
                    const isOpportunity = w.severity === "opportunity";

                    return (
                      <div
                        key={w.id}
                        className={`rounded-xl border p-4 transition-all ${
                          isCritical
                            ? "border-red-200 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20"
                            : isOpportunity
                            ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                            : "border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                                isCritical
                                  ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300"
                                  : isOpportunity
                                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300"
                              }`}
                            >
                              {isCritical ? (
                                <AlertCircle className="h-4 w-4" />
                              ) : isOpportunity ? (
                                <Sparkles className="h-4 w-4" />
                              ) : (
                                <AlertTriangle className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="text-xs font-black text-slate-900 dark:text-white">
                                  {isEn ? w.titleEn : w.title}
                                </h5>
                                {w.metricLabel && w.metricValue && (
                                  <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-700 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
                                    {w.metricLabel}: {w.metricValue}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                {isEn ? w.descriptionEn : w.description}
                              </p>
                            </div>
                          </div>

                          {/* Quick Fix Button if available */}
                          {w.action && (
                            <button
                              type="button"
                              onClick={w.action}
                              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold shadow-2xs transition-all active:scale-[0.97] ${
                                isOpportunity
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-red-600 text-white hover:bg-red-700"
                              }`}
                            >
                              {isEn ? w.actionLabelEn || "Apply" : w.actionLabel || "تطبيق"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Structure & Ad Sets */}
          {activeTab === "structure" && (
            <div className="space-y-4">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="mt-2 text-xs">{isEn ? "Loading ad sets structure..." : "جاري تحميل تفاصيل المجموعات الإعلانية..."}</span>
                </div>
              ) : !activeCampaign.adSets || activeCampaign.adSets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
                  <Layers className="h-8 w-8 text-slate-400" />
                  <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    {isEn ? "No Ad Sets in this Campaign" : "لا توجد مجموعات إعلانية في هذه الحملة"}
                  </h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    {isEn
                      ? "A campaign requires at least one active Ad Set and Ad creative to start delivering impressions on Meta."
                      : "تحتاج الحملة إلى مجموعة إعلانية واحدة وإعلان نشط على الأقل لتبدأ بالظهور والتسليم الفعلي."}
                  </p>
                  <Link
                    to={`/advertising/facebook-ads/campaigns/${activeCampaign.id}/adsets/create${
                      selectedAdAccountId ? `?adAccountId=${encodeURIComponent(selectedAdAccountId)}` : ""
                    }`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
                  >
                    <span>{isEn ? "Create First Ad Set" : "إنشاء أول مجموعة إعلانية"}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeCampaign.adSets.map((adSet, idx) => (
                    <div
                      key={adSet.id || idx}
                      className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {adSet.name}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                                adSet.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {adSet.status === "ACTIVE" ? (isEn ? "Active" : "نشط") : (isEn ? "Paused" : "متوقف")}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                            {adSet.budgetAmount > 0 && (
                              <span className="font-semibold" dir="ltr">
                                {formatCurrency(adSet.budgetAmount, selectedCurrency)} ({adSet.budgetType})
                              </span>
                            )}
                            {adSet.ads && (
                              <>
                                <span>•</span>
                                <span>
                                  {adSet.ads.length} {isEn ? "creatives" : "إعلانات"}
                                </span>
                              </>
                            )}
                            {adSet.ageMin && adSet.ageMax && (
                              <>
                                <span>•</span>
                                <span>
                                  {adSet.ageMin}-{adSet.ageMax} {isEn ? "yo" : "سنة"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {adSet.facebookAdSetId && (
                          <span className="text-[10px] font-semibold tabular-nums text-slate-400" dir="ltr">
                            ID: {adSet.facebookAdSetId}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls (Save Changes & Full Page Navigation) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 bg-slate-50/70 px-4 py-3 sm:px-6 dark:border-slate-800/90 dark:bg-slate-900/50">
          <Link
            to={fullDetailsUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <span>{isEn ? "Open Full Campaign Studio Page" : "الانتقال لصفحة استوديو الحملة الكاملة"}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              {isEn ? "Close" : "إغلاق"}
            </button>

            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{isEn ? "Saving..." : "جاري الحفظ..."}</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{isEn ? "Save Changes" : "حفظ التعديلات"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignQuickViewModal;
