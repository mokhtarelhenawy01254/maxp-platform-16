import React from "react";
import { ProductFormData, FieldErrors } from "../../types";

interface InventoryTabProps {
  formData: ProductFormData;
  fieldErrors: FieldErrors;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  getInputClassName: (fieldName: keyof FieldErrors) => string;
  canEditStock?: boolean;
  stockLocationLabel?: string | null;
  t: any;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  formData,
  fieldErrors,
  handleInputChange,
  getInputClassName,
  canEditStock = true,
  stockLocationLabel,
  t,
}) => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t("products.tabs.inventory")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("products.inventory.description") || "إدارة معرفات المنتج والمخزون"}
        </p>
      </div>

      {/* Section 1: Product Identifiers */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          {t("products.inventory.identifiers") || "معرفات المنتج"}
        </h4>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("products.sku")}
            </label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="مثل: SHIRT-BLK-M"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              رمز التخزين التعريفي للمنتج
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("products.inventory.barcode") || "الباركود (Barcode / GTIN)"}
            </label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode || ""}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="أدخل رمز الباركود..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ISBN, UPC, GTIN أو أي رمز باركود آخر
            </p>
          </div>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Section 2: Stock Tracking */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          المخزون
        </h4>
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("products.inventory.trackInventory")}
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("products.inventory.trackInventoryHint")}
            </p>
          </div>
          <input
            type="checkbox"
            name="trackInventory"
            checked={formData.trackInventory}
            onChange={handleInputChange}
            disabled={!canEditStock}
            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
        </div>
        {formData.trackInventory && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("products.inventory.quantity")}
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                min="0"
                disabled={!canEditStock}
                className={`${getInputClassName("stock")} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400`}
                placeholder="0"
                aria-invalid={Boolean(fieldErrors.stock)}
              />
              {!canEditStock && stockLocationLabel && (
                <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {stockLocationLabel}
                </p>
              )}
              {fieldErrors.stock && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.stock}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("products.inventory.lowStockThreshold")}
              </label>
              <input
                type="number"
                name="lowStockThreshold"
                value={formData.lowStockThreshold}
                onChange={handleInputChange}
                min="0"
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="5"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("products.inventory.lowStockThresholdHint")}
              </p>
            </div>
          </div>
        )}
        {formData.trackInventory && (
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                السماح بالطلب عند نفاد المخزون (Backorders)
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                يتيح للعملاء الاستمرار في طلب المنتج حتى لو أصبحت الكمية 0 (مناسب للمنتجات المصنعة بالطلب أو المحجوزة مسبقاً)
              </p>
            </div>
            <input
              type="checkbox"
              name="allowBackorders"
              checked={Boolean(formData.allowBackorders)}
              onChange={handleInputChange}
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
            />
          </div>
        )}
        {!formData.trackInventory && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4 mt-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ℹ️ لن يتم تتبع المخزون لهذا المنتج. سيظهر كمتوفر دائماً للعملاء.
            </p>
          </div>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Section 3: Fake Stock (FOMO) */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          تسويق الندرة (FOMO)
        </h4>
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <div>
            <label className="text-sm font-medium text-amber-800 dark:text-amber-300">
              عرض مخزون وهمي
            </label>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              يُظهر للعميل كمية قليلة متبقية لتشجيعه على الشراء الفوري
            </p>
          </div>
          <input
            type="checkbox"
            name="showFakeStock"
            checked={formData.showFakeStock}
            onChange={handleInputChange}
            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Section 4: Pre-order */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          الطلب المسبق (Pre-order)
        </h4>
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              تفعيل الطلب المسبق
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              يتيح للعميل الطلب حتى قبل توفر المنتج
            </p>
          </div>
          <input
            type="checkbox"
            name="isPreOrder"
            checked={formData.isPreOrder || false}
            onChange={handleInputChange}
            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
        </div>
        {formData.isPreOrder && (
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                تاريخ توفر المنتج المتوقع
              </label>
              <input
                type="date"
                name="preOrderDate"
                value={formData.preOrderDate || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                رسالة الطلب المسبق
              </label>
              <textarea
                name="preOrderMessage"
                value={formData.preOrderMessage || ""}
                onChange={handleInputChange}
                rows={2}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="مثلاً: التوصيل سيبدأ من تاريخ..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
