import React from "react";
import { AlertCircle, Target, Eye, Globe, MessageCircle, ShoppingBag, Smartphone, Users } from "lucide-react";
import type { FormData } from "../types";
import { OBJECTIVES, SPECIAL_AD_CATEGORIES } from "../constants";

interface Step1CampaignProps {
  formData: FormData;
  handleChange: (field: keyof FormData, value: any) => void;
  toggleArrayValue: (field: keyof FormData, value: string) => void;
  getError: (field: string) => string;
}

export const Step1Campaign: React.FC<Step1CampaignProps> = ({
  formData,
  handleChange,
  toggleArrayValue,
  getError,
}) => {
  return (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          اسم الحملة <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.campaignName}
          onChange={(e) => handleChange("campaignName", e.target.value)}
          placeholder="مثال: حملة رمضان 2024"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            getError("campaignName")
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
        />
        {getError("campaignName") && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {getError("campaignName")}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            اسم Ad Set
          </label>
          <input
            type="text"
            value={formData.adSetName}
            onChange={(e) => handleChange("adSetName", e.target.value)}
            placeholder="مثال: Women Egypt - Broad"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            اسم الإعلان
          </label>
          <input
            type="text"
            value={formData.adName}
            onChange={(e) => handleChange("adName", e.target.value)}
            placeholder="مثال: Product Hook V1"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>

      {/* Objective */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          هدف الحملة <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {OBJECTIVES.map((obj) => (
            <button
              key={obj.value}
              type="button"
              onClick={() => handleChange("objective", obj.value)}
              className={`p-4 border-2 rounded-xl text-center transition-all ${
                formData.objective === obj.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              <div
                className={`mx-auto mb-2 ${formData.objective === obj.value ? "text-blue-500" : "text-gray-400"}`}
              >
                {obj.icon}
              </div>
              <div className="font-medium">{obj.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {obj.description}
              </div>
            </button>
          ))}
        </div>
        {getError("objective") && (
          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {getError("objective")}
          </p>
        )}
      </div>

      {/* Special Ad Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          فئة الإعلان الخاصة
        </label>
        <select
          value={formData.specialAdCategories[0] || "NONE"}
          onChange={(e) =>
            handleChange(
              "specialAdCategories",
              e.target.value === "NONE" ? [] : [e.target.value],
            )
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {SPECIAL_AD_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          إذا كان إعلانك يتعلق بالإسكان أو التوظيف أو الائتمان، يجب تحديد الفئة
          المناسبة
        </p>
      </div>

      {/* Conversion Events - للأهداف التي تحتاج تتبع */}
      {(formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS") && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            حدث التحويل
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            اختر الحدث الذي تريد تتبعه وتحسين الإعلان من أجله
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "PURCHASE", label: "شراء", icon: "🛒" },
              { value: "ADD_TO_CART", label: "إضافة للسلة", icon: "🛍️" },
              { value: "LEAD", label: "عميل محتمل", icon: "📝" },
              { value: "COMPLETE_REGISTRATION", label: "تسجيل", icon: "✅" },
              { value: "CONTACT", label: "تواصل", icon: "📞" },
              { value: "SUBSCRIBE", label: "اشتراك", icon: "📧" },
            ].map((event) => (
              <button
                key={event.value}
                type="button"
                className="p-3 bg-white border-2 border-green-300 rounded-lg hover:border-green-500 transition-colors text-right"
              >
                <span className="text-xl ml-2">{event.icon}</span>
                <span className="text-sm font-medium">{event.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 تأكد من تثبيت Facebook Pixel على موقعك لتتبع هذه الأحداث
          </p>
        </div>
      )}
    </div>
  );
};
