import React, { useState } from "react";
import {
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { AdFormData } from "./types";
import { toast } from "sonner";

interface AdCopyVariationsStepProps {
  formData: AdFormData;
  updateFormData: (updates: Partial<AdFormData>) => void;
  isEn?: boolean;
}

export const AdCopyVariationsStep: React.FC<AdCopyVariationsStepProps> = ({
  formData,
  updateFormData,
  isEn = false,
}) => {
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const generateAiCopyVariations = async () => {
    setIsAiGenerating(true);
    const rawName = formData.name || formData.headline || "المنتج العصري";
    const cleanName = rawName.replace(/-(.*)$/, "").replace(/حملة(.*)$/, "").trim() || "المنتج المميز";

    await new Promise((resolve) => setTimeout(resolve, 800));

    const generatedTexts = [
      `🔥 عرض حصري لفترة محدودة! احصل على ${cleanName} بجودة استثنائية وسعر لا يتكرر. شحن سريع لجميع المحافظات والدفع بعد المعاينة عند الاستلام!`,
      `✨ أناقة وراحة فائقة تناسب يومك بالكامل مع ${cleanName}. خامات ممتازة تدوم طويلاً، وتصميم عصري يجمع بين التميز والعملية اليومية.`,
      `⭐ انضم لآلاف العملاء الراضين مع ${cleanName}! تجربة شراء مضمونة 100%، معاينة مجانية قبل الاستلام وضمان استبدال واسترجاع فوري.`,
    ];

    const generatedHeadlines = [
      `${cleanName} - خصم خاص وشحن سريع`,
      `${cleanName} الأصلي - اطلب الآن واستلم غداً`,
      `الأكثر طلباً وتقييماً ⭐ معاينة قبل الدفع`,
    ];

    updateFormData({
      primaryTexts: generatedTexts,
      primaryText: generatedTexts[0],
      headlines: generatedHeadlines,
      headline: generatedHeadlines[0],
    });

    setIsAiGenerating(false);
    toast.success(
      isEn
        ? "AI generated 3 high-converting angles & headlines!"
        : "تم توليد 3 زوايا إعلانية وعناوين بالذكاء الاصطناعي بنجاح!",
    );
  };

  // Add primary text variation
  const addPrimaryText = () => {
    if (formData.primaryTexts.length >= 5) {
      toast.error(isEn ? "Maximum 5 text variations" : "الحد الأقصى هو 5 نصوص أساسية");
      return;
    }
    const updated = [...formData.primaryTexts, ""];
    updateFormData({
      primaryTexts: updated,
      primaryText: updated[0] || "",
    });
  };

  const updatePrimaryText = (index: number, val: string) => {
    const updated = [...formData.primaryTexts];
    updated[index] = val;
    updateFormData({
      primaryTexts: updated,
      primaryText: updated[0] || "",
    });
  };

  const removePrimaryText = (index: number) => {
    if (formData.primaryTexts.length <= 1) {
      toast.error(isEn ? "At least one primary text is required" : "يلزم وجود نص أساسي واحد على الأقل");
      return;
    }
    const updated = formData.primaryTexts.filter((_, i) => i !== index);
    updateFormData({
      primaryTexts: updated,
      primaryText: updated[0] || "",
    });
  };

  // Add headline variation
  const addHeadline = () => {
    if (formData.headlines.length >= 5) {
      toast.error(isEn ? "Maximum 5 headlines" : "الحد الأقصى هو 5 عناوين");
      return;
    }
    const updated = [...formData.headlines, ""];
    updateFormData({
      headlines: updated,
      headline: updated[0] || "",
    });
  };

  const updateHeadline = (index: number, val: string) => {
    const updated = [...formData.headlines];
    updated[index] = val;
    updateFormData({
      headlines: updated,
      headline: updated[0] || "",
    });
  };

  const removeHeadline = (index: number) => {
    if (formData.headlines.length <= 1) return;
    const updated = formData.headlines.filter((_, i) => i !== index);
    updateFormData({
      headlines: updated,
      headline: updated[0] || "",
    });
  };

  // Quick preset hooks
  const insertQuickHook = (hookText: string) => {
    const current = formData.primaryTexts[0] || "";
    const updated = [...formData.primaryTexts];
    updated[0] = current ? `${hookText}\n\n${current}` : hookText;
    updateFormData({
      primaryTexts: updated,
      primaryText: updated[0],
    });
    toast.success(isEn ? "Hook applied to primary text" : "تمت إضافة الخطاف الإعلاني للنص الأول");
  };

  return (
    <div className="space-y-6">
      {/* Advantage+ Dynamic Text Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
        <SparklesIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-black text-indigo-950">
            {isEn ? "Meta v26 Advantage+ Dynamic Text" : "ميزة التوزيع الذكي للنصوص (Meta v26 Dynamic Text)"}
          </p>
          <p className="mt-0.5 text-indigo-800 font-medium">
            {isEn
              ? "Add up to 5 text and headline variations. Meta's AI dynamically matches the best copy to each customer based on their buying behavior."
              : "يمكنك إضافة حتى 5 نصوص و 5 عناوين مختلفة. خوارزميات Meta تقوم باختبار التوليفات تلقائياً وإظهار النص الأكثر إقناعاً لكل عميل."}
          </p>
        </div>
      </div>

      {/* AI Copywriter Action Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-200 shrink-0">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">
              {isEn ? "MaxP AI Copywriter (3 Strategic Angles)" : "كاتب الإعلانات الذكي (MaxP AI Copywriter)"}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              {isEn
                ? "Auto-generates FOMO, Value, and Social Proof variations"
                : "يولد 3 زوايا بيعية (العرض والخصم، الراحة والجودة، الثقة والأمان) متوافقة مع سياسات Meta"}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isAiGenerating}
          onClick={generateAiCopyVariations}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white hover:bg-purple-700 disabled:opacity-50 shadow-sm transition shrink-0"
        >
          {isAiGenerating ? (
            <>
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              <span>{isEn ? "Generating Copy..." : "جاري التوليد الذكي..."}</span>
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4 text-purple-200" />
              <span>{isEn ? "Generate 3 AI Variations" : "✨ توليد 3 زوايا إعلانية ذكية"}</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Hooks Assistant */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">
          {isEn ? "Quick Creative Hooks (E-Commerce)" : "خطافات إعلانية سريعة مقترحة (للتحفيز والشراء)"}
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "⚡ عرض حصري لفترة محدودة", text: "⚡ عرض حصري لفترة محدودة! احصل على أفضل جودة مع شحن سريع ومعاينة قبل الاستلام." },
            { label: "⭐ الأكثر طلباً وتقييماً", text: "⭐ المنتج الأكثر طلباً وتقييماً من آلاف العملاء في مصر. لا تفوت الفرصة!" },
            { label: "🚚 الدفع عند الاستلام والتوصيل مجاناً", text: "🚚 اطلب الآن واستمتع بالشحن المجاني والدفع عند الاستلام مع ضمان استبدال واسترجاع كامل." },
            { label: "🔥 خصم 30% على أول طلب", text: "🔥 وفر حتى 30% اليوم على طلبك، الكمية المتبقية محدودة جداً!" },
          ].map((hook) => (
            <button
              key={hook.label}
              type="button"
              onClick={() => insertQuickHook(hook.text)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30 transition"
            >
              <PlusIcon className="h-3 w-3 text-indigo-600" />
              <span>{hook.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Texts (Up to 5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold text-slate-800">
              {isEn ? "Primary Text Variations (1 - 5) *" : "النص الإعلاني الأساسي (1 إلى 5 نصوص) *"}
            </label>
            <p className="text-[11px] text-slate-500">
              {isEn ? "The main copy shown above your ad media" : "النص الرئيسي الذي يظهر أعلى الصورة أو الفيديو"}
            </p>
          </div>
          {formData.primaryTexts.length < 5 && (
            <button
              type="button"
              onClick={addPrimaryText}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <PlusIcon className="h-4 w-4" />
              {isEn ? "Add Text Variation" : "إضافة تنويع نص"}
            </button>
          )}
        </div>

        {formData.primaryTexts.map((text, idx) => (
          <div key={idx} className="relative rounded-xl border border-slate-200 bg-white p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">
                {isEn ? `Primary Text #${idx + 1}` : `النص الأساسي #${idx + 1}`} {idx === 0 ? "(الرئيسي)" : "(تنويع ذكي)"}
              </span>
              {formData.primaryTexts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePrimaryText(idx)}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => updatePrimaryText(idx, e.target.value)}
              placeholder={isEn ? "Write your persuasive ad copy here..." : "اكتب النص الإعلاني المقنع هنا، اذكر الفوائد والعرض والضمان..."}
              className="w-full rounded-lg border-0 p-0 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 resize-y"
            />
          </div>
        ))}
      </div>

      {/* Headlines (Up to 5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold text-slate-800">
              {isEn ? "Headline Variations (1 - 5)" : "عناوين الإعلان (1 إلى 5 عناوين)"}
            </label>
            <p className="text-[11px] text-slate-500">
              {isEn ? "Catchy bold text next to your call to action button" : "العنوان البارز المكتوب بجوار زر الدعوة لاتخاذ إجراء"}
            </p>
          </div>
          {formData.headlines.length < 5 && (
            <button
              type="button"
              onClick={addHeadline}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <PlusIcon className="h-4 w-4" />
              {isEn ? "Add Headline" : "إضافة عنوان"}
            </button>
          )}
        </div>

        {formData.headlines.map((hl, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={hl}
              onChange={(e) => updateHeadline(idx, e.target.value)}
              placeholder={isEn ? `Headline #${idx + 1}` : `العنوان #${idx + 1} (مثال: خصم 30% لفترة محدودة)`}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {formData.headlines.length > 1 && (
              <button
                type="button"
                onClick={() => removeHeadline(idx)}
                className="text-slate-400 hover:text-red-500 p-2"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Description (Optional) */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1">
          {isEn ? "Link Description (Optional)" : "وصف الرابط الإضافي (اختياري)"}
        </label>
        <input
          type="text"
          value={formData.description || ""}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder={isEn ? "e.g. Free shipping on all orders" : "مثال: شحن مجاني لكافة محافظات مصر"}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
};
