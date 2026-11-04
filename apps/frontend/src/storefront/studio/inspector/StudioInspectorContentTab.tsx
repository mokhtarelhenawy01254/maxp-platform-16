import React from "react";
import { PhotoIcon, LinkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { STOREFRONT_SECTION_MANIFEST } from "../../sections/manifest";
import { StudioDynamicTokenPicker } from "./StudioDynamicTokenPicker";
import { StudioDisplayConditionsControl } from "./StudioDisplayConditionsControl";
import { StudioManifestFieldsRenderer } from "./StudioManifestFieldsRenderer";
import { StudioArrayRepeaterControl } from "./StudioArrayRepeaterControl";
import { StudioHeroPanelGroup } from "./StudioHeroPanelGroup";

export const HERO_PANEL_VARIANTS = new Set([
  "drop-board",
  "layered-parallax-sky",
  "cinematic-plinth",
  "speed-banner",
  "split-panel",
  "fashion-billboard",
  "style-ledger",
  "retail-command",
  "runway-grid",
  "modest-cascade",
  "soft-showcase",
  "boutique-muse",
  "retail-direct-banner",
  "scent-portrait",
  "elessi-bag-hero",
  "elessi-spotlight",
  "elessi-dual-merch",
  "elessi-promo-cascade",
  "elessi-utility-stage",
  "elessi-soft-departments",
  "elessi-organic-harvest",
  "butcher-counter",
  "butcher-atelier",
  "elessi-plant-slider",
  "elessi-bike-hero",
  "elessi-digital-launch",
  "elessi-beauty-ritual",
  "elessi-garage-command",
  "elessi-jewel-salon",
  "elessi-pet-sunroom",
  "grooming-hero",
  "dental-precision-hero",
]);

export interface StudioInspectorContentTabProps {
  sectionType: string;
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
  onOpenImagePicker?: (targetField?: string) => void;
}

export const StudioInspectorContentTab: React.FC<StudioInspectorContentTabProps> = ({
  sectionType,
  settings,
  onUpdateField,
  onOpenImagePicker,
}) => {
  const manifestEntry =
    STOREFRONT_SECTION_MANIFEST[sectionType] ||
    STOREFRONT_SECTION_MANIFEST[sectionType?.toLowerCase?.()] ||
    Object.values(STOREFRONT_SECTION_MANIFEST).find(
      (entry) => entry.component?.toLowerCase() === sectionType?.toLowerCase?.()
    );

  const hasManifestFields = Boolean(manifestEntry?.fields && manifestEntry.fields.length > 0);

  // Fallback field values
  const title = settings.title ?? settings.heading ?? "";
  const subtitle = settings.subtitle ?? settings.description ?? settings.subheading ?? "";
  const eyebrow = settings.eyebrow ?? settings.badge ?? settings.tagline ?? "";
  const ctaText = settings.ctaText ?? settings.primaryButtonText ?? settings.buttonText ?? "";
  const ctaLink = settings.ctaLink ?? settings.primaryButtonUrl ?? settings.buttonUrl ?? "";
  const secondaryCtaText = settings.secondaryCtaText ?? "";
  const secondaryCtaLink = settings.secondaryCtaLink ?? "";
  const currentImage = settings.image ?? settings.backgroundImage ?? settings.heroImage ?? "";

  const isHero =
    sectionType === "hero-banner" ||
    sectionType === "hero" ||
    sectionType === "HeroBanner" ||
    sectionType === "shop-hero" ||
    (typeof sectionType === "string" && sectionType.toLowerCase().includes("hero"));

  const variant = String(settings.variant || settings.heroVariant || "");
  const isPanelVariant = HERO_PANEL_VARIANTS.has(variant);
  const hasPanelValues = Boolean(
    settings.panelTitle ||
    settings.panelSubtitle ||
    settings.panelEyebrow ||
    settings.panelNote ||
    settings.panelMetricValue ||
    settings.panelMetricLabel ||
    settings.panelImage
  );

  const showPanelSection = isHero || hasPanelValues;

  // Detect active repeater array keys
  const arrayKeysInSettings = Object.keys(settings).filter(
    (k) => Array.isArray(settings[k]) && k !== "displayConditions" && k !== "visibilityConditions"
  );
  const repeaterKeys = [...arrayKeysInSettings];

  if (repeaterKeys.length === 0) {
    const st = (sectionType || "").toLowerCase();
    if (st.includes("faq") || st.includes("accord")) {
      repeaterKeys.push("questions");
    } else if (st.includes("feature")) {
      repeaterKeys.push("items");
    } else if (st.includes("review") || st.includes("testimonial")) {
      repeaterKeys.push("reviews");
    } else if (st.includes("tab")) {
      repeaterKeys.push("tabs");
    }
  }

  // Unregistered / extra primitive keys for clean fallback
  const systemKeys = new Set([
    "id",
    "type",
    "variant",
    "heroVariant",
    "displayConditions",
    "visibilityConditions",
    "customClasses",
    "animation",
    "layout",
    "responsive",
    "_id",
    "customCss",
    "title",
    "heading",
    "subtitle",
    "description",
    "subheading",
    "eyebrow",
    "badge",
    "tagline",
    "ctaText",
    "primaryButtonText",
    "buttonText",
    "ctaLink",
    "primaryButtonUrl",
    "buttonUrl",
    "secondaryCtaText",
    "secondaryCtaLink",
    "image",
    "backgroundImage",
    "heroImage",
    "panelEyebrow",
    "panelTitle",
    "panelSubtitle",
    "panelNote",
    "panelMetricLabel",
    "panelMetricValue",
    "panelImage",
    ...repeaterKeys,
    ...(manifestEntry?.fields?.map((f: any) => f.name || f.key) || []),
  ]);

  const extraKeys = Object.keys(settings).filter(
    (k) =>
      !systemKeys.has(k) &&
      typeof settings[k] !== "object" &&
      typeof settings[k] !== "function"
  );

  return (
    <div className="space-y-3 select-none text-[11.5px] text-[#17181c]">
      {/* 1. Manifest-Driven Fields or Standard Fallback */}
      {hasManifestFields ? (
        <StudioManifestFieldsRenderer
          sectionType={sectionType}
          settings={settings}
          onUpdateField={onUpdateField}
          onOpenImagePicker={onOpenImagePicker}
          excludeKeys={repeaterKeys}
        />
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-[#6f747b]">العنوان الرئيسي</label>
              <StudioDynamicTokenPicker
                currentValue={title}
                onSelectToken={(t) => {
                  onUpdateField("title", t);
                  onUpdateField("heading", t);
                }}
              />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                onUpdateField("title", e.target.value);
                onUpdateField("heading", e.target.value);
              }}
              placeholder="أدخل عنوان القسم…"
              className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
            />
            {Boolean(settings.panelTitle && String(settings.panelTitle).trim()) && (
              <p className="text-[10px] text-amber-600 font-medium pt-0.5" data-testid="panel-title-hint">
                قالبك بيستخدم عنوان البطاقة — عدّله من مجموعة بطاقة الهيرو أدناه
              </p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-[#6f747b]">الوصف التوضيحي</label>
              <StudioDynamicTokenPicker
                currentValue={subtitle}
                onSelectToken={(t) => {
                  onUpdateField("subtitle", t);
                  onUpdateField("description", t);
                }}
              />
            </div>
            <textarea
              rows={2}
              value={subtitle}
              onChange={(e) => {
                onUpdateField("subtitle", e.target.value);
                onUpdateField("description", e.target.value);
              }}
              placeholder="أدخل تفاصيل ومحتوى إضافي…"
              className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-[#6f747b]">الشارة العلوية (Badge)</label>
              <StudioDynamicTokenPicker
                currentValue={eyebrow}
                onSelectToken={(t) => {
                  onUpdateField("eyebrow", t);
                  onUpdateField("badge", t);
                }}
              />
            </div>
            <input
              type="text"
              value={eyebrow}
              onChange={(e) => {
                onUpdateField("eyebrow", e.target.value);
                onUpdateField("badge", e.target.value);
              }}
              placeholder="مثال: خصم حصري • وصل حديثاً"
              className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-[#6f747b]">نص الزر</label>
                <StudioDynamicTokenPicker currentValue={ctaText} onSelectToken={(t) => onUpdateField("ctaText", t)} />
              </div>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => onUpdateField("ctaText", e.target.value)}
                placeholder="تسوق الآن"
                className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-[#6f747b]">رابط الزر</label>
                <StudioDynamicTokenPicker currentValue={ctaLink} onSelectToken={(t) => onUpdateField("ctaLink", t)} />
              </div>
              <div className="flex items-center rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 text-[#8a8f96] focus-within:border-[#2b6cf6] focus-within:bg-white">
                <LinkIcon className="h-3.5 w-3.5 shrink-0 me-1" />
                <input
                  type="text"
                  dir="ltr"
                  value={ctaLink}
                  onChange={(e) => onUpdateField("ctaLink", e.target.value)}
                  placeholder="/shop"
                  className="w-full bg-transparent py-1.5 text-[11.5px] text-[#17181c] outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {(isHero || Boolean(settings.secondaryCtaText || settings.secondaryCtaLink)) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#6f747b]">نص الزر الثانوي</label>
                <input
                  type="text"
                  value={secondaryCtaText}
                  onChange={(e) => onUpdateField("secondaryCtaText", e.target.value)}
                  placeholder="اكتشف المزيد"
                  className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#6f747b]">رابط الزر الثانوي</label>
                <div className="flex items-center rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 text-[#8a8f96] focus-within:border-[#2b6cf6] focus-within:bg-white">
                  <LinkIcon className="h-3.5 w-3.5 shrink-0 me-1" />
                  <input
                    type="text"
                    dir="ltr"
                    value={secondaryCtaLink}
                    onChange={(e) => onUpdateField("secondaryCtaLink", e.target.value)}
                    placeholder="/collections"
                    className="w-full bg-transparent py-1.5 text-[11.5px] text-[#17181c] outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <label className="block text-[10px] font-bold text-[#6f747b]">الصورة أو الخلفية</label>
            <div className="flex items-center gap-2">
              {currentImage ? (
                <img src={currentImage} alt="معاينة" className="h-10 w-14 shrink-0 rounded-md border border-[#ececee] object-cover" />
              ) : (
                <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-[#ececee] bg-[#f6f7f8] text-[#8a8f96]">
                  <PhotoIcon className="h-4 w-4" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onOpenImagePicker?.("image")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ececee] bg-[#f6f7f8] py-2 text-[11px] font-semibold text-[#17181c] hover:bg-[#ececee] transition-colors"
              >
                <PhotoIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
                <span>اختيار من مكتبة الصور</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hero Panel Group */}
      {showPanelSection && (
        <StudioHeroPanelGroup
          settings={settings}
          isPanelVariant={isPanelVariant}
          onUpdateField={onUpdateField}
          onOpenImagePicker={onOpenImagePicker}
        />
      )}

      {/* 3. Array Repeaters */}
      {repeaterKeys.map((key) => (
        <StudioArrayRepeaterControl
          key={key}
          arrayKey={key}
          items={Array.isArray(settings[key]) ? settings[key] : []}
          onUpdateField={onUpdateField}
          onOpenImagePicker={onOpenImagePicker}
        />
      ))}

      {/* 4. Additional / Unregistered Settings */}
      {extraKeys.length > 0 && (
        <details className="group rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2" data-testid="extra-settings-drawer">
          <summary className="flex cursor-pointer items-center justify-between text-[10.5px] font-bold text-[#6f747b] outline-none">
            <span>إعدادات إضافية ({extraKeys.length})</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-[#8a8f96] transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 space-y-2 pt-2 border-t border-[#ececee]">
            {extraKeys.map((k) => (
              <div key={k} className="space-y-1">
                <label className="block text-[9.5px] font-semibold text-[#6f747b]">{k}</label>
                <input
                  type="text"
                  data-testid={`input-extra-${k}`}
                  value={String(settings[k] ?? "")}
                  onChange={(e) => onUpdateField(k, e.target.value)}
                  className="w-full rounded border border-[#ececee] bg-white px-2 py-1 text-[11px] outline-none focus:border-[#2b6cf6]"
                />
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 5. Display Conditions */}
      <StudioDisplayConditionsControl
        conditions={settings.displayConditions ?? settings.visibilityConditions}
        onChangeConditions={(val) => onUpdateField("displayConditions", val)}
      />
    </div>
  );
};
