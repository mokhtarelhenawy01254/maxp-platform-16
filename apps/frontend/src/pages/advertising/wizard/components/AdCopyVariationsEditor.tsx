import React from "react";
import { Plus, Trash2, Sparkles, HelpCircle } from "lucide-react";
import type { TextVariation, HeadlineVariation } from "../types";

interface AdCopyVariationsEditorProps {
  primaryText: string;
  onPrimaryTextChange: (val: string) => void;
  textVariations: TextVariation[];
  onTextVariationsChange: (variations: TextVariation[]) => void;
  headline: string;
  onHeadlineChange: (val: string) => void;
  headlineVariations: HeadlineVariation[];
  onHeadlineVariationsChange: (variations: HeadlineVariation[]) => void;
  primaryTextError?: string;
}

const PRIMARY_TEXT_HOOK_SUGGESTIONS = [
  { label: "خصم حصري لفترة محدودة", text: "🔥 خصم خاص لفترة محدودة! اطلب الآن واستفد من العرض قبل نفاد الكمية." },
  { label: "حل المشكلة مباشرة", text: "هل تبحث عن أفضل جودة وسعر منافس؟ وفرنا لك الحل الأمثل بضمان كامل." },
  { label: "شحن سريع ودفع عند الاستلام", text: "🚚 التوصيل لجميع المحافظات مع إمكانية المعاينة والدفع عند الاستلام!" },
];

const HEADLINE_SUGGESTIONS = [
  "خصم 30% اليوم فقط ⚡",
  "الدفع عند الاستلام والمعاينة مجاناً",
  "الأكثر مبيعاً - اطلب الآن 🛒",
  "جودة أصلية مضمونة 100%",
];

