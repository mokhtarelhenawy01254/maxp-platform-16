import React, { useId } from "react";

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
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/40 p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            تخصيص محتوى الصفحة الرئيسية
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
            هذه المرحلة تعطي الشركة تحكمًا مباشرًا في نصوص الـ hero والبانرات الثابتة بدون الحاجة إلى استوديو منفصل. أي حقل فارغ سيعود تلقائيًا للنص الافتراضي داخل القالب.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasOverrides}
          className={`px-4 py-2 rounded-md text-sm font-semibold ${
            hasOverrides
              ? "border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30"
              : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          تفريغ تخصيصات المحتوى
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-3 text-gray-500 dark:text-gray-400">
          <div>الأقسام القابلة للتخصيص الآن</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white">
            الواجهة الرئيسية / المنتجات المميزة / النشرة الإخبارية
          </div>
        </div>
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-3 text-gray-500 dark:text-gray-400">
          <div>حالة محتوى الصفحة الرئيسية</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white">
            {hasOverrides ? "مخصص للشركة الحالية" : "النسخة الافتراضية من القالب"}
          </div>
        </div>
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-3 text-gray-500 dark:text-gray-400">
          <div>طريقة العرض</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-white">
            معاينة من رابط المتجر الحالي
          </div>
        </div>
      </div>

      {editableSections.has("hero-banner") && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/20 p-5 space-y-4">
          <div>
            <h5 className="text-base font-semibold text-gray-900 dark:text-white"> بانر الواجهة (Hero Banner)</h5>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              غيّر العنوان الرئيسي، النص التسويقي، والأزرار. ويمكنك أيضًا إضافة صورة خلفية كبانر ثابت للقالب.
            </p>
          </div>

          <label htmlFor={getFieldId("hero-visible")} className="inline-flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              id={getFieldId("hero-visible")}
              type="checkbox"
              checked={draft.hero.visible}
              onChange={(e) => onUpdate("hero", "visible", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>إظهار قسم الـ Hero داخل الصفحة الرئيسية</span>
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label htmlFor={getFieldId("hero-title")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                العنوان الرئيسي
              </label>
              <input
                id={getFieldId("hero-title")}
                type="text"
                value={draft.hero.title}
                onChange={(e) => onUpdate("hero", "title", e.target.value)}
                placeholder="مثال: مجموعة رمضان الجديدة"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={getFieldId("hero-cta-text")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نص الزر الأساسي
              </label>
              <input
                id={getFieldId("hero-cta-text")}
                type="text"
                value={draft.hero.ctaText}
                onChange={(e) => onUpdate("hero", "ctaText", e.target.value)}
                placeholder="مثال: تسوق الآن"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={getFieldId("hero-cta-link")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رابط الزر الأساسي
              </label>
              <input
                id={getFieldId("hero-cta-link")}
                type="text"
                value={draft.hero.ctaLink}
                onChange={(e) => onUpdate("hero", "ctaLink", e.target.value)}
                placeholder="/shop أو https://..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="lg:col-span-2">
              <label htmlFor={getFieldId("hero-subtitle")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الوصف المختصر
              </label>
              <textarea
                id={getFieldId("hero-subtitle")}
                rows={3}
                value={draft.hero.subtitle}
                onChange={(e) => onUpdate("hero", "subtitle", e.target.value)}
                placeholder="وصف مختصر يظهر أسفل العنوان"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={getFieldId("hero-secondary-cta-text")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نص الزر الثانوي
              </label>
              <input
                id={getFieldId("hero-secondary-cta-text")}
                type="text"
                value={draft.hero.secondaryCtaText}
                onChange={(e) => onUpdate("hero", "secondaryCtaText", e.target.value)}
                placeholder="مثال: اعرف المزيد"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={getFieldId("hero-secondary-cta-link")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رابط الزر الثانوي
              </label>
              <input
                id={getFieldId("hero-secondary-cta-link")}
                type="text"
                value={draft.hero.secondaryCtaLink}
                onChange={(e) => onUpdate("hero", "secondaryCtaLink", e.target.value)}
                placeholder="/pages/about أو https://..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={getFieldId("hero-background-image")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رابط صورة البانر
              </label>
              <input
                id={getFieldId("hero-background-image")}
                type="url"
                value={draft.hero.backgroundImage}
                onChange={(e) => onUpdate("hero", "backgroundImage", e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">يفضل استخدام رابط صورة مباشر ثابت. لو تركته فارغًا سيعود التصميم الافتراضي للقالب.</p>
            </div>
            <div className="lg:col-span-2 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">صورة البانر الحالية</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">يمكنك رفع صورة جديدة أو اختيار صورة محفوظة من الحافظة، وسيتم ربطها مباشرة بحقل الخلفية.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onShowImagePicker}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    اختيار أو رفع صورة
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate("hero", "backgroundImage", "")}
                    disabled={!draft.hero.backgroundImage}
                    className={`px-4 py-2 rounded-md text-sm font-semibold ${
                      draft.hero.backgroundImage
                        ? "border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                        : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    إزالة الصورة
                  </button>
                </div>
              </div>

              {draft.hero.backgroundImage ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                  <img
                    src={draft.hero.backgroundImage}
                    alt="Hero background preview"
                    className="w-full max-h-72 object-cover"
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-10 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  لا توجد صورة بانر مخصصة حاليًا. سيتم استخدام الخلفية الافتراضية للقالب.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editableSections.has("featured-products") && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/20 p-5 space-y-4">
          <div>
            <h5 className="text-base font-semibold text-gray-900 dark:text-white">المنتجات المميزة (Featured Products)</h5>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">تحكم في عنوان قسم المنتجات الرئيسية داخل الصفحة الأولى.</p>
          </div>

          <label htmlFor={getFieldId("featured-products-visible")} className="inline-flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              id={getFieldId("featured-products-visible")}
              type="checkbox"
              checked={draft.featuredProducts.visible}
              onChange={(e) => onUpdate("featuredProducts", "visible", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>إظهار قسم المنتجات المميزة</span>
          </label>

          <div>
            <label htmlFor={getFieldId("featured-products-title")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              عنوان القسم
            </label>
            <input
              id={getFieldId("featured-products-title")}
              type="text"
              value={draft.featuredProducts.title}
              onChange={(e) => onUpdate("featuredProducts", "title", e.target.value)}
              placeholder="مثال: المنتجات الأكثر طلبًا"
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {editableSections.has("newsletter") && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/20 p-5 space-y-4">
          <div>
            <h5 className="text-base font-semibold text-gray-900 dark:text-white">النشرة الإخبارية / قسم الدعوة لاتخاذ إجراء (Newsletter / CTA)</h5>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">مناسب لرسائل الاشتراك، جمع العملاء المحتملين، أو CTA ختامي داخل الصفحة الرئيسية.</p>
          </div>

          <label htmlFor={getFieldId("newsletter-visible")} className="inline-flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              id={getFieldId("newsletter-visible")}
              type="checkbox"
              checked={draft.newsletter.visible}
              onChange={(e) => onUpdate("newsletter", "visible", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>إظهار قسم النشرة الإخبارية / CTA</span>
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label htmlFor={getFieldId("newsletter-title")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                عنوان القسم
              </label>
              <input
                id={getFieldId("newsletter-title")}
                type="text"
                value={draft.newsletter.title}
                onChange={(e) => onUpdate("newsletter", "title", e.target.value)}
                placeholder="مثال: اشترك وخليك أول من يعرف"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={getFieldId("newsletter-subtitle")} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                النص المساعد
              </label>
              <textarea
                id={getFieldId("newsletter-subtitle")}
                rows={3}
                value={draft.newsletter.subtitle}
                onChange={(e) => onUpdate("newsletter", "subtitle", e.target.value)}
                placeholder="نص قصير يشرح الفائدة من الاشتراك أو الإجراء"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorefrontHomeContentEditor;
