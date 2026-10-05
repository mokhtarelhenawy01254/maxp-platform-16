import React, { useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  EyeIcon,
  PaintBrushIcon,
  PhotoIcon,
  PlusIcon,
  RectangleGroupIcon,
  SparklesIcon,
  SwatchIcon,
  TrashIcon,
  XMarkIcon,
  ListBulletIcon,
  LinkIcon,
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
  const [activeSubItemIndex, setActiveSubItemIndex] = useState<number | null>(0);
  const [showDirectUrlInput, setShowDirectUrlInput] = useState<boolean>(false);

  if (!selectedSectionKey || !sectionConfig) {
    return (
      <aside className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center border-s border-border/80 bg-card/95 backdrop-blur-md select-none">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 end-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="إغلاق اللوحة"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
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

  // Flatten settings
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

  // Product specific settings
  const productSource = getVal("productSource", "all");
  const productColumns = getVal("columns", "4");
  const showQuickBuy = settings["showQuickBuy"] !== false;

  // Sub-items array for repeaters
  const items: any[] = Array.isArray(settings.items)
    ? settings.items
    : Array.isArray(settings.features)
    ? settings.features
    : Array.isArray(settings.cards)
    ? settings.cards
    : Array.isArray(settings.questions)
    ? settings.questions
    : Array.isArray(settings.reviews)
    ? settings.reviews
    : [];

  const hasRepeatableItems = items.length > 0 || [
    "features-bar",
    "trust-badges",
    "offer-bento",
    "faq-accordion",
    "customer-reviews",
    "featured-collections",
    "category-grid",
  ].includes(sectionType);

  const handleUpdateItem = (index: number, field: string, val: any) => {
    const nextItems = [...items];
    nextItems[index] = {
      ...(nextItems[index] || {}),
      [field]: val,
    };
    onUpdateField("items", nextItems);
    onUpdateField("features", nextItems);
    onUpdateField("cards", nextItems);
    onUpdateField("questions", nextItems);
    onUpdateField("reviews", nextItems);
  };

  const handleAddItem = () => {
    const newItem = {
      title: "عنصر جديد",
      subtitle: "وصف تفصيلي للعنصر...",
      description: "وصف تفصيلي...",
      icon: "✨",
      question: "سؤال جديد؟",
      answer: "إجابة توضيحية للعميل...",
      name: "اسم العميل",
      rating: 5,
      comment: "تجربة ممتازة ومنتج رائع!",
      badge: "عرض خاص",
      link: "/collections",
    };
    const nextItems = [...items, newItem];
    onUpdateField("items", nextItems);
    onUpdateField("features", nextItems);
    onUpdateField("cards", nextItems);
    onUpdateField("questions", nextItems);
    onUpdateField("reviews", nextItems);
    setActiveSubItemIndex(nextItems.length - 1);
  };

  const handleDeleteItem = (index: number) => {
    const nextItems = items.filter((_, idx) => idx !== index);
    onUpdateField("items", nextItems);
    onUpdateField("features", nextItems);
    onUpdateField("cards", nextItems);
    onUpdateField("questions", nextItems);
    onUpdateField("reviews", nextItems);
    if (activeSubItemIndex === index) {
      setActiveSubItemIndex(nextItems.length > 0 ? 0 : null);
    }
  };

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

      {/* 2. Tabs Switcher (Content / Style / Visibility) */}
      <div className="flex border-b border-border/80 p-1.5 gap-1 bg-background/50">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-all ${
            activeTab === "content"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <SparklesIcon className="h-4 w-4" />
          <span>المحتوى</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("style")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-all ${
            activeTab === "style"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <PaintBrushIcon className="h-4 w-4" />
          <span>المظهر والمسافات</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("visibility")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-all ${
            activeTab === "visibility"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <EyeIcon className="h-4 w-4" />
          <span>الظهور والأجهزة</span>
        </button>
      </div>

      {/* 3. Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs [scrollbar-width:none]">
        {activeTab === "content" ? (
          <div className="space-y-4">
            {/* Variant Selector */}
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

            {/* Product Specific Controls */}
            {["featured-products", "product-grid", "flash-sale"].includes(sectionType) && (
              <div className="rounded-2xl border border-border/80 bg-background/50 p-3 space-y-3">
                <span className="block text-[11px] font-black text-primary">إعدادات شبكة المنتجات</span>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                    مصدر المنتجات
                  </label>
                  <select
                    value={productSource}
                    onChange={(e) => onUpdateField("productSource", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="all">جميع المنتجات (الأحدث)</option>
                    <option value="best-sellers">الأكثر مبيعاً</option>
                    <option value="featured">المنتجات المميزة فقط</option>
                    <option value="discounted">منتجات العروض والتخفيضات</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      عدد الأعمدة (الكمبيوتر)
                    </label>
                    <select
                      value={productColumns}
                      onChange={(e) => onUpdateField("columns", e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="2">عمودين (2)</option>
                      <option value="3">3 أعمدة</option>
                      <option value="4">4 أعمدة</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={showQuickBuy}
                        onChange={(e) => onUpdateField("showQuickBuy", e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-[10px] font-bold text-foreground">زر شراء سريع</span>
                    </label>
                  </div>
                </div>
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

            {/* Repeatable Sub-Items Section (Repeaters) */}
            {hasRepeatableItems && (
              <div className="rounded-2xl border border-border/80 bg-background/50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ListBulletIcon className="h-4 w-4 text-primary" />
                    <span className="font-black text-foreground">العناصر والكروت الفرعية ({items.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary/20"
                  >
                    <PlusIcon className="h-3 w-3" />
                    <span>إضافة عنصر</span>
                  </button>
                </div>

                {/* Sub items tabs/pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {items.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSubItemIndex(idx)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all shrink-0 ${
                        activeSubItemIndex === idx
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      <span>{item.title || item.question || item.name || `عنصر ${idx + 1}`}</span>
                    </button>
                  ))}
                </div>

                {/* Active Sub-item Form */}
                {activeSubItemIndex !== null && items[activeSubItemIndex] && (
                  <div className="rounded-xl border border-border bg-card p-3 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <span className="font-bold text-foreground">
                        تعديل: {items[activeSubItemIndex].title || items[activeSubItemIndex].question || `عنصر ${activeSubItemIndex + 1}`}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(activeSubItemIndex)}
                          className="text-[10px] font-bold text-destructive hover:underline flex items-center gap-1"
                        >
                          <TrashIcon className="h-3 w-3" />
                          <span>حذف هذا العنصر</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                        العنوان / السؤال
                      </label>
                      <input
                        type="text"
                        value={items[activeSubItemIndex].title || items[activeSubItemIndex].question || items[activeSubItemIndex].name || ""}
                        onChange={(e) => {
                          handleUpdateItem(activeSubItemIndex, "title", e.target.value);
                          handleUpdateItem(activeSubItemIndex, "question", e.target.value);
                          handleUpdateItem(activeSubItemIndex, "name", e.target.value);
                        }}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                        الوصف / الإجابة / الرأي
                      </label>
                      <textarea
                        rows={2}
                        value={items[activeSubItemIndex].subtitle || items[activeSubItemIndex].description || items[activeSubItemIndex].answer || items[activeSubItemIndex].comment || ""}
                        onChange={(e) => {
                          handleUpdateItem(activeSubItemIndex, "subtitle", e.target.value);
                          handleUpdateItem(activeSubItemIndex, "description", e.target.value);
                          handleUpdateItem(activeSubItemIndex, "answer", e.target.value);
                          handleUpdateItem(activeSubItemIndex, "comment", e.target.value);
                        }}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
                      />
                    </div>

                    {/* Optional Badge / Link */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                          شارة أو أيقونة
                        </label>
                        <input
                          type="text"
                          value={items[activeSubItemIndex].badge || items[activeSubItemIndex].icon || ""}
                          onChange={(e) => {
                            handleUpdateItem(activeSubItemIndex, "badge", e.target.value);
                            handleUpdateItem(activeSubItemIndex, "icon", e.target.value);
                          }}
                          placeholder="مثال: 🔥 خصم 20%"
                          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                          الرابط
                        </label>
                        <input
                          type="text"
                          value={items[activeSubItemIndex].link || items[activeSubItemIndex].href || ""}
                          onChange={(e) => {
                            handleUpdateItem(activeSubItemIndex, "link", e.target.value);
                            handleUpdateItem(activeSubItemIndex, "href", e.target.value);
                          }}
                          placeholder="/collections"
                          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Image Upload & Direct URL Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-foreground">
                  صورة القسم أو الخلفية
                </label>
                <button
                  type="button"
                  onClick={() => setShowDirectUrlInput(!showDirectUrlInput)}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <LinkIcon className="h-3 w-3" />
                  <span>{showDirectUrlInput ? "إغلاق الرابط" : "لصق رابط مباشر"}</span>
                </button>
              </div>

              {showDirectUrlInput && (
                <input
                  type="text"
                  value={currentImage}
                  onChange={(e) => {
                    onUpdateField("image", e.target.value);
                    onUpdateField("backgroundImage", e.target.value);
                  }}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                />
              )}

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
                      {currentImage ? "اختيار صورة بديلة من المكتبة" : "اختيار أو رفع صورة"}
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
        ) : (
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
