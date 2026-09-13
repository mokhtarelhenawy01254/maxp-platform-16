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
  TrendingUp,
  Target,
  Zap,
  Coins,
  Check,
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
  const [selectedAngleId, setSelectedAngleId] = useState("safety");

  // Media Buyer Strategic Angles for this product
  const marketingAngles = [
    {
      id: "safety",
      title: "الأمان والمعاينة",
      badge: "الأعلى تحويلاً",
      icon: ShieldCheck,
      primaryText: `خايف تطلب كوتشي أونلاين وميطلعش مقاسك أو خامته مش قد التوقع؟ مع متجرنا الرسمي عاين وقيس براحتك مع المندوب قبل ما تدفع قرش واحد! خامات ممتازة ومعاينة مجانية والدفع عند الاستلام. اطلب الآن قبل نفاد الكمية!`,
      headline: "عاين وقيس مع المندوب قبل ما تدفع مليم ⚡",
    },
    {
      id: "comfort",
      title: "الراحة والدوام",
      badge: "للشغل والجامعة",
      icon: Zap,
      primaryText: `لو يومك طويل وبتقف ساعات طويلة في الشغل أو كليتك... نعل طبي ميموري فوم هيريح ضهرك ورجلك طول اليوم بدون أي إرهاق. خفة ومرونة وأناقة تناسب لبسك اليومي!`,
      headline: "خفة وراحة طبية تدوم طول يومك 👟",
    },
    {
      id: "bundle",
      title: "باقة التوفير (اطلب 2)",
      badge: "رفع الـ AOV",
      icon: Package,
      primaryText: `عرض خاص لفترة محدودة! اطلب كوتشي ${selectedProduct?.name || "Dash"}، أو اطلب قطعتين واحصل على خصم إضافي مع شحن مجاني تماماً لجميع المحافظات والدفع عند الباب. الكمية محدودة بالمخزون!`,
      headline: "اطلب 2 واحصل على شحن مجاني فوري 🎁",
    },
  ];

  const activeAngle =
    marketingAngles.find((a) => a.id === selectedAngleId) || marketingAngles[0];

  // Editable local fields (initialized with active angle)
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [dailyBudget, setDailyBudget] = useState(350);

  // Hermes learned rules
  const [activeRules, setActiveRules] = useState([
    {
      id: "scale_rule_1",
      title: "رفع الميزانية 20% كل 48 ساعة عند تحقيق ROAS >= 2.2",
      enabled: true,
    },
    {
      id: "kill_rule_2",
      title: "إيقاف الحملة تلقائياً إذا أنفقت ضعف سعر الشراء المستهدف دون مبيعات",
      enabled: true,
    },
    {
      id: "fatigue_rule_3",
      title: "استبدال الهوك الإعلاني إذا تخطى معدل التكرار 2.5",
      enabled: true,
    },
  ]);

  const toggleRule = (id: string) => {
    setActiveRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    toast.success("تم تحديث قاعدة الأمان");
  };

  // Financial Unit Economics
  const sellingPrice = selectedProduct?.price || 620;
  const costPrice = selectedProduct?.cost || Math.round(sellingPrice * 0.45);
  const profitMargin = Math.round(((sellingPrice - costPrice) / sellingPrice) * 100);
  const targetCpa = Math.round(sellingPrice * 0.25);
  const availableStock = selectedProduct?.stock ?? 42;

  // Sync edits or active angle defaults
  const currentPrimaryText =
    primaryText || draft?.primaryText || activeAngle.primaryText;
  const currentHeadline = headline || draft?.headline || activeAngle.headline;
  const currentBudget = dailyBudget || draft?.budgetAmount || 350;

  const handleSelectAngle = (angleId: string) => {
    setSelectedAngleId(angleId);
    const chosen = marketingAngles.find((a) => a.id === angleId);
    if (chosen) {
      setPrimaryText(chosen.primaryText);
      setHeadline(chosen.headline);
      toast.success(`تم تطبيق زاوية: ${chosen.title}`);
    }
  };

  const handleLaunch = async () => {
    setPublishing(true);
    try {
      const draftIdToPublish = draft?.id || "sample_draft_1";
      const res = await publishAiDraft(draftIdToPublish);
      if (res.success) {
        toast.success("🚀 تم إطلاق الحملة الإعلانية بنجاح إلى Meta Ads!");
        if (onDraftPublished) onDraftPublished(draftIdToPublish);
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
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              غرفة إطلاق الحملة (Meta Ad Studio)
            </h3>
            <p className="text-[10px] text-slate-400">
              معاينة حية وإعدادات ميديا باير متكاملة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={`px-2.5 py-1 text-xs rounded-lg font-semibold flex items-center gap-1 transition ${
            isEditing
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          {isEditing ? "حفظ التعديل" : "تعديل النص"}
        </button>
      </div>

      {/* Body: Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 min-h-0">
        {/* 1. Unit Economics Bar (بوصلة الميديا باير المالية) */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              اقتصاديات المنتج المستهدف
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
              جاهز للإعلان
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] text-slate-400">سعر البيع</span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {sellingPrice} ج.م
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] text-slate-400">سقف تكلفة الطلب (Max CPA)</span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                ~{targetCpa} ج.م
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] text-slate-400">هامش الربح المتوقع</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {profitMargin}%
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] text-slate-400">المخزون المتاح</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                {availableStock} قطعة
              </span>
            </div>
          </div>
        </div>

        {/* 2. Strategic Angles Selector (زوايا البيع الـ 3) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              اختر زاوية البيع والهوك (Marketing Angle)
            </span>
            <span className="text-[10px] text-slate-400">تحديث فوري للمعاينة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {marketingAngles.map((angle) => {
              const isSelected = selectedAngleId === angle.id;
              const IconComp = angle.icon;
              return (
                <button
                  key={angle.id}
                  type="button"
                  onClick={() => handleSelectAngle(angle.id)}
                  className={`p-2.5 rounded-xl text-right transition border flex flex-col justify-between gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs"
                      : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-1.5 font-bold text-xs">
                      <IconComp className="w-3.5 h-3.5 text-blue-600" />
                      {angle.title}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium w-fit">
                    {angle.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Realistic Meta Ad Mockup (المعاينة الحقيقية) */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden text-right">
          {/* Post Header */}
          <div className="p-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
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
          <div className="p-3 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
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

          {/* Creative Media Canvas */}
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

            {/* Live Angle Badge on Image */}
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <span>🎯 زاوية: {activeAngle.title}</span>
            </div>
          </div>

          {/* Ad Footer Bar (Destination + Headline + CTA) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block truncate">
                {selectedProduct?.slug
                  ? `SWAN.MAXP.ONLINE/PRODUCT/${selectedProduct.slug.toUpperCase()}`
                  : "SWAN.MAXP.ONLINE"}
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

          {/* Social Reactions Bar */}
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

        {/* 4. Campaign Parameters & Budget Bar */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              إعدادات الحملة في Meta
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              مصر • رجال 20 - 45 • تسوق أونلاين
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              الميزانية اليومية الموصى بها:
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

        {/* 5. Hermes Safety Rules (حماية الميزانية من الهدر) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              قواعد أمان هرمز (حماية الميزانية)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
              نشطة تلقائياً
            </span>
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
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
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

      {/* 6. Action Footer: One-Click Launch */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <button
          type="button"
          onClick={handleLaunch}
          disabled={publishing}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

export default CampaignDraftLaunchCard;
