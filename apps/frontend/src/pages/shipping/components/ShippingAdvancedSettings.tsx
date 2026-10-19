import React from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { envConfig } from "../../../config/environment";
import type { ShippingCompanyFormData } from "../types";

export interface ShippingAdvancedSettingsProps {
  showAdvanced: boolean;
  setShowAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  formData: ShippingCompanyFormData;
  setFormData: React.Dispatch<React.SetStateAction<ShippingCompanyFormData>>;
  copyWebhookUrl: () => void;
}

export const ShippingAdvancedSettings: React.FC<ShippingAdvancedSettingsProps> = ({
  showAdvanced,
  setShowAdvanced,
  formData,
  setFormData,
  copyWebhookUrl,
}) => {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mt-3">
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-900/40 text-[11px] font-semibold text-gray-600 dark:text-gray-400 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        <span>خيارات متقدمة وروابط الاتصال (للمطورين)</span>
        <span className="text-[11px] text-gray-400 font-mono">{showAdvanced ? "▲ إخفاء" : "▼ إظهار"}</span>
      </button>

      {showAdvanced && (
        <div className="p-3.5 space-y-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              اسم العرض المسجل
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                نوع الناقل البرمجي (Provider)
              </label>
              <select
                value={formData.providerKey}
                onChange={(e) => setFormData((prev) => ({ ...prev, providerKey: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="QP_EXPRESS">كيو بي إكسبريس (QP Express)</option>
                <option value="BOSTA">بوستا (Bosta Courier)</option>
                <option value="TURBO">تربو (Turbo Courier)</option>
                <option value="MANUAL">أسطول يدوي / مناديب (Manual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                وضع التكامل
              </label>
              <select
                value={formData.integrationMode}
                onChange={(e) => setFormData((prev) => ({ ...prev, integrationMode: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="LIVE">مباشر حقيقي (LIVE API)</option>
                <option value="DEMO">بيئة تجريبية (Demo Sandbox)</option>
                <option value="MANUAL">يدوي بدون API (Manual)</option>
              </select>
            </div>
          </div>

          {formData.providerKey === "QP_EXPRESS" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  رابط السيرفر الخارجي (API Base URL)
                </label>
                <input
                  type="text"
                  value={formData.apiUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, apiUrl: e.target.value }))}
                  placeholder="https://qpxpress.com:8001"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  كود العميل اليدوي (يتم استخراجه آلياً)
                </label>
                <input
                  type="text"
                  value={formData.customerId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
                  placeholder="يكتشفه النظام تلقائياً"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Webhook URL */}
          <div className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-700/80 space-y-1">
            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              رابط الـ Webhook الخاص بنظامك لاستقبال التحديثات:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${envConfig.backendUrl}/api/v1/shipments/webhook`}
                className="flex-1 px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono text-gray-600 dark:text-gray-300"
              />
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-gray-700 dark:text-gray-200"
                title="نسخ"
              >
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
