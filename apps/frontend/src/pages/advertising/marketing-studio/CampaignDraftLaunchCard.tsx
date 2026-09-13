import React, { useState } from "react";
import {
  Rocket,
  Sparkles,
  Package,
  Target,
  Plus,
  Check,
  Tag,
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

interface MarketingAngleSuggestion {
  id: string;
  name: string;
  generateText: (productName: string) => { primaryText: string; headline: string };
}

export const CampaignDraftLaunchCard: React.FC<CampaignDraftLaunchCardProps> = ({
  draft,
  selectedProduct,
  onDraftPublished,
}) => {
  const [publishing, setPublishing] = useState(false);
  const productName = selectedProduct?.name || "المنتج المحدد";

  // Financial Unit Economics
  const sellingPrice = selectedProduct?.price || 620;
  const costPrice = selectedProduct?.cost || Math.round(sellingPrice * 0.45);
  const profitMargin = Math.round(((sellingPrice - costPrice) / sellingPrice) * 100);
  const targetCpa = Math.round(sellingPrice * 0.25);
  const availableStock = selectedProduct?.stock ?? 42;

  // General Marketing Angles applicable to ANY e-commerce product
  const [angles, setAngles] = useState<MarketingAngleSuggestion[]>([
    {
      id: "safety",
      name: "الأمان والمعاينة قبل الدفع",
      generateText: (name) => ({
        primaryText: `خايف تطلب أونلاين وميطلعش بنفس الجودة أو المواصفات؟ مع متجرنا الرسمي عاين وافحص ${name} براحتك تماماً مع المندوب قبل ما تدفع قرش واحد! جودة مضمونة ومعاينة مجانية والدفع عند الاستلام. اطلب الآن قبل نفاد الكمية!`,
        headline: `عاين ${name} مع المندوب قبل ما تدفع مليم ⚡`,
      }),
    },
    {
      id: "comfort_quality",
      name: "الجودة والاعتمادية اليومية",
      generateText: (name) => ({
        primaryText: `دورك على الجودة اللي تعيش معاك وتتحمل الاستخدام اليومي؟ ${name} مصنوع بأعلى معايير الدقة والراحة عشان يديك أفضل تجربة بأفضل سعر. جربه واستمتع بفرق الجودة الحقيقي!`,
        headline: `خامات ممتازة وتجربة تدوم كل يوم ✨`,
      }),
    },
    {
      id: "bundle_offer",
      name: "باقة التوفير 2+1 (عرض خاص)",
      generateText: (name) => ({
        primaryText: `عرض خاص ومحدود جداً! اطلب ${name} اليوم، أو اطلب قطعتين واحصل على خصم إضافي مع شحن مجاني تماماً لجميع المحافظات والدفع عند الباب بعد الفحص والمعاينة!`,
        headline: `اطلب 2 واحصل على شحن مجاني وخصم فوري 🎁`,
      }),
    },
    {
      id: "problem_solver",
      name: "حل مشكلة واضحة وتوفير الوقت",
      generateText: (name) => ({
        primaryText: `لو بتعاني من ضياع الوقت وتدوير على حل عملي وموثوق... ${name} هو الحل السريع والذكي اللي هيسهل عليك يومك ويوفر طاقتك بنتائج فورية مضمونة.`,
        headline: `الحل الأذكى والعملي لراحتك اليومية 🚀`,
      }),
    },
    {
      id: "urgency_stock",
      name: "العرض الموسمي / كمية محدودة",
      generateText: (name) => ({
        primaryText: `تصفية الموسم وأقوى خصم لهذا الشهر على ${name}! باقي قطع معدودة في المخزن بسعر العرض. الشحن سريع ومتاح الدفع عند الاستلام بعد المعاينة التامة.`,
        headline: `خصم محدود والكمية قاربت على النفاد ⏳`,
      }),
    },
    {
      id: "social_proof",
      name: "تجارب وتقييمات العملاء (Social Proof)",
      generateText: (name) => ({
        primaryText: `أكثر من 1,500 عميل اختاروا ${name} ونال إعجاب وتقييم 4.9 نجوم. انضم لأكبر مجتمع عملاء راضين عن منتجاتنا وتمتع بضمان الاستبدال والاسترجاع السريع!`,
        headline: `المنتج الأكثر طلباً وتقييماً من عملائنا ⭐`,
      }),
    },
  ]);

  const [selectedAngleId, setSelectedAngleId] = useState<string>("safety");
  const [newAngleInput, setNewAngleInput] = useState("");
  const [showAddAngleInput, setShowAddAngleInput] = useState(false);

  // Editable ad fields
  const [primaryText, setPrimaryText] = useState(
    draft?.primaryText ||
      angles[0].generateText(productName).primaryText
  );
  const [headline, setHeadline] = useState(
    draft?.headline || angles[0].generateText(productName).headline
  );
  const [dailyBudget, setDailyBudget] = useState(draft?.budgetAmount || 350);

  // Handle angle selection
  const handleSelectAngle = (angle: MarketingAngleSuggestion) => {
    setSelectedAngleId(angle.id);
    const content = angle.generateText(productName);
    setPrimaryText(content.primaryText);
    setHeadline(content.headline);
    toast.success(`تم تطبيق زاوية: ${angle.name}`);
  };

  // Handle adding custom angle
  const handleAddCustomAngle = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAngleInput.trim();
    if (!trimmed) return;

    const newId = `custom-${Date.now()}`;
    const newAngle: MarketingAngleSuggestion = {
      id: newId,
      name: trimmed,
      generateText: (name) => ({
        primaryText: `عرض خاص على ${name} بزاوية (${trimmed})! خامات عالية الجودة، شحن سريع لجميع المحافظات، ومعاينة كاملة قبل الدفع. اطلب الآن واستفد من العرض.`,
        headline: `${name} | ${trimmed} ⚡`,
      }),
    };

    setAngles((prev) => [...prev, newAngle]);
    handleSelectAngle(newAngle);
    setNewAngleInput("");
    setShowAddAngleInput(false);
    toast.success(`تمت إضافة وتطبيق زاوية: ${trimmed}`);
  };

  // Launch campaign
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
              مسودة الإعلان، الزوايا التسويقية، والميزانية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
            جاهز للإطلاق
          </span>
        </div>
      </div>

      {/* Body: Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 min-h-0">
        {/* 1. Compact Product Card with Thumbnail & Unit Economics */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            {selectedProduct?.mainImage ? (
              <img
                src={selectedProduct.mainImage}
                alt={productName}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-400">
                <Package className="w-6 h-6" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {productName}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                المخزون المتوفر:{" "}
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {availableStock} قطعة
                </span>
              </p>
            </div>
          </div>

          {/* Economics Strip */}
          <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/60 text-center">
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="block text-[10px] text-slate-400">سعر البيع</span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {sellingPrice} ج.م
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="block text-[10px] text-slate-400">سقف تكلفة الطلب (Max CPA)</span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                ~{targetCpa} ج.م
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <span className="block text-[10px] text-slate-400">هامش الربح</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {profitMargin}%
              </span>
            </div>
          </div>
        </div>

        {/* 2. Marketing Angle Suggestion Tags (مسميات كاقتراحات) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              اقتراحات زوايا البيع والهوك (Marketing Angles)
            </span>
            <button
              type="button"
              onClick={() => setShowAddAngleInput(!showAddAngleInput)}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              إضافة زاوية
            </button>
          </div>

          {/* Add custom angle row */}
          {showAddAngleInput && (
            <form
              onSubmit={handleAddCustomAngle}
              className="flex items-center gap-1.5 p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            >
              <input
                type="text"
                value={newAngleInput}
                onChange={(e) => setNewAngleInput(e.target.value)}
                placeholder="اكتب اسم الزاوية (مثال: شحن فوري في نفس اليوم)..."
                className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newAngleInput.trim()}
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                إضافة
              </button>
            </form>
          )}

          {/* Suggestion Chips */}
          <div className="flex flex-wrap gap-1.5">
            {angles.map((angle) => {
              const isSelected = selectedAngleId === angle.id;
              return (
                <button
                  key={angle.id}
                  type="button"
                  onClick={() => handleSelectAngle(angle)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Tag className={`w-3 h-3 ${isSelected ? "text-white" : "text-slate-400"}`} />
                  <span>{angle.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Direct Ad Copy Editor (Primary Text & Headline) */}
        <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              نص الإعلان الرئيسي (Primary Text):
            </label>
            <textarea
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
              rows={4}
              placeholder="اكتب النص الإعلاني أو اختر زاوية من الأعلى لتطبيقه تلقائياً..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              عنوان الإعلان (Headline):
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="عنوان الإعلان الرئيسي..."
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Link & CTA Preview */}
          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono">
                {selectedProduct?.slug
                  ? `swan.maxp.online/p/${selectedProduct.slug}`
                  : "swan.maxp.online"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
              زر الإعلان: تسوق الآن
            </span>
          </div>
        </div>

        {/* 4. Campaign Parameters & Budget Bar */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              إعدادات الحملة في Meta
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              مصر • جميع المحافظات • تسوق أونلاين
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              الميزانية اليومية الموصى بها:
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(Number(e.target.value))}
                className="w-20 py-1 px-2 text-xs font-black text-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 focus:outline-none"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ج.م / يومياً
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Action Footer: Launch to Meta Ads */}
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
