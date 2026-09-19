import React from "react";
import { ProductFormData } from "../../types";
import { ProductSelect } from "../shared/ProductSelect";
import { ShippingClassOption } from "../../../../constants/shippingClasses";
import RichTextEditor, { DEFAULT_TABLE_TEMPLATE } from "../../../../components/RichTextEditor";


interface AdvancedTabProps {
  formData: ProductFormData;
  handleInputChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  setFormData?: React.Dispatch<React.SetStateAction<ProductFormData>>;
  shippingClassOptions: ShippingClassOption[];
  t: any;
  allProducts: any[];
  isLoadingProducts: boolean;
  relatedProducts: string[];
  setRelatedProducts: (val: string[]) => void;
  upsellProducts: string[];
  setUpsellProducts: (val: string[]) => void;
  crossSellProducts: string[];
  setCrossSellProducts: (val: string[]) => void;
  productMetadata?: Record<string, any>;
  setProductMetadata?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export const AdvancedTab: React.FC<AdvancedTabProps> = ({
  formData,
  handleInputChange,
  setFormData,
  shippingClassOptions,
  t,
  allProducts,
  isLoadingProducts,
  relatedProducts,
  setRelatedProducts,
  upsellProducts,
  setUpsellProducts,
  crossSellProducts,
  setCrossSellProducts,
  productMetadata,
  setProductMetadata,
}) => {
  const customAttributesList: Array<{
    key: string;
    label: string;
    placeholder?: string;
    required?: boolean;
  }> = React.useMemo(() => {
    if (!productMetadata) return [];
    if (Array.isArray(productMetadata.customAttributes)) {
      return productMetadata.customAttributes;
    }
    if (Array.isArray(productMetadata.customFields)) {
      return productMetadata.customFields;
    }
    return [];
  }, [productMetadata]);

  const hasCustomFields = customAttributesList.length > 0;

  const toggleCustomFields = () => {
    if (!setProductMetadata) return;
    if (hasCustomFields) {
      setProductMetadata((prev) => {
        const next = { ...prev };
        delete next.customAttributes;
        delete next.customFields;
        return next;
      });
    } else {
      setProductMetadata((prev) => ({
        ...prev,
        customAttributes: [
          {
            key: "carModel",
            label: "نوع وموديل وسنة صنع السيارة",
            placeholder: "مثال: هيونداي توسان 2022",
            required: true,
          },
        ],
      }));
    }
  };

  const addCustomField = () => {
    if (!setProductMetadata) return;
    const newField = {
      key: `field_${Date.now()}`,
      label: "تفاصيل أو مواصفات إضافية",
      placeholder: "اكتب التفاصيل هنا...",
      required: false,
    };
    setProductMetadata((prev) => ({
      ...prev,
      customAttributes: [...customAttributesList, newField],
    }));
  };

  const updateCustomField = (
    index: number,
    field: string,
    value: any,
  ) => {
    if (!setProductMetadata) return;
    const updated = [...customAttributesList];
    updated[index] = { ...updated[index], [field]: value };
    setProductMetadata((prev) => ({
      ...prev,
      customAttributes: updated,
    }));
  };

  const removeCustomField = (index: number) => {
    if (!setProductMetadata) return;
    const updated = customAttributesList.filter((_, i) => i !== index);
    setProductMetadata((prev) => ({
      ...prev,
      customAttributes: updated,
    }));
  };
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-3.5 sm:p-6 space-y-6 animate-fade-in">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t("products.advanced.title")}
      </h3>

      {/* Featured Product */}
      <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">
          {t("products.advanced.featured")}
        </h4>
        <div className="flex items-center">
          <input
            id="isFeatured"
            name="isFeatured"
            type="checkbox"
            checked={formData.isFeatured}
            onChange={handleInputChange}
            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
          <label
            htmlFor="isFeatured"
            className="mr-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            {t("products.advanced.featuredDesc")}
          </label>
        </div>
        <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">
          {t("products.advanced.featuredHint")}
        </p>

        {formData.isFeatured && (
          <div>
            <label
              htmlFor="featuredPriority"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("products.advanced.featuredPriority")}
            </label>
            <input
              type="number"
              id="featuredPriority"
              name="featuredPriority"
              value={formData.featuredPriority}
              onChange={handleInputChange}
              min="0"
              max="100"
              className="mt-1 block w-full md:w-1/3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("products.advanced.featuredPriorityHint")}
            </p>
          </div>
        )}
      </div>

