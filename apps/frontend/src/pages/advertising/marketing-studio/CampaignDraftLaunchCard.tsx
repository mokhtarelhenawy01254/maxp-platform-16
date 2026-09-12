import React, { useState } from "react";
import {
  Rocket,
  Eye,
  CheckCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Send,
  Sliders,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { publishAiDraft } from "../../../services/facebookAdsService";
import type { MarketingCampaignDraft, MarketingProduct } from "./types";

interface CampaignDraftLaunchCardProps {
  draft: MarketingCampaignDraft | null;
  selectedProduct: MarketingProduct | null;
  onDraftPublished?: (draftId: string) => void;
}

export const CampaignDraftLaunchCard: React.FC<CampaignDraftLaunchCardProps> = ({
  draft,
  selectedProduct,
  onDraftPublished,
}) => {
  const [publishing, setPublishing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Hermes learned rules mock / state
  const [activeRules, setActiveRules] = useState([
    {
      id: "scale_rule_1",
      title: "رفع الميزانية 20% كل 48 ساعة عند ROAS >= 2.2",
      enabled: true,
    },
    {
      id: "kill_rule_2",
      title: "إيقاف الحملة إذا أنفقت ضعف سعر البيع دون تحويلات",
      enabled: true,
    },
    {
      id: "fatigue_rule_3",
      title: "استبدال الهوك إذا تخطى التكرار 2.5",
      enabled: true,
    },
  ]);

  const toggleRule = (id: string) => {
    setActiveRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    toast.success("تم تحديث إعداد القاعدة بنجاح");
  };

  const handleLaunch = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      const res = await publishAiDraft(draft.id);
      if (res.success) {
        toast.success("🚀 تم إطلاق الحملة الإعلانية بنجاح إلى Meta!");
        if (onDraftPublished) onDraftPublished(draft.id);
      } else {
        toast.error(res.error || "تعذّر نشر الحملة إلى فيسبوك");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الاتصال بمنصة Meta");
    } finally {
      setPublishing(false);
    }
  };

  // Fallback sample draft if none generated yet
  const currentDraft: MarketingCampaignDraft = draft || {
    id: "sample_draft_1",
    productName: selectedProduct?.name || "ساعة يد ذكية مقاومة للماء",
    angleTitle: "عمر بطارية أسبوع ومقاومة تامة للماء",
    headline: "البطارية اللي مش هتفصل في نص يومك 🔋",
    primaryText:
      "مش محتاج تشحن ساعتك كل يوم! ساعة يد ذكية ببطارية تصمد 7 أيام متواصلة مع مقاومة للمياه، ومعاينة مجانية قبل الاستلام والدفع عند الباب.",
    callToAction: "SHOP_NOW",
    budgetAmount: 350,
    currency: "EGP",
    targetAudience: "مصر (22 - 45 سنة) • مهتمون بالرياضة والإلكترونيات",
    format: "Reels / 9:16 Video",
    destinationUrl: selectedProduct?.slug
      ? `https://swan.maxp.online/product/${selectedProduct.slug}`
      : "https://swan.maxp.online",
    status: "DRAFT",
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              مسودة الإطلاق الفوري
            </h2>
            <p className="text-xs text-slate-500">
              One-Click Meta Launch Ready
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <Clock className="w-3 h-3" /> بانتظار الاعتماد
        </span>
      </div>

      {/* Body: Draft Specifications */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Product & Angle */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              المنتج المستهدف
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
              {currentDraft.format}
            </span>
          </div>
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            {currentDraft.productName}
          </h3>
          <p className="text-blue-600 dark:text-blue-400 font-medium">
            🎯 الزاوية: {currentDraft.angleTitle}
          </p>
        </div>

        {/* Ad Copy Preview */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            النص الإعلاني (Primary Text)
          </span>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            {currentDraft.primaryText}
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            العنوان المقترح (Headline)
          </span>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 font-bold text-slate-900 dark:text-white">
            {currentDraft.headline}
          </div>
        </div>

        {/* Budget & Target */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">
              الميزانية اليومية
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {currentDraft.budgetAmount} {currentDraft.currency}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">
              زر الإجراء (CTA)
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {currentDraft.callToAction}
            </span>
          </div>
        </div>

        {/* Hermes Learned Playbook Section */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> قواعد أمان المتجر (هرمز)
            </span>
            <span className="text-[10px] text-slate-400">تحكم التاجر</span>
          </div>

          <div className="space-y-1.5">
            {activeRules.map((rule) => (
              <div
                key={rule.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleRule(rule.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleRule(rule.id);
                  }
                }}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <span className="text-[10.5px] text-slate-600 dark:text-slate-300 truncate">
                  {rule.title}
                </span>
                <span className="flex-shrink-0">
                  {rule.enabled ? (
                    <ToggleRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-slate-400" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer: One-Click Meta Launch */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 space-y-2">
        <button
          type="button"
          onClick={handleLaunch}
          disabled={publishing}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {publishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري النشر إلى Meta Ads...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              إطلاق الحملة إلى فيسبوك بضغطة زر
            </>
          )}
        </button>

        <p className="text-[10px] text-slate-400 text-center">
          🔒 تتوافق الحملة مع بيكسل المتجر ونظام التحويلات CAPI تلقائياً
        </p>
      </div>
    </div>
  );
};
