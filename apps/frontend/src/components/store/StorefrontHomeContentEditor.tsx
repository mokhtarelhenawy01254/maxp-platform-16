import React, { useId } from "react";
import { Sliders, RotateCcw, Image, Trash2, CheckCircle2 } from "lucide-react";

export interface StorefrontHomeContent {
  hero: {
    visible: boolean;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
    backgroundImage: string;
  };
  featuredProducts: {
    visible: boolean;
    title: string;
  };
  newsletter: {
    visible: boolean;
    title: string;
    subtitle: string;
  };
}

interface StorefrontHomeContentEditorProps {
  draft: StorefrontHomeContent;
  editableSections: Set<string>;
  hasOverrides: boolean;
  onUpdate: (
    section: keyof StorefrontHomeContent,
    field: string,
    value: unknown,
  ) => void;
  onClear: () => void;
  onShowImagePicker: () => void;
}

const StorefrontHomeContentEditor: React.FC<StorefrontHomeContentEditorProps> = ({
  draft,
  editableSections,
  hasOverrides,
  onUpdate,
  onClear,
  onShowImagePicker,
}) => {
  const fieldIdPrefix = useId();
  const getFieldId = (field: string) => `${fieldIdPrefix}-${field}`;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 text-foreground shadow-none space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shrink-0 mt-0.5">
            <Sliders className="size-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              تخصيص نصوص وأقسام الواجهة الرئيسية
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground max-w-3xl leading-relaxed">
              تحكم مباشر في نصوص الواجهة والبانرات الترويجية. أي حقل تتركه فارغاً سيعود تلقائياً للنص الافتراضي داخل القالب.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasOverrides}
          className={`inline-flex h-9 items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
            hasOverrides
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
              : "border border-border/70 bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed"
          }`}
        >
          <RotateCcw className="size-3.5" />
          <span>تفريغ التخصيصات</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="text-muted-foreground text-[11px]">الأقسام القابلة للتخصيص</div>
          <div className="mt-1 font-bold text-foreground">
            بانر الواجهة / المنتجات / النشرة
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="text-muted-foreground text-[11px]">حالة المحتوى</div>
          <div className="mt-1 font-bold text-foreground flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${hasOverrides ? "bg-primary" : "bg-muted-foreground/40"}`} />
            <span>{hasOverrides ? "مخصص للشركة الحالية" : "النسخة الافتراضية للقالب"}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="text-muted-foreground text-[11px]">طريقة الحفظ</div>
          <div className="mt-1 font-bold text-foreground">
            تحديث فوري مع المعاينة الحية
          </div>
        </div>
      </div>

      {editableSections.has("hero-banner") && (
        <div className="rounded-xl border border-border/70 bg-card p-4.5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h5 className="text-xs font-bold text-foreground">بانر الواجهة (Hero Banner)</h5>
              <p className="text-[11px] text-muted-foreground">العنوان الرئيسي والنص التسويقي وأزرار التفاعل</p>
            </div>
            <label htmlFor={getFieldId("hero-visible")} className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                id={getFieldId("hero-visible")}
                type="checkbox"
                checked={draft.hero.visible}
                onChange={(e) => onUpdate("hero", "visible", e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>إظهار القسم</span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor={getFieldId("hero-title")} className="text-xs font-semibold text-foreground">
                العنوان الرئيسي
              </label>
              <input
                id={getFieldId("hero-title")}
                type="text"
                value={draft.hero.title}
                onChange={(e) => onUpdate("hero", "title", e.target.value)}
                placeholder="مثال: مجموعة الموسم الجديدة"
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={getFieldId("hero-cta-text")} className="text-xs font-semibold text-foreground">
                نص الزر الأساسي
              </label>
              <input
                id={getFieldId("hero-cta-text")}
                type="text"
                value={draft.hero.ctaText}
                onChange={(e) => onUpdate("hero", "ctaText", e.target.value)}
                placeholder="مثال: تسوق الآن"
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={getFieldId("hero-cta-link")} className="text-xs font-semibold text-foreground">
                رابط الزر الأساسي
              </label>
              <input
                id={getFieldId("hero-cta-link")}
                type="text"
                value={draft.hero.ctaLink}
                onChange={(e) => onUpdate("hero", "ctaLink", e.target.value)}
                placeholder="/shop أو https://..."
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={getFieldId("hero-secondary-cta-text")} className="text-xs font-semibold text-foreground">
                نص الزر الثانوي
              </label>
              <input
                id={getFieldId("hero-secondary-cta-text")}
                type="text"
                value={draft.hero.secondaryCtaText}
                onChange={(e) => onUpdate("hero", "secondaryCtaText", e.target.value)}
                placeholder="مثال: اعرف المزيد"
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="lg:col-span-2 space-y-1">
              <label htmlFor={getFieldId("hero-subtitle")} className="text-xs font-semibold text-foreground">
                الوصف التسويقي المختصر
              </label>
              <textarea
                id={getFieldId("hero-subtitle")}
                rows={2}
                value={draft.hero.subtitle}
                onChange={(e) => onUpdate("hero", "subtitle", e.target.value)}
                placeholder="نص تسويقي يظهر أسفل العنوان الرئيسي..."
                className="w-full rounded-xl border border-border/70 bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="lg:col-span-2 rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-foreground">صورة البانر المخصصة</div>
                  <p className="text-[11px] text-muted-foreground">ارفع صورة عالية الجودة أو اختر من الحافظة</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onShowImagePicker}
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all active:scale-[0.98]"
                  >
                    <Image className="size-3.5" />
                    <span>اختيار أو رفع صورة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate("hero", "backgroundImage", "")}
                    disabled={!draft.hero.backgroundImage}
                    className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold text-destructive transition-all hover:bg-destructive/10 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    <span>إزالة</span>
                  </button>
                </div>
              </div>

              {draft.hero.backgroundImage ? (
                <div className="overflow-hidden rounded-xl border border-border/70 bg-background max-h-56">
                  <img
                    src={draft.hero.backgroundImage}
                    alt="Hero background preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 py-6 px-4 text-center text-xs text-muted-foreground">
                  لا توجد صورة بانر مخصصة حالياً — سيتم استخدام الخلفية الأصلية للقالب
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editableSections.has("featured-products") && (
        <div className="rounded-xl border border-border/70 bg-card p-4.5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h5 className="text-xs font-bold text-foreground">قسم المنتجات المميزة (Featured Products)</h5>
              <p className="text-[11px] text-muted-foreground">التحكم في عنوان وشريط عرض أبرز المنتجات</p>
            </div>
            <label htmlFor={getFieldId("featured-products-visible")} className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                id={getFieldId("featured-products-visible")}
                type="checkbox"
                checked={draft.featuredProducts.visible}
                onChange={(e) => onUpdate("featuredProducts", "visible", e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>إظهار القسم</span>
            </label>
          </div>

          <div className="space-y-1">
            <label htmlFor={getFieldId("featured-products-title")} className="text-xs font-semibold text-foreground">
              عنوان القسم
            </label>
            <input
              id={getFieldId("featured-products-title")}
              type="text"
              value={draft.featuredProducts.title}
              onChange={(e) => onUpdate("featuredProducts", "title", e.target.value)}
              placeholder="مثال: المنتجات الأكثر طلباً"
              className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {editableSections.has("newsletter") && (
        <div className="rounded-xl border border-border/70 bg-card p-4.5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h5 className="text-xs font-bold text-foreground">النشرة الإخبارية / دعوة التفاعل (Newsletter / CTA)</h5>
              <p className="text-[11px] text-muted-foreground">قسم لجمع المشتركين أو رسائل دعوة اتخاذ الإجراء</p>
            </div>
            <label htmlFor={getFieldId("newsletter-visible")} className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                id={getFieldId("newsletter-visible")}
                type="checkbox"
                checked={draft.newsletter.visible}
                onChange={(e) => onUpdate("newsletter", "visible", e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>إظهار القسم</span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor={getFieldId("newsletter-title")} className="text-xs font-semibold text-foreground">
                عنوان النشرة
              </label>
              <input
                id={getFieldId("newsletter-title")}
                type="text"
                value={draft.newsletter.title}
                onChange={(e) => onUpdate("newsletter", "title", e.target.value)}
                placeholder="مثال: انضم لنادي عملائنا المميزين"
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={getFieldId("newsletter-subtitle")} className="text-xs font-semibold text-foreground">
                الوصف التوضيحي
              </label>
              <input
                id={getFieldId("newsletter-subtitle")}
                type="text"
                value={draft.newsletter.subtitle}
                onChange={(e) => onUpdate("newsletter", "subtitle", e.target.value)}
                placeholder="نص توضيحي لمزايا الاشتراك..."
                className="h-9.5 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorefrontHomeContentEditor;
