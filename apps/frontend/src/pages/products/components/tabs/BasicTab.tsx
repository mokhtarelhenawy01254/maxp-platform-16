import React, { useState } from "react";
import { Plus } from "lucide-react";
import { ProductFormData, Category, FieldErrors } from "../../types";
import { TagsInput } from "../shared/TagsInput";
import { InfoTooltip } from "../shared/InfoTooltip";
import RichTextEditor from "../../../../components/RichTextEditor";
import { CategoryFormModal } from "../../../../components/category/CategoryFormModal";

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
  onCategoryCreated?: (category: Category) => void;
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
  onCategoryCreated,
}) => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Product Name */}
        <div className="col-span-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
            className={`mt-1 bg-white dark:bg-gray-700 block w-full shadow-sm sm:text-lg border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-3 ${getInputClassName(
              "name"
            )}`}
            placeholder={t("products.placeholders.productNamePlaceholder") as string}
          />
          {fieldErrors.name && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-500 flex items-center">
              <span className="mx-1">⚠️</span> {fieldErrors.name}
            </p>
          )}
        </div>

        {/* Product Description */}
        <div className="col-span-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
              minHeight="220px"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("products.category")}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <select
              id="category"
              name="category"
              required
              value={formData.category}
              onChange={handleInputChange}
              className={`flex-1 min-w-0 block w-full rounded-md bg-white dark:bg-gray-700 sm:text-sm border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 ${getInputClassName(
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
              onClick={() => setIsCategoryModalOpen(true)}
              title={t("categories.management.addCategory")}
              aria-label={t("categories.management.addCategory")}
              className="inline-flex items-center justify-center w-9 shrink-0 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-indigo-400"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {categoriesError && (
            <p className="mt-2 text-sm text-red-600">{categoriesError}</p>
          )}
          {fieldErrors.category && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <span className="mx-1">⚠️</span> {fieldErrors.category}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <span className="text-indigo-500 shrink-0">ℹ️</span>
            {t("products.categoryHelp")}
          </p>
        </div>

        {/* Slug */}
        <div>
          <label
            htmlFor="slug"
            className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("products.slug")}
            <InfoTooltip text={t("products.tooltips.slugTooltip") as string} />
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400">
              /product/
            </span>
            <input
              type="text"
              name="slug"
              id="slug"
              value={formData.slug}
              onChange={handleInputChange}
              className={`flex-1 min-w-0 bg-white dark:bg-gray-800 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 ${getInputClassName(
                "slug"
              )}`}
              placeholder="مثال: custom-tshirt"
              dir="ltr"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("products.slugHelp")}
          </p>
        </div>

        {/* SKU */}
        <div>
          <label
            htmlFor="sku"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("products.sku")}
          </label>
          <input
            type="text"
            name="sku"
            id="sku"
            value={formData.sku}
            onChange={handleInputChange}
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
            placeholder="مثل: SHIRT-BLK-M"
            dir="ltr"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            رمز التخزين التعريفي للمنتج
          </p>
        </div>

        {/* Tags */}
        <div className="col-span-2">
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
        <div className="col-span-2 rounded-lg border border-indigo-100 bg-indigo-50/80 p-4 dark:border-indigo-900/40 dark:bg-indigo-900/20">
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-indigo-900 dark:text-indigo-200">
              حالة المنتج الحالية: {workflowLabel}
            </p>
            <p className="text-indigo-700 dark:text-indigo-300">
              الحفظ كمسودة، الإرسال للمراجعة، الاعتماد، النشر وإلغاء النشر تتم من الشريط العلوي في الصفحة.
            </p>
          </div>
        </div>
      </div>

      <CategoryFormModal
        open={isCategoryModalOpen}
        editingCategory={null}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={(category) => {
          onCategoryCreated?.(category as Category);
          setFormData((prev) => ({
            ...prev,
            category: category.id,
          }));
        }}
      />
    </div>
  );
};
