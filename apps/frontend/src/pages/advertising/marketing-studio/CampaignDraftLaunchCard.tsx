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
  Package,
  ChevronDown,
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
  const [showRules, setShowRules] = useState(false);

  // Editable local fields
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [dailyBudget, setDailyBudget] = useState(350);

  // Hermes safety rules
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

  // Fallback sample draft
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
      {/* Compact Top Header */}
      <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          معاينة الإعلان الفعلي (Meta Mockup)
        </span>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={`px-2 py-0.5 text-[11px] rounded-lg font-semibold flex items-center gap-1 transition ${
            isEditing
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          <Edit3 className="w-3 h-3" />
          {isEditing ? "حفظ التعديل" : "تعديل"}
        </button>
      </div>

      {/* Main Body: Structured to fit Laptop screens seamlessly */}
      <div className="flex-1 flex flex-col min-h-0 p-3 overflow-y-auto space-y-2.5">
        {/* Ad Mockup Card (Full width, no dead margin) */}
        <div className="w-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-right flex flex-col">
          {/* Post Header */}
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm flex-shrink-0">
                MaxP
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 truncate">
                  متجر المتجر الرسمي
                  <CheckCircle2 className="w-3 h-3 text-blue-500 fill-blue-500/20 flex-shrink-0" />
                </h4>
                <p className="text-[9.5px] text-slate-400 flex items-center gap-1 leading-none">
                  إعلان ممول • Sponsored <Globe className="w-2.5 h-2.5" />
                </p>
              </div>
            </div>
            <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Primary Text */}
          <div className="px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            {isEditing ? (
              <textarea
                value={currentPrimaryText}
                onChange={(e) => setPrimaryText(e.target.value)}
                className="w-full p-1.5 text-xs rounded border border-blue-400 dark:border-blue-600 bg-blue-50/20 dark:bg-blue-950/30 focus:outline-none"
                rows={2}
              />
            ) : (
              <p className="line-clamp-2 hover:line-clamp-none transition-all cursor-pointer text-[11.5px]" title="اضغط للتوسيع">
                {currentPrimaryText}
              </p>
            )}
          </div>

          {/* Media Canvas: Ergonomic responsive height */}
          <div className="relative h-40 sm:h-44 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center flex-shrink-0 border-y border-slate-100 dark:border-slate-800">
            {selectedProduct?.mainImage ? (
              <img
                src={selectedProduct.mainImage}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-2">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 font-medium">
                  {selectedProduct?.name || "صورة المنتج"}
                </span>
              </div>
            )}

            {/* Live Angle Pill */}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[9.5px] font-semibold flex items-center gap-1">
              <span>🎯 {effectiveDraft.angleTitle}</span>
            </div>
          </div>

          {/* Ad Footer Bar (Destination + Headline + Shop CTA) */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-2 flex-shrink-0">
            <div className="min-w-0 flex-1">
              <span className="text-[9.5px] text-slate-400 uppercase tracking-wider block truncate">
                {effectiveDraft.destinationUrl?.replace("https://", "") || "SWAN.MAXP.ONLINE"}
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={currentHeadline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full p-1 text-xs font-bold rounded border border-blue-400 bg-white dark:bg-slate-950"
                />
              ) : (
                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentHeadline}
                </h5>
              )}
            </div>

            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold whitespace-nowrap flex-shrink-0"
            >
              تسوق الآن
            </button>
          </div>
        </div>

        {/* Collapsible Hermes Safety Rules */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowRules(!showRules)}
            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/50 transition font-bold text-slate-700 dark:text-slate-300"
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              قواعد أمان المتجر (هرمز - 3 نشطة)
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showRules ? "rotate-180" : ""}`} />
          </button>

          {showRules && (
            <div className="p-2.5 pt-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
              {activeRules.map((rule) => (
                <div
                  key={rule.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleRule(rule.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") toggleRule(rule.id);
                  }}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 cursor-pointer hover:border-slate-300 transition"
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
          )}
        </div>
      </div>

      {/* Action Footer: Single-Line Integrated Launch Bar */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 flex-shrink-0">
        {/* Budget Picker */}
        <div className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0">
          <input
            type="number"
            value={currentBudget}
            onChange={(e) => setDailyBudget(Number(e.target.value))}
            className="w-16 text-center text-xs font-black text-emerald-600 dark:text-emerald-400 bg-transparent focus:outline-none"
            title="الميزانية اليومية"
          />
          <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
            ج.م / يوم
          </span>
        </div>

        {/* Launch Button */}
        <button
          type="button"
          onClick={handleLaunch}
          disabled={publishing}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {publishing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>جاري النشر...</span>
            </>
          ) : (
            <>
              <Rocket className="w-3.5 h-3.5" />
              <span>إطلاق الحملة إلى Meta Ads</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
