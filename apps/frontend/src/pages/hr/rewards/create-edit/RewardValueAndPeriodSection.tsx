import React from "react";
import { Calendar, RefreshCw, Save } from "lucide-react";
import { RewardFormData } from "./types";
import { DateInput } from '../../../../components/ui/DateInput';

interface RewardValueAndPeriodSectionProps {
  isEdit: boolean;
  saving: boolean;
  formData: RewardFormData;
  validationErrors: Record<string, string>;
  onChange: (field: keyof RewardFormData, value: string) => void;
  onCancel: () => void;
}

export const RewardValueAndPeriodSection: React.FC<
  RewardValueAndPeriodSectionProps
> = ({
  isEdit,
  saving,
  formData,
  validationErrors,
  onChange,
  onCancel,
}) => {
  return (
    <>
      {/* Period Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          الفترة الزمنية
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              تاريخ بداية الفترة <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={formData.periodStart}
              onChange={(e) => onChange("periodStart", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 font-mono tabular-nums ${
                validationErrors.periodStart
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {validationErrors.periodStart && (
              <p className="text-sm text-red-600 mt-1">
                {validationErrors.periodStart}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              تاريخ نهاية الفترة <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={formData.periodEnd}
              onChange={(e) => onChange("periodEnd", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 font-mono tabular-nums ${
                validationErrors.periodEnd
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {validationErrors.periodEnd && (
              <p className="text-sm text-red-600 mt-1">
                {validationErrors.periodEnd}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الشهر المطبق <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.appliedMonth}
              onChange={(e) => onChange("appliedMonth", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 font-mono tabular-nums ${
                validationErrors.appliedMonth
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            {validationErrors.appliedMonth && (
              <p className="text-sm text-red-600 mt-1">
                {validationErrors.appliedMonth}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              السنة المطبقة <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="2020"
              max="2030"
              value={formData.appliedYear}
              onChange={(e) => onChange("appliedYear", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 font-mono tabular-nums ${
                validationErrors.appliedYear
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {validationErrors.appliedYear && (
              <p className="text-sm text-red-600 mt-1">
                {validationErrors.appliedYear}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {isEdit ? "تحديث المكافأة" : "إضافة المكافأة"}
            </>
          )}
        </button>
      </div>
    </>
  );
};