      {/* Hidden Product */}
      <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">
          {t("products.advanced.isHidden")}
        </h4>
        <div className="flex items-center">
          <input
            id="isHidden"
            name="isHidden"
            type="checkbox"
            checked={formData.isHidden}
            onChange={handleInputChange}
            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
          <label
            htmlFor="isHidden"
            className="mr-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            {t("products.advanced.isHiddenDesc")}
          </label>
        </div>
        <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">
          {t("products.advanced.isHiddenHint")}
        </p>
      </div>

      {/* Fake Counter Toggle */}
      <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">
          عداد وهمي
        </h4>
        <div className="flex items-center">
          <input
            id="showFakeStock"
            name="showFakeStock"
            type="checkbox"
            checked={formData.showFakeStock}
            onChange={handleInputChange}
            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
          <label
            htmlFor="showFakeStock"
            className="mr-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            إظهار عداد وهمي للعملاء (3-12 قطعة) لخلق حالة من الاستعجال
          </label>
        </div>
      </div>

      {/* Shipping Settings */}
      <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">
          {t("products.advanced.shippingSettings")}
        </h4>

        <div>
          <label
            htmlFor="shippingClass"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t("products.advanced.shippingClass")}
          </label>
          <select
            id="shippingClass"
            name="shippingClass"
            value={formData.shippingClass}
            onChange={handleInputChange}
            className="mt-1 block w-full md:w-1/2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {shippingClassOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            تحدد تكلفة الشحن بناءً على نوع المنتج
          </p>
        </div>

        <div className="flex items-center">
          <input
            id="excludeFromFreeShipping"
            name="excludeFromFreeShipping"
            type="checkbox"
            checked={formData.excludeFromFreeShipping}
            onChange={handleInputChange}
            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
          <label
            htmlFor="excludeFromFreeShipping"
            className="mr-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            استثناء من الشحن المجاني
          </label>
        </div>
        <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">
          لن ينطبق عليه عروض الشحن المجاني حتى لو وصل الطلب للحد الأدنى
        </p>
      </div>

      {/* Checkout Settings */}
      <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">
          إعدادات الشراء
        </h4>
        <div className="flex items-center">
          <input
            id="enableCheckoutForm"
            name="enableCheckoutForm"
            type="checkbox"
            checked={formData.enableCheckoutForm}
            onChange={handleInputChange}
            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
          <label
            htmlFor="enableCheckoutForm"
            className="mr-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            تفعيل فورم الشيك أوت لهذا المنتج
          </label>
        </div>
        <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">
          يسمح للعملاء بإتمام الطلب مباشرة من صفحة المنتج
        </p>

        <div className="flex items-center">
          <input
            id="showAddToCartButton"
            name="showAddToCartButton"
            type="checkbox"
            checked={formData.showAddToCartButton}
            onChange={handleInputChange}
            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
          <label
            htmlFor="showAddToCartButton"
            className="mr-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            إظهار زر إضافة للسلة في صفحة المنتج
          </label>
        </div>
        <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">
          عند إلغاء التفعيل، لن يظهر زر "أضف للسلة"
        </p>
      </div>

      {/* External / Affiliate Checkout */}
      <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">
          External / Affiliate Product
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          اربط المنتج بمتجر أو شريك خارجي. يمكنك استخدامه كزر إضافي بجانب الشراء
          الداخلي أو كمنتج خارجي فقط.
        </p>

        <div className="flex items-center">
          <input
            id="externalOnly"
            name="externalOnly"
            type="checkbox"
            checked={Boolean(formData.externalOnly)}
            onChange={handleInputChange}
            className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
          <label
            htmlFor="externalOnly"
            className="mr-2 block text-sm text-gray-900 dark:text-gray-300"
          >
            منتج خارجي فقط
          </label>
        </div>
        <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">
          عند التفعيل، سيتم استبدال زر الشراء الداخلي في الثيم بزر يفتح رابط
          الشريك مباشرة.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="externalUrl"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              رابط الشراء الخارجي
            </label>
            <input
              type="url"
              id="externalUrl"
              name="externalUrl"
              value={formData.externalUrl || ""}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://partner-store.com/product"
            />
          </div>

          <div>
            <label
              htmlFor="externalButtonLabel"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              نص الزر الخارجي
            </label>
            <input
              type="text"
              id="externalButtonLabel"
              name="externalButtonLabel"
              value={formData.externalButtonLabel || ""}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Buy from partner"
            />
          </div>

          <div>
            <label
              htmlFor="externalVendor"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              اسم الشريك أو المتجر
            </label>
            <input
              type="text"
              id="externalVendor"
              name="externalVendor"
              value={formData.externalVendor || ""}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Amazon, Noon, Partner Store"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="externalDescription"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              وصف قصير
            </label>
            <textarea
              id="externalDescription"
              name="externalDescription"
              value={formData.externalDescription || ""}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="سيتم تحويل العميل إلى صفحة الشريك لإكمال الطلب."
            />
          </div>
        </div>
      </div>

      {/* Size Guide */}
      <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 p-4 transition-all">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📏</span>
              <div>
                <label
                  htmlFor="advancedSizeGuideToggle"
                  className="block text-sm font-bold text-gray-900 dark:text-gray-100 cursor-pointer"
                >
                  دليل المقاسات
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (يظهر في صفحة المنتج ونافذة المقاسات عند التفعيل)
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold ${
                  Boolean(formData.sizeGuide && formData.sizeGuide.trim())
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400"
                }`}
              >
                {Boolean(formData.sizeGuide && formData.sizeGuide.trim()) ? "مفعل" : "غير مفعل"}
              </span>
              <button
                id="advancedSizeGuideToggle"
                type="button"
                role="switch"
                aria-checked={Boolean(formData.sizeGuide && formData.sizeGuide.trim())}
                onClick={() => {
                  const isEnabled = Boolean(formData.sizeGuide && formData.sizeGuide.trim());
                  if (setFormData) {
                    if (isEnabled) {
                      setFormData((prev) => ({ ...prev, sizeGuide: "" }));
                    } else {
                      setFormData((prev) => ({ ...prev, sizeGuide: DEFAULT_TABLE_TEMPLATE }));
                    }
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  Boolean(formData.sizeGuide && formData.sizeGuide.trim())
                    ? "bg-indigo-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    Boolean(formData.sizeGuide && formData.sizeGuide.trim())
                      ? "translate-x-0"
                      : "-translate-x-5"
                  }`}
                />
              </button>
            </div>
          </div>

          {Boolean(formData.sizeGuide && formData.sizeGuide.trim()) ? (
            <div className="mt-3">
              {setFormData ? (
                <RichTextEditor
                  value={formData.sizeGuide}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      sizeGuide: value,
                    }))
                  }
                  placeholder="أدخل دليل المقاسات هنا... يمكنك تنسيق النصوص واستخدام القوائم والجداول"
                  minHeight="160px"
                  allowTableGrid={true}
                />
              ) : (
                <textarea
                  id="sizeGuide"
                  name="sizeGuide"
                  value={formData.sizeGuide}
                  onChange={handleInputChange}
                  rows={6}
                  className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="أدخل دليل المقاسات هنا... يمكنك استخدام Markdown أو HTML"
                />
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                يمكنك إضافة تفاصيل وجدول مقاسات للمنتج. سيظهر للعملاء في صفحة المنتج ونافذة المقاسات.
              </p>
            </div>
          ) : (
            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>دليل المقاسات غير مفعل لهذا المنتج. لن يظهر زر &quot;دليل المقاسات&quot; في صفحة المنتج بالمتجر.</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Checkout Fields for this product */}
      <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 p-4 transition-all">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <div>
                <label
                  htmlFor="advancedCustomFieldsToggle"
                  className="block text-sm font-bold text-gray-900 dark:text-gray-100 cursor-pointer"
                >
                  حقول مخصصة لطلب هذا المنتج (Custom Checkout Fields)
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (مثل: نوع وموديل وسنة صنع السيارة لمنتجات السيارات، أو اسم للنقش، أو مقاسات خاصة)
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold ${
                  hasCustomFields
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400"
                }`}
              >
                {hasCustomFields ? "مفعل" : "غير مفعل"}
              </span>
              <button
                id="advancedCustomFieldsToggle"
                type="button"
                role="switch"
                aria-checked={hasCustomFields}
                onClick={toggleCustomFields}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  hasCustomFields
                    ? "bg-indigo-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    hasCustomFields ? "translate-x-0" : "-translate-x-5"
                  }`}
                />
              </button>
            </div>
          </div>

          {hasCustomFields ? (
            <div className="mt-4 space-y-3">
              {customAttributesList.map((attr, idx) => (
                <div
                  key={attr.key || idx}
                  className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      الحقل رقم {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCustomField(idx)}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-semibold"
                    >
                      حذف الحقل
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        تسمية الحقل (العنوان الظاهر للعميل)
                      </label>
                      <input
                        type="text"
                        value={attr.label || ""}
                        onChange={(e) => updateCustomField(idx, "label", e.target.value)}
                        placeholder="مثال: نوع وموديل وسنة صنع السيارة"
                        className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        نص توضيحي (Placeholder)
                      </label>
                      <input
                        type="text"
                        value={attr.placeholder || ""}
                        onChange={(e) => updateCustomField(idx, "placeholder", e.target.value)}
                        placeholder="مثال: كيا سبورتاج 2023"
                        className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 p-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id={`attr_required_${idx}`}
                      checked={Boolean(attr.required)}
                      onChange={(e) => updateCustomField(idx, "required", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`attr_required_${idx}`} className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      حقل إجباري (يجب على العميل ملؤه لإتمام الطلب)
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addCustomField}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
              >
                + إضافة حقل إضافي آخر
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              الحقول المخصصة غير مفعلة لهذا المنتج. سيتم استخدام حقول المتجر العامة فقط في نموذج الطلب.
            </p>
          )}
        </div>
      </div>

      {/* Recommended Products */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">
          المنتجات المقترحة
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          حدد منتجات معينة لعرضها كتوصيات. سيتم دمجها مع التوصيات التلقائية من
          النظام.
        </p>

        <ProductSelect
          label="المنتجات المشابهة (Related Products)"
          description="منتجات من نفس الفئة أو مشابهة للمنتج الحالي"
          selectedIds={relatedProducts}
          onChange={setRelatedProducts}
          isLoading={isLoadingProducts}
          allProducts={allProducts}
        />

        <ProductSelect
          label="منتجات الترقية (Upsell Products)"
          description="منتجات أفضل وأغلى لتشجيع العميل على الترقية"
          selectedIds={upsellProducts}
          onChange={setUpsellProducts}
          isLoading={isLoadingProducts}
          allProducts={allProducts}
        />

        <ProductSelect
          label="منتجات مكملة (Cross-sell Products)"
          description="منتجات تُشترى عادة مع هذا المنتج"
          selectedIds={crossSellProducts}
          onChange={setCrossSellProducts}
          isLoading={isLoadingProducts}
          allProducts={allProducts}
        />

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-3 mt-4">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            ℹ️ <strong>ملاحظة:</strong> النظام يقترح منتجات تلقائياً بناءً على
            الفئة والطلبات السابقة. المنتجات المحددة هنا ستُضاف للتوصيات
            التلقائية.
          </p>
        </div>
      </div>
    </div>
  );
};