export const AdCopyVariationsEditor: React.FC<AdCopyVariationsEditorProps> = ({
  primaryText,
  onPrimaryTextChange,
  textVariations,
  onTextVariationsChange,
  headline,
  onHeadlineChange,
  headlineVariations,
  onHeadlineVariationsChange,
  primaryTextError,
}) => {
  const MAX_VARIATIONS = 4; // 1 base + 4 variations = 5 total (Meta standard)

  const handleAddTextVariation = (prefill = "") => {
    if (textVariations.length >= MAX_VARIATIONS) return;
    const newVariation: TextVariation = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: prefill,
    };
    onTextVariationsChange([...textVariations, newVariation]);
  };

  const handleUpdateTextVariation = (id: string, text: string) => {
    onTextVariationsChange(
      textVariations.map((v) => (v.id === id ? { ...v, text } : v)),
    );
  };

  const handleRemoveTextVariation = (id: string) => {
    onTextVariationsChange(textVariations.filter((v) => v.id !== id));
  };

  const handleAddHeadlineVariation = (prefill = "") => {
    if (headlineVariations.length >= MAX_VARIATIONS) return;
    const newVariation: HeadlineVariation = {
      id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: prefill,
    };
    onHeadlineVariationsChange([...headlineVariations, newVariation]);
  };

  const handleUpdateHeadlineVariation = (id: string, text: string) => {
    onHeadlineVariationsChange(
      headlineVariations.map((v) => (v.id === id ? { ...v, text } : v)),
    );
  };

  const handleRemoveHeadlineVariation = (id: string) => {
    onHeadlineVariationsChange(headlineVariations.filter((v) => v.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Primary Text Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
            النص الأساسي (Primary Text) <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {textVariations.length + 1} من 5 نصوص
          </span>
        </div>

        {/* Base Primary Text */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">النص 1 (الرئيسي)</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{primaryText.length}/125</span>
          </div>
          <textarea
            value={primaryText}
            onChange={(e) => onPrimaryTextChange(e.target.value)}
            placeholder="اكتب النص الرئيسي الجذاب لإعلانك..."
            rows={3}
            maxLength={160}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
              primaryTextError ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {primaryTextError && (
            <p className="mt-1 text-xs text-red-500">{primaryTextError}</p>
          )}
        </div>

        {/* Quick Hook Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            زوايا سريعة:
          </span>
          {PRIMARY_TEXT_HOOK_SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (!primaryText.trim()) {
                  onPrimaryTextChange(s.text);
                } else if (textVariations.length < MAX_VARIATIONS) {
                  handleAddTextVariation(s.text);
                }
              }}
              className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              + {s.label}
            </button>
          ))}
        </div>

        {/* Additional Text Variations */}
        {textVariations.map((variation, index) => (
          <div
            key={variation.id}
            className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60 rounded-xl space-y-2 relative group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                النص {index + 2} (اختبار زاوية بديلة)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {variation.text.length}/125
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveTextVariation(variation.id)}
                  className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                  title="حذف هذا النص"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <textarea
              value={variation.text}
              onChange={(e) =>
                handleUpdateTextVariation(variation.id, e.target.value)
              }
              placeholder="اكتب زاوية نص إضافية (مثال: التركيز على السعر، التوصيل، أو آراء العملاء)..."
              rows={2}
              maxLength={160}
              className="w-full px-3 py-2 border border-blue-200 dark:border-blue-800 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        {textVariations.length < MAX_VARIATIONS && (
          <button
            type="button"
            onClick={() => handleAddTextVariation()}
            className="w-full py-2.5 border border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            إضافة خيار نص أساسي آخر (حتى 5 نصوص لتجربة زوايا متعددة)
          </button>
        )}
      </div>

      {/* Headline Section */}
      <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
            العنوان الرئيسي (Headline)
          </label>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            {headlineVariations.length + 1} من 5 عناوين
          </span>
        </div>

        {/* Base Headline */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">العنوان 1 (الرئيسي)</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{headline.length}/40</span>
          </div>
          <input
            type="text"
            value={headline}
            onChange={(e) => onHeadlineChange(e.target.value)}
            placeholder="عنوان جذاب يظهر بجانب زر الإجراء..."
            maxLength={50}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Headline Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-500" />
            عناوين مقترحة:
          </span>
          {HEADLINE_SUGGESTIONS.map((h, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (!headline.trim()) {
                  onHeadlineChange(h);
                } else if (headlineVariations.length < MAX_VARIATIONS) {
                  handleAddHeadlineVariation(h);
                }
              }}
              className="text-[11px] px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg transition-colors"
            >
              + {h}
            </button>
          ))}
        </div>

        {/* Additional Headline Variations */}
        {headlineVariations.map((variation, index) => (
          <div
            key={variation.id}
            className="p-3 bg-purple-50/40 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/60 rounded-xl space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                العنوان {index + 2}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {variation.text.length}/40
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveHeadlineVariation(variation.id)}
                  className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                  title="حذف هذا العنوان"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <input
              type="text"
              value={variation.text}
              onChange={(e) =>
                handleUpdateHeadlineVariation(variation.id, e.target.value)
              }
              placeholder="اكتب خيار عنوان بديل..."
              maxLength={50}
              className="w-full px-3 py-2 border border-purple-200 dark:border-purple-800 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
            />
          </div>
        ))}

        {headlineVariations.length < MAX_VARIATIONS && (
          <button
            type="button"
            onClick={() => handleAddHeadlineVariation()}
            className="w-full py-2.5 border border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 bg-purple-50/30 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl text-purple-700 dark:text-purple-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            إضافة خيار عنوان آخر (حتى 5 عناوين لاختبار تفاعل الجمهور)
          </button>
        )}
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
        <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
        <span>
          <strong>كيف تعمل تنويعات النصوص والعناوين؟</strong> يقوم Facebook بتدوير النصوص والعناوين تلقائياً بين مستخدمي الإعلان لاكتشاف التركيبة التي تحقق أعلى معدل نقر ومبيعات بأقل تكلفة.
        </span>
      </div>
    </div>
  );
};
