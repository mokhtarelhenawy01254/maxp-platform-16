import React from "react";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

export interface StudioI18nTabProps {
  sectionType: string;
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
  onSave?: () => void;
}

export const StudioI18nTab: React.FC<StudioI18nTabProps> = ({
  settings,
  onUpdateField,
  onSave,
}) => {
  const currentI18n = (settings["i18n"] || {}) as Record<string, any>;
  const enOverrides = (currentI18n["en"] || {}) as Record<string, any>;

  // Base Arabic values for reference
  const baseTitle = (settings["title"] ?? settings["heading"] ?? "") as string;
  const baseSubtitle = (settings["subtitle"] ?? settings["description"] ?? settings["subheading"] ?? "") as string;
  const baseEyebrow = (settings["eyebrow"] ?? settings["badge"] ?? settings["tagline"] ?? "") as string;
  const baseCtaText = (settings["ctaText"] ?? settings["buttonText"] ?? settings["primaryButtonText"] ?? "") as string;

  // English values from settings.i18n.en
  const enTitle = (enOverrides["title"] ?? enOverrides["heading"] ?? "") as string;
  const enSubtitle = (enOverrides["subtitle"] ?? enOverrides["description"] ?? enOverrides["subheading"] ?? "") as string;
  const enEyebrow = (enOverrides["eyebrow"] ?? enOverrides["badge"] ?? enOverrides["tagline"] ?? "") as string;
  const enCtaText = (enOverrides["ctaText"] ?? enOverrides["buttonText"] ?? enOverrides["primaryButtonText"] ?? "") as string;

  const handleBatchUpdateEnglish = (updates: Record<string, string>) => {
    const nextEn = {
      ...enOverrides,
      ...updates,
    };
    const nextI18n = {
      ...currentI18n,
      en: nextEn,
    };

    onUpdateField("i18n", nextI18n);
  };

  const handleClearField = (field: string) => {
    const nextEn = { ...enOverrides };
    delete nextEn[field];
    const nextI18n = {
      ...currentI18n,
      en: nextEn,
    };
    onUpdateField("i18n", nextI18n);
    onSave?.();
  };

  return (
    <div className="space-y-4 select-none text-[11.5px] text-[#17181c]" data-testid="studio-i18n-tab">
      {/* 1. Header Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-2.5 text-start">
        <div className="flex items-center gap-1.5 font-bold text-blue-900">
          <GlobeAltIcon className="h-4 w-4 text-blue-600 shrink-0" />
          <span>المحتوى ثنائي اللغة (i18n)</span>
        </div>
        <p className="mt-1 text-[10.5px] leading-relaxed text-blue-800">
          أدخل النصوص الإنجليزية البديلة لهذا القسم. التعديلات هنا تُحفظ في{" "}
          <code className="rounded bg-blue-100 px-1 py-0.2 font-mono text-[9.5px]">settings.i18n.en</code>{" "}
          دون المساس بالنصوص العربية الأصلية.
        </p>
      </div>

      {/* 2. Target Language Selector */}
      <div className="flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-1.5">
        <span className="text-[10.5px] font-bold text-[#4b5563]">لغة الترجمة:</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="flex items-center gap-1 rounded bg-[#2b6cf6] px-2.5 py-1 text-[10.5px] font-bold text-white shadow-xs"
          >
            <span>English (EN)</span>
          </button>
        </div>
      </div>

      {/* 3. Fields */}
      <div className="space-y-3.5">
        {/* Title / Heading */}
        <div className="space-y-1.5 rounded-lg border border-[#f0f1f3] bg-[#fafbfc] p-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-[#6f747b]">
              العنوان الرئيسي (Title / Heading)
            </label>
            {enTitle && (
              <button
                type="button"
                onClick={() => {
                  handleClearField("title");
                  handleClearField("heading");
                }}
                className="text-[9.5px] text-red-500 hover:underline cursor-pointer"
                title="حذف الترجمة والعودة للأصل العربي"
              >
                تصفير للرجوع للأصل
              </button>
            )}
          </div>
          {baseTitle && (
            <div className="text-[10px] text-[#7a7f87] bg-white rounded border border-[#ececee] px-2 py-1 flex items-center gap-1">
              <span className="font-semibold text-[#a0a5ad] shrink-0">الأصل العربي:</span>
              <span className="truncate">{baseTitle}</span>
            </div>
          )}
          <input
            type="text"
            dir="ltr"
            data-testid="i18n-en-title-input"
            value={enTitle}
            onChange={(e) => {
              const val = e.target.value;
              handleBatchUpdateEnglish({
                title: val,
                heading: val,
              });
            }}
            onBlur={() => onSave?.()}
            placeholder="e.g. Summer Sale, New Arrivals..."
            className="w-full rounded-lg border border-[#ececee] bg-white px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] font-sans"
          />
        </div>

        {/* Subtitle / Description */}
        <div className="space-y-1.5 rounded-lg border border-[#f0f1f3] bg-[#fafbfc] p-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-[#6f747b]">
              الوصف / النص التوضيحي (Subtitle / Description)
            </label>
            {enSubtitle && (
              <button
                type="button"
                onClick={() => {
                  handleClearField("subtitle");
                  handleClearField("description");
                }}
                className="text-[9.5px] text-red-500 hover:underline cursor-pointer"
              >
                تصفير للرجوع للأصل
              </button>
            )}
          </div>
          {baseSubtitle && (
            <div className="text-[10px] text-[#7a7f87] bg-white rounded border border-[#ececee] px-2 py-1 flex items-center gap-1">
              <span className="font-semibold text-[#a0a5ad] shrink-0">الأصل العربي:</span>
              <span className="truncate">{baseSubtitle}</span>
            </div>
          )}
          <textarea
            rows={2}
            dir="ltr"
            data-testid="i18n-en-subtitle-input"
            value={enSubtitle}
            onChange={(e) => {
              const val = e.target.value;
              handleBatchUpdateEnglish({
                subtitle: val,
                description: val,
              });
            }}
            onBlur={() => onSave?.()}
            placeholder="e.g. Discover our latest collections..."
            className="w-full rounded-lg border border-[#ececee] bg-white px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] font-sans"
          />
        </div>

        {/* Eyebrow / Badge */}
        <div className="space-y-1.5 rounded-lg border border-[#f0f1f3] bg-[#fafbfc] p-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-[#6f747b]">
              الشارة العلوية (Badge / Eyebrow)
            </label>
            {enEyebrow && (
              <button
                type="button"
                onClick={() => {
                  handleClearField("eyebrow");
                  handleClearField("badge");
                }}
                className="text-[9.5px] text-red-500 hover:underline cursor-pointer"
              >
                تصفير للرجوع للأصل
              </button>
            )}
          </div>
          {baseEyebrow && (
            <div className="text-[10px] text-[#7a7f87] bg-white rounded border border-[#ececee] px-2 py-1 flex items-center gap-1">
              <span className="font-semibold text-[#a0a5ad] shrink-0">الأصل العربي:</span>
              <span className="truncate">{baseEyebrow}</span>
            </div>
          )}
          <input
            type="text"
            dir="ltr"
            data-testid="i18n-en-eyebrow-input"
            value={enEyebrow}
            onChange={(e) => {
              const val = e.target.value;
              handleBatchUpdateEnglish({
                eyebrow: val,
                badge: val,
              });
            }}
            onBlur={() => onSave?.()}
            placeholder="e.g. Special Offer, Trending..."
            className="w-full rounded-lg border border-[#ececee] bg-white px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] font-sans"
          />
        </div>

        {/* CTA / Button */}
        <div className="space-y-1.5 rounded-lg border border-[#f0f1f3] bg-[#fafbfc] p-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-[#6f747b]">
              نص الزر (CTA / Button Text)
            </label>
            {enCtaText && (
              <button
                type="button"
                onClick={() => {
                  handleClearField("ctaText");
                  handleClearField("buttonText");
                }}
                className="text-[9.5px] text-red-500 hover:underline cursor-pointer"
              >
                تصفير للرجوع للأصل
              </button>
            )}
          </div>
          {baseCtaText && (
            <div className="text-[10px] text-[#7a7f87] bg-white rounded border border-[#ececee] px-2 py-1 flex items-center gap-1">
              <span className="font-semibold text-[#a0a5ad] shrink-0">الأصل العربي:</span>
              <span className="truncate">{baseCtaText}</span>
            </div>
          )}
          <input
            type="text"
            dir="ltr"
            data-testid="i18n-en-cta-input"
            value={enCtaText}
            onChange={(e) => {
              const val = e.target.value;
              handleBatchUpdateEnglish({
                ctaText: val,
                buttonText: val,
                primaryButtonText: val,
              });
            }}
            onBlur={() => onSave?.()}
            placeholder="e.g. Shop Now, Learn More..."
            className="w-full rounded-lg border border-[#ececee] bg-white px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] font-sans"
          />
        </div>
      </div>
    </div>
  );
};

export default StudioI18nTab;
