import React, { useState } from "react";
import {
  Plus,
  X,
  Sparkles,
  RefreshCw,
  Zap,
} from "lucide-react";
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
      `عرض حصري لفترة محدودة: احصل على ${cleanName} بجودة استثنائية وسعر لا يتكرر. شحن سريع لجميع المحافظات والدفع بعد المعاينة عند الاستلام.`,
      `أناقة وراحة فائقة تناسب يومك بالكامل مع ${cleanName}. خامات ممتازة تدوم طويلاً، وتصميم عصري يجمع بين التميز والعملية اليومية.`,
      `انضم لآلاف العملاء الموثوقين مع ${cleanName}: تجربة شراء مضمونة، معاينة مجانية قبل الاستلام وضمان استبدال واسترجاع فوري.`,
    ];

    const generatedHeadlines = [
      `${cleanName} - خصم خاص وشحن سريع`,
      `${cleanName} الأصلي - اطلب الآن واستلم غداً`,
      `الأعلى طلباً وتقييماً - معاينة قبل الدفع`,
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
        ? "AI generated 3 high-converting angles & headlines"
        : "تم توليد 3 زوايا إعلانية وعناوين بالذكاء الاصطناعي بنجاح",
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
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-foreground">
            {isEn ? "Meta v26 Advantage+ Dynamic Text" : "ميزة التوزيع الذكي للنصوص (Meta v26 Dynamic Text)"}
          </p>
          <p className="mt-0.5 text-muted-foreground font-normal leading-relaxed">
            {isEn
              ? "Add up to 5 text and headline variations. Meta's AI dynamically matches the best copy to each customer based on their buying behavior."
              : "يمكنك إضافة حتى 5 نصوص و 5 عناوين مختلفة. خوارزميات Meta تقوم باختبار التوليفات تلقائياً وإظهار النص الأكثر إقناعاً لكل عميل."}
          </p>
        </div>
      </div>

      {/* AI Copywriter Action Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              {isEn ? "MaxP AI Copywriter (3 Strategic Angles)" : "كاتب الإعلانات الذكي (MaxP AI Copywriter)"}
            </h4>
            <p className="text-[11px] text-muted-foreground font-normal">
              {isEn
                ? "Auto-generates FOMO, Value, and Social Proof variations"
                : "توليد 3 زوايا بيعية (العرض والخصم، الراحة والجودة، الثقة والأمان) متوافقة مع سياسات Meta"}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isAiGenerating}
          onClick={generateAiCopyVariations}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-xs transition shrink-0"
        >
          {isAiGenerating ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>{isEn ? "Generating Copy..." : "جاري التوليد الذكي..."}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isEn ? "Generate 3 AI Variations" : "توليد 3 زوايا إعلانية ذكية"}</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Hooks Assistant */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <label className="text-xs font-semibold text-foreground">
            {isEn ? "Quick Creative Hooks (E-Commerce)" : "خطافات إعلانية سريعة مقترحة (للتحفيز والشراء)"}
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "عرض حصري لفترة محدودة", text: "عرض حصري لفترة محدودة: احصل على أفضل جودة مع شحن سريع ومعاينة قبل الاستلام." },
            { label: "الأكثر طلباً وتقييماً", text: "المنتج الأكثر طلباً وتقييماً من آلاف العملاء في مصر. لا تفوت الفرصة." },
            { label: "الدفع عند الاستلام والتوصيل مجاناً", text: "اطلب الآن واستمتع بالشحن المجاني والدفع عند الاستلام مع ضمان استبدال واسترجاع كامل." },
            { label: "خصم 30% على أول طلب", text: "وفر حتى 30% اليوم على طلبك، الكمية المتبقية محدودة." },
          ].map((hook) => (
            <button
              key={hook.label}
              type="button"
              onClick={() => insertQuickHook(hook.text)}
              className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition"
            >
              <Plus className="h-3 w-3 text-primary" />
              <span>{hook.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Texts (Up to 5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold text-foreground">
              {isEn ? "Primary Text Variations (1 - 5) *" : "النص الإعلاني الأساسي (1 إلى 5 نصوص) *"}
            </label>
            <p className="text-[11px] text-muted-foreground font-normal">
              {isEn ? "The main copy shown above your ad media" : "النص الرئيسي الذي يظهر أعلى الصورة أو الفيديو"}
            </p>
          </div>
          {formData.primaryTexts.length < 5 && (
            <button
              type="button"
              onClick={addPrimaryText}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              {isEn ? "Add Text Variation" : "إضافة تنويع نص"}
            </button>
          )}
        </div>

        {formData.primaryTexts.map((text, idx) => (
          <div key={idx} className="relative rounded-xl border border-border/70 bg-card p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {isEn ? `Primary Text #${idx + 1}` : `النص الأساسي #${idx + 1}`} {idx === 0 ? "(الرئيسي)" : "(تنويع ذكي)"}
              </span>
              {formData.primaryTexts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePrimaryText(idx)}
                  className="text-muted-foreground hover:text-destructive p-1 rounded transition"
                  aria-label="Remove variation"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => updatePrimaryText(idx, e.target.value)}
              placeholder={isEn ? "Write your persuasive ad copy here..." : "اكتب النص الإعلاني المقنع هنا، اذكر الفوائد والعرض والضمان..."}
              className="w-full rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-card resize-y"
            />
          </div>
        ))}
      </div>

      {/* Headlines (Up to 5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold text-foreground">
              {isEn ? "Headline Variations (1 - 5)" : "عناوين الإعلان (1 إلى 5 عناوين)"}
            </label>
            <p className="text-[11px] text-muted-foreground font-normal">
              {isEn ? "Catchy bold text next to your call to action button" : "العنوان البارز المكتوب بجوار زر الدعوة لاتخاذ إجراء"}
            </p>
          </div>
          {formData.headlines.length < 5 && (
            <button
              type="button"
              onClick={addHeadline}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
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
              className="w-full rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {formData.headlines.length > 1 && (
              <button
                type="button"
                onClick={() => removeHeadline(idx)}
                className="text-muted-foreground hover:text-destructive p-2 rounded transition"
                aria-label="Remove headline"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Description (Optional) */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          {isEn ? "Link Description (Optional)" : "وصف الرابط الإضافي (اختياري)"}
        </label>
        <input
          type="text"
          value={formData.description || ""}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder={isEn ? "e.g. Free shipping on all orders" : "مثال: شحن مجاني لكافة محافظات مصر"}
          className="w-full rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
};
