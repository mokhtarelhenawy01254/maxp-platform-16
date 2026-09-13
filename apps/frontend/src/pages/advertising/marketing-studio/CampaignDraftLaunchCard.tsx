import React, { useState } from "react";
import {
  Rocket,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  CheckCircle2,
  Edit3,
  Globe,
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  Share2,
  Package,
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
  const [isEditing, setIsEditing] = useState(false);

  // Editable local fields
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [dailyBudget, setDailyBudget] = useState(350);

  // Hermes learned rules
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
    toast.success("تم تحديث قاعدة الأمان");
  };

  // Fallback sample draft if none generated yet
  const effectiveDraft: MarketingCampaignDraft = draft || {
    id: "sample_draft_1",
    productName: selectedProduct?.name || "منتج المتجر",
    angleTitle: "عرض القيمة المباشر مع شحن سريع",
    headline: "العرض الأقوى لفترة محدودة ⚡",
    primaryText:
      "احصل على المنتج الأصلي بأعلى جودة مع معاينة مجانية قبل الاستلام والدفع عند الباب! اطلب الآن قبل نفاد الكمية المتاحة في المخزون.",
    callToAction: "SHOP_NOW",
    budgetAmount: 350,
    currency: "EGP",
    targetAudience: "مصر • 22 - 45 سنة • مهتمون بالتسوق أونلاين",
    format: "Feed / Reels 9:16",
    destinationUrl: selectedProduct?.slug
      ? `https://swan.maxp.online/product/${selectedProduct.slug}`
      : "https://swan.maxp.online",
    status: "DRAFT",
  };

  // Sync edits
  const currentPrimaryText = primaryText || effectiveDraft.primaryText;
  const currentHeadline = headline || effectiveDraft.headline;
  const currentBudget = dailyBudget || effectiveDraft.budgetAmount;

  const handleLaunch = async () => {
    setPublishing(true);
    try {
      const res = await publishAiDraft(effectiveDraft.id);
      if (res.success) {
        toast.success("🚀 تم إطلاق الحملة الإعلانية بنجاح إلى Meta Ads!");
        if (onDraftPublished) onDraftPublished(effectiveDraft.id);
      } else {
        toast.error(res.error || "تعذّر نشر الحملة إلى فيسبوك");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الاتصال بمنصة Meta");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            معاينة الإعلان الفعلي (Meta Ad Mockup)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2.5 py-1 text-xs rounded-lg font-semibold flex items-center gap-1 transition ${
              isEditing
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <Edit3 className="w-3 h-3" />
            {isEditing ? "حفظ التعديل" : "تعديل المسودة"}
          </button>
        </div>
      </div>

      {/* Body: Realistic Meta Ad Canvas */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Realistic Social Ad Card */}
        <div className="max-w-md mx-auto bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden text-right">
          {/* Post Header */}
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                MaxP
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  متجر المتجر الرسمي
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
                </h4>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  إعلان ممول • Sponsored <Globe className="w-2.5 h-2.5" />
                </p>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </div>

          {/* Primary Text */}
          <div className="px-3 pb-2.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
            {isEditing ? (
              <textarea
                value={currentPrimaryText}
                onChange={(e) => setPrimaryText(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-blue-400 dark:border-blue-600 bg-blue-50/20 dark:bg-blue-950/30 focus:outline-none"
                rows={3}
              />
            ) : (
              <p className="whitespace-pre-line">{currentPrimaryText}</p>
            )}
          </div>

          {/* Visual Media Canvas */}
          <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center border-y border-slate-100 dark:border-slate-800">
            {selectedProduct?.mainImage ? (
              <img
                src={selectedProduct.mainImage}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <span className="text-xs text-slate-400 font-medium">
                  {selectedProduct?.name || "صورة المنتج الإعلانية"}
                </span>
              </div>
            )}

            {/* Live Angle Pill */}
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1">
              <span>🎯 {effectiveDraft.angleTitle}</span>
            </div>
          </div>

          {/* Ad Footer Bar (Destination & Headline & CTA) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block truncate">
                {effectiveDraft.destinationUrl?.replace("https://", "") || "SWAN.MAXP.ONLINE"}
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={currentHeadline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full p-1 text-xs font-bold rounded border border-blue-400 bg-white dark:bg-slate-950 mt-1"
                />
              ) : (
                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                  {currentHeadline}
                </h5>
              )}
            </div>

            <button
              type="button"
              className="px-3.5 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold whitespace-nowrap transition flex-shrink-0"
            >
              تسوق الآن
            </button>
          </div>

          {/* Social Reactions Bar Mock */}
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5 text-blue-500" /> أعجبني
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> تعليق
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" /> مشاركة
            </span>
          </div>
        </div>

        {/* Campaign Parameters & Budget Bar */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              إعدادات الإطلاق
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {effectiveDraft.targetAudience}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              الميزانية اليومية المقترحة:
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={currentBudget}
                onChange={(e) => setDailyBudget(Number(e.target.value))}
                className="w-20 py-1 px-2 text-xs font-black text-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 focus:outline-none"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ج.م / يومياً
              </span>
            </div>
          </div>
        </div>

        {/* Hermes Learned Safety Rules */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              قواعد أمان المتجر (هرمز)
            </span>
            <span className="text-[10px] text-slate-400">تلقائية</span>
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
                className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 cursor-pointer hover:border-slate-300 transition"
              >
                <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
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

      {/* Action Footer: Launch Now */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={handleLaunch}
          disabled={publishing}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {publishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري النشر إلى Meta Ads...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              إطلاق الحملة الآن إلى Meta Ads
            </>
          )}
        </button>
      </div>
    </div>
  );
};
