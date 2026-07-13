import React from "react";
import { ProductFormData } from "../../types";
import { ShippingClassOption } from "../../../../constants/shippingClasses";

interface ShippingTabProps {
  formData: ProductFormData;
  handleInputChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  handleDimensionChange: (
    field: "length" | "width" | "height",
    value: string,
  ) => void;
  shippingClassOptions: ShippingClassOption[];
  t: any;
}

export const ShippingTab: React.FC<ShippingTabProps> = ({
  formData,
  handleInputChange,
  handleDimensionChange,
  shippingClassOptions,
  t,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t("products.shipping.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          تفاصيل الشحن والأبعاد لحساب تكاليف التوصيل بدقة
        </p>
      </div>

      {/* Section 1: Weight */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          الوزن والأبعاد
        </h4>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <label
              htmlFor="weight"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("products.shipping.weight")}{" "}
              <span className="text-gray-400 font-normal">(كجم)</span>
            </label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={formData.weight || ""}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("products.shipping.length")}{" "}
              <span className="text-gray-400 font-normal">(سم)</span>
            </label>
            <input
              type="number"
              value={formData.dimensions?.length || ""}
              onChange={(e) => handleDimensionChange("length", e.target.value)}
              min="0"
              step="0.1"
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("products.shipping.width")}{" "}
              <span className="text-gray-400 font-normal">(سم)</span>
            </label>
            <input
              type="number"
              value={formData.dimensions?.width || ""}
              onChange={(e) => handleDimensionChange("width", e.target.value)}
              min="0"
              step="0.1"
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("products.shipping.height")}{" "}
              <span className="text-gray-400 font-normal">(سم)</span>
            </label>
            <input
              type="number"
              value={formData.dimensions?.height || ""}
              onChange={(e) => handleDimensionChange("height", e.target.value)}
              min="0"
              step="0.1"
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.0"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          أدخل الوزن والأبعاد الفعلية للمنتج لحساب تكاليف الشحن تلقائياً
        </p>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Section 2: Shipping Class */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          فئة الشحن
        </h4>
        <div className="max-w-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            فئة الشحن المطبقة
          </label>
          <select
            name="shippingClass"
            value={formData.shippingClass || "standard"}
            onChange={handleInputChange}
            className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {shippingClassOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            تحدد هذه الفئة طريقة احتساب سعر الشحن لهذا المنتج
          </p>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Section 3: Free Shipping Exclusion */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          الشحن المجاني
        </h4>
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <div>
            <label className="text-sm font-medium text-amber-800 dark:text-amber-300">
              استبعاد من عروض الشحن المجاني
            </label>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              إذا تم تفعيله، لن يستفيد هذا المنتج من عروض الشحن المجاني حتى لو
              تأهل الطلب
            </p>
          </div>
          <input
            type="checkbox"
            name="excludeFromFreeShipping"
            checked={formData.excludeFromFreeShipping || false}
            onChange={handleInputChange}
            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
          />
        </div>
      </div>
    </div>
  );
};
