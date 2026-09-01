import React, { useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  ChevronUpDownIcon,
  EyeIcon,
  PaintBrushIcon,
  PhotoIcon,
  RectangleGroupIcon,
  SparklesIcon,
  SwatchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getStorefrontSectionLabel, getStorefrontSectionManifest } from "../sections/manifest";
import type { StudioInspectorTab } from "./StudioTypes";

interface StudioPropertyInspectorProps {
  selectedSectionKey: string;
  sectionConfig: any;
  onClose: () => void;
  onUpdateField: (field: string, value: any) => void;
  onOpenImagePicker?: () => void;
}

export const StudioPropertyInspector: React.FC<StudioPropertyInspectorProps> = ({
  selectedSectionKey,
  sectionConfig,
  onClose,
  onUpdateField,
  onOpenImagePicker,
}) => {
  const [activeTab, setActiveTab] = useState<StudioInspectorTab>("content");

  if (!selectedSectionKey || !sectionConfig) {
    return (
      <aside className="flex h-full w-full flex-col items-center justify-center p-6 text-center border-s border-border/80 bg-card/95 backdrop-blur-md select-none">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
          <AdjustmentsHorizontalIcon className="h-6 w-6" />
        </div>
        <h3 className="text-xs font-black text-foreground">مفتش الخصائص</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground max-w-[220px]">
          انقر على أي قسم من شجرة الهيكل أو من المعاينة الحية لتعديل محتواه وألوانه وصوره فوراً.
        </p>
      </aside>
    );
  }

  const sectionType = typeof sectionConfig === "string" ? sectionConfig : sectionConfig.type;
  const label = getStorefrontSectionLabel(sectionType);
  const manifest = getStorefrontSectionManifest(sectionType);

  // Extract flattened settings for easy reading
  const settings = (typeof sectionConfig === "object" && sectionConfig !== null)
    ? { ...(sectionConfig.settings || {}), ...sectionConfig }
    : {};

  const getVal = (key: string, fallback = ""): string => {
    const v = settings[key];
    if (v === undefined || v === null) return fallback;
    return String(v);
  };

  const title = getVal("title") || getVal("heading");
  const subtitle = getVal("subtitle") || getVal("description") || getVal("subheading");
  const eyebrow = getVal("eyebrow") || getVal("badge") || getVal("tagline");
  const ctaText = getVal("ctaText") || getVal("primaryButtonText") || getVal("buttonText") || getVal("primaryText");
  const ctaLink = getVal("ctaLink") || getVal("primaryButtonUrl") || getVal("buttonUrl") || getVal("primaryHref") || getVal("link");
  const secondaryCtaText = getVal("secondaryCtaText") || getVal("secondaryButtonText") || getVal("secondaryText");
  const secondaryCtaLink = getVal("secondaryCtaLink") || getVal("secondaryButtonUrl") || getVal("secondaryHref");
  const currentImage = getVal("image") || getVal("backgroundImage") || getVal("heroImage") || getVal("bannerImage");
  const currentVariant = getVal("variant", manifest?.variants?.[0]?.id || "");
  const bgColor = getVal("backgroundColor") || getVal("bgColor") || "#ffffff";
  const textColor = getVal("textColor") || "#0f172a";
  const spacing = getVal("spacing", "normal");
  const align = getVal("align", "right");
  const pixelEvent = getVal("pixelEvent", "InitiateCheckout");
  const badgeText = getVal("badgeText", "");
  const stockCount = getVal("stockCount", "");

  return (
    <aside className="flex h-full w-full flex-col border-s border-border/80 bg-card/95 backdrop-blur-md">
      {/* 1. Inspector Header */}
      <div className="flex items-center justify-between border-b border-border/80 p-3 bg-muted/20">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-xs font-black text-foreground">{label}</h3>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              محدد للتعديل
            </span>
          </div>
          <p className="truncate text-[10px] text-muted-foreground font-mono mt-0.5">{sectionType}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="إغلاق اللوحة"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Tabs Switcher (Content / Style / Commerce / Visibility) */}
      <div className="flex border-b border-border/80 p-1.5 gap-1 bg-background/50 overflow-x-auto [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition-all shrink-0 px-2 ${
            activeTab === "content"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          <span>المحتوى</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("style")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition-all shrink-0 px-2 ${
            activeTab === "style"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <PaintBrushIcon className="h-3.5 w-3.5" />
          <span>المظهر</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("commerce")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition-all shrink-0 px-2 ${
            activeTab === "commerce"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <ChartBarIcon className="h-3.5 w-3.5" />
          <span>التجارة</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("visibility")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-bold transition-all shrink-0 px-2 ${
            activeTab === "visibility"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <EyeIcon className="h-3.5 w-3.5" />
          <span>الظهور</span>
        </button>
      </div>

      {/* 3. Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs [scrollbar-width:none]">
        {activeTab === "content" ? (
          <div className="space-y-4">
            {/* Variant Selector (if available) */}
            {manifest?.variants && manifest.variants.length > 1 && (
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1.5 flex items-center gap-1">
                  <RectangleGroupIcon className="h-3.5 w-3.5 text-primary" />
                  <span>شكل وتصميم القسم (Variant)</span>
                </label>
                <select
                  value={currentVariant}
                  onChange={(e) => onUpdateField("variant", e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                >
                  {manifest.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Eyebrow / Tagline */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                شارة أو نص علوي (Eyebrow)
              </label>
              <input
                type="text"
                value={eyebrow}
                onChange={(e) => onUpdateField("eyebrow", e.target.value)}
                placeholder="مثال: خصم حصري، وصل حديثاً..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Main Title */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                العنوان الرئيسي
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  onUpdateField("title", e.target.value);
                  onUpdateField("heading", e.target.value);
                }}
                placeholder="أدخل عنوان القسم..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                الوصف / العنوان الفرعي
              </label>
              <textarea
                rows={3}
                value={subtitle}
                onChange={(e) => {
                  onUpdateField("subtitle", e.target.value);
                  onUpdateField("description", e.target.value);
                }}
                placeholder="اكتب وصفاً جذاباً للقسم..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Image Upload / Media Library */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                صورة القسم أو الخلفية
              </label>
              {currentImage ? (
                <div className="relative mb-2 overflow-hidden rounded-xl border border-border group">
                  <img
                    src={currentImage}
                    alt="Section preview"
                    className="h-24 w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenImagePicker}
                      className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-black shadow"
                    >
                      تغيير الصورة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateField("image", "");
                        onUpdateField("backgroundImage", "");
                      }}
                      className="rounded-lg bg-red-600/90 px-2 py-1 text-[10px] font-bold text-white shadow"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={onOpenImagePicker}
                className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border bg-background/60 p-3 hover:border-primary hover:bg-primary/[0.02] transition-all text-start"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <PhotoIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">
                      {currentImage ? "اختيار صورة بديلة" : "اختيار أو رفع صورة"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">مكتبة وسائط المتجر والمنتجات</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Primary Action Button */}
            <div className="rounded-2xl border border-border/80 bg-background/40 p-3 space-y-3">
              <span className="block text-[11px] font-bold text-primary">زر الإجراء الرئيسي (Primary CTA)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                    نص الزر
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => {
                      onUpdateField("ctaText", e.target.value);
                      onUpdateField("primaryButtonText", e.target.value);
                      onUpdateField("buttonText", e.target.value);
                    }}
                    placeholder="مثال: تسوق الآن"
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                    الرابط
                  </label>
                  <input
                    type="text"
                    value={ctaLink}
                    onChange={(e) => {
                      onUpdateField("ctaLink", e.target.value);
                      onUpdateField("primaryButtonUrl", e.target.value);
                      onUpdateField("primaryHref", e.target.value);
                    }}
                    placeholder="/collections"
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Secondary Action Button */}
            <div className="rounded-2xl border border-border/80 bg-background/40 p-3 space-y-3">
              <span className="block text-[11px] font-bold text-muted-foreground">زر ثانوي (اختياري)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                    نص الزر
                  </label>
                  <input
                    type="text"
                    value={secondaryCtaText}
                    onChange={(e) => {
                      onUpdateField("secondaryCtaText", e.target.value);
                      onUpdateField("secondaryButtonText", e.target.value);
                    }}
                    placeholder="مثال: اكتشف المزيد"
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                    الرابط
                  </label>
                  <input
                    type="text"
                    value={secondaryCtaLink}
                    onChange={(e) => {
                      onUpdateField("secondaryCtaLink", e.target.value);
                      onUpdateField("secondaryButtonUrl", e.target.value);
                      onUpdateField("secondaryHref", e.target.value);
                    }}
                    placeholder="/about"
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "style" ? (
          <div className="space-y-4">
            {/* Spacing / Vertical Padding */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                الهوامش والمسافات الرأسية (Vertical Padding)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "compact", label: "مدمج (صغير)" },
                  { id: "normal", label: "قياسي (متوسط)" },
                  { id: "spacious", label: "رحب (كبير)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onUpdateField("spacing", item.id)}
                    className={`rounded-xl border py-2 text-[11px] font-bold transition-all ${
                      spacing === item.id
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Alignment */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                محاذاة النصوص
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "right", label: "يمين (RTL)" },
                  { id: "center", label: "في المنتصف" },
                  { id: "left", label: "يسار (LTR)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onUpdateField("align", item.id)}
                    className={`rounded-xl border py-2 text-[11px] font-bold transition-all ${
                      align === item.id
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Color */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5 flex items-center gap-1">
                <SwatchIcon className="h-3.5 w-3.5 text-primary" />
                <span>لون خلفية القسم</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => {
                    onUpdateField("backgroundColor", e.target.value);
                    onUpdateField("bgColor", e.target.value);
                  }}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => {
                    onUpdateField("backgroundColor", e.target.value);
                    onUpdateField("bgColor", e.target.value);
                  }}
                  placeholder="#ffffff"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground font-mono"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5 flex items-center gap-1">
                <SwatchIcon className="h-3.5 w-3.5 text-primary" />
                <span>لون النصوص الأساسي</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => onUpdateField("textColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => onUpdateField("textColor", e.target.value)}
                  placeholder="#0f172a"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground font-mono"
                />
              </div>
            </div>
          </div>
        ) : activeTab === "commerce" ? (
          /* Commerce, Urgency & Ad Tracking Tab */
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-3 space-y-3">
              <span className="block text-[11px] font-black text-primary">تتبع بكسل الحملات (Ad Pixels Event)</span>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                عند النقر على زر الإجراء في هذا القسم، سيتم إرسال هذا الحدث فوراً لبيكسل Meta و TikTok و Snapchat.
              </p>
              <select
                value={pixelEvent}
                onChange={(e) => onUpdateField("pixelEvent", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
              >
                <option value="InitiateCheckout">بدء الدفع (InitiateCheckout)</option>
                <option value="AddToCart">إضافة للسلة (AddToCart)</option>
                <option value="ViewContent">مشاهدة محتوى (ViewContent)</option>
                <option value="Lead">تسجيل اهتمام / ليد (Lead)</option>
                <option value="Purchase">شراء مباشر (Purchase)</option>
              </select>
            </div>

            {/* Urgency & Stock Badge */}
            <div className="rounded-2xl border border-border bg-background/50 p-3 space-y-3">
              <span className="block text-[11px] font-bold text-foreground">شارات التحفيز والمخزون المتبقي (FOMO)</span>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                  نص شارة العرض (Badge)
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => onUpdateField("badgeText", e.target.value)}
                  placeholder="مثال: شحن مجاني اليوم فقط • دفع عند الاستلام"
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                  تنبيه المخزون المتبقي (اختياري)
                </label>
                <input
                  type="text"
                  value={stockCount}
                  onChange={(e) => onUpdateField("stockCount", e.target.value)}
                  placeholder="مثال: متبقي 3 قطع فقط في المستودع"
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Visibility Tab */
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">إظهار على الهواتف المحمولة</p>
                  <p className="text-[10px] text-muted-foreground">شاشات الموبايل والتابلت الصغير</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <div>
                  <p className="font-bold text-foreground">إظهار على أجهزة الكمبيوتر</p>
                  <p className="text-[10px] text-muted-foreground">الشاشات الكبيرة واللابتوب</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
