import React from "react";
import { Plus } from "lucide-react";
import { ProductFormData, Category, FieldErrors } from "../../types";
import { TagsInput } from "../shared/TagsInput";
import { InfoTooltip } from "../shared/InfoTooltip";
import RichTextEditor from "../../../../components/RichTextEditor";

interface BasicTabProps {
  formData: ProductFormData;
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  fieldErrors: FieldErrors;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  getInputClassName: (fieldName: keyof FieldErrors) => string;
  workflowLabel: string;
  t: any;
  onAddCategoryClick?: () => void;
}

export const BasicTab: React.FC<BasicTabProps> = ({
  formData,
  categories,
  categoriesLoading,
  categoriesError,
  fieldErrors,
  handleInputChange,
  setFormData,
  getInputClassName,
  workflowLabel,
  t,
  onAddCategoryClick,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Product Name */}
        <div className="col-span-1 sm:col-span-2">
          <label
            htmlFor="name"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t("products.productName")}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            className={`bg-white dark:bg-gray-700 block w-full shadow-xs text-base sm:text-lg border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3.5 ${getInputClassName(
              "name"
            )}`}
            placeholder={t("products.placeholders.productNamePlaceholder") as string}
          />
          {fieldErrors.name && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center">
              <span className="mx-1">⚠️</span> {fieldErrors.name}
            </p>
          )}
        </div>

        {/* Product Description */}
        <div className="col-span-1 sm:col-span-2">
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t("products.description")}
          </label>
          <div className="mt-1">
            <RichTextEditor
              value={formData.description}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  description: value,
                }))
              }
              placeholder={
                (t("products.placeholders.descriptionPlaceholder") as string) ||
                "اكتب وصف المنتج هنا..."
              }
              minHeight="200px"
            />
          </div>
        </div>

        {/* Size Guide - دليل المقاسات */}
        <div className="col-span-1 sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="sizeGuide"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              📏 دليل المقاسات
            </label>
            <span className="text-xs text-muted-foreground">
              (يظهر في صفحة المنتج ونافذة المقاسات)
            </span>
          </div>
          <div className="mt-1">
            <RichTextEditor
              value={formData.sizeGuide}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  sizeGuide: value,
                }))
              }
              placeholder="اكتب دليل المقاسات هنا... يمكنك تنسيق النصوص وتوسيطها وكتابة جداول أو نقاط للمقاسات والأوزان والأطوال"
              minHeight="140px"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            أدخل مقاسات المنتج وطريقة القياس. سيظهر هذا المحتوى لعملائك عند الضغط على زر &quot;دليل المقاسات&quot;.
          </p>
        </div>

        {/* Category */}
        <div className="col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("products.category")}
              <span className="text-red-500 mr-1">*</span>
            </label>
            <InfoTooltip text={t("products.categoryHelp") as string} />
          </div>
          <div className="flex rounded-lg shadow-xs">
            <select
              id="category"
              name="category"
              required
              value={formData.category}
              onChange={handleInputChange}
              className={`flex-1 min-w-0 block w-full rounded-r-none rounded-l-lg rtl:rounded-r-lg rtl:rounded-l-none bg-white dark:bg-gray-700 text-sm border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 ${getInputClassName(
                "category"
              )}`}
              disabled={categoriesLoading}
            >
              <option value="">
                {categoriesLoading
                  ? (t("products.messages.loadingCategories") as string)
                  : (t("products.placeholders.selectCategory") as string)}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onAddCategoryClick}
              title={t("categories.management.addCategory")}
              aria-label={t("categories.management.addCategory")}
              className="inline-flex items-center justify-center px-3 shrink-0 rounded-l-none rounded-r-lg rtl:rounded-l-lg rtl:rounded-r-none border border-l-0 rtl:border-r-0 rtl:border-l border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {categoriesError && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{categoriesError}</p>
          )}
          {fieldErrors.category && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center">
              <span className="mx-1">⚠️</span> {fieldErrors.category}
            </p>
          )}
        </div>

        {/* Slug */}
        <div className="col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="slug"
              className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("products.slug")}
            </label>
            <InfoTooltip text={t("products.tooltips.slugTooltip") as string} />
          </div>
          <div className="flex rounded-lg shadow-xs" dir="ltr">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400">
              /product/
            </span>
            <input
              type="text"
              name="slug"
              id="slug"
              value={formData.slug}
              onChange={handleInputChange}
              className={`flex-1 min-w-0 bg-white dark:bg-gray-700 block w-full px-3 py-2 rounded-none rounded-r-lg text-sm border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 ${getInputClassName(
                "slug"
              )}`}
              placeholder="custom-tshirt"
              dir="ltr"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("products.slugHelp")}
          </p>
        </div>

        {/* SKU */}
        <div className="col-span-1 sm:col-span-2">
          <label
            htmlFor="sku"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t("products.sku")}
          </label>
          <input
            type="text"
            name="sku"
            id="sku"
            value={formData.sku}
            onChange={handleInputChange}
            className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-xs focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2"
            placeholder="مثل: SHIRT-BLK-M"
            dir="ltr"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            رمز التخزين التعريفي للمنتج
          </p>
        </div>

        {/* Tags */}
        <div className="col-span-1 sm:col-span-2">
          <TagsInput
            tags={formData.tags}
            onAddTag={(tag) => setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))}
            onRemoveTag={(tag) =>
              setFormData((prev) => ({
                ...prev,
                tags: prev.tags.filter((t) => t !== tag),
              }))
            }
            label={t("products.tags")}
            placeholder={t("products.placeholders.tagsPlaceholder")}
          />
        </div>

        {/* Workflow Note */}
        <div className="col-span-1 sm:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/80 p-4 dark:border-indigo-900/40 dark:bg-indigo-900/20">
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-indigo-900 dark:text-indigo-200">
              حالة المنتج الحالية: {workflowLabel}
            </p>
            <p className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
              الحفظ كمسودة، الإرسال للمراجعة، الاعتماد، النشر وإلغاء النشر تتم من الشريط العلوي في الصفحة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
