import React from "react";
import { CampaignFormData } from "./types";
import { timezones } from "./constants";
import { DateInput } from '../../../components/ui/DateInput';

interface Step2BudgetScheduleProps {
  formData: CampaignFormData;
  handleInputChange: (field: keyof CampaignFormData, value: any) => void;
}

export const Step2BudgetSchedule: React.FC<Step2BudgetScheduleProps> = ({
  formData,
  handleInputChange,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        الميزانية والجدولة
      </h2>

      {/* Budget Optimization */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="budgetOptimization"
            checked={formData.budgetOptimization || false}
            onChange={(e) =>
              handleInputChange("budgetOptimization", e.target.checked)
            }
            className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <div className="flex-1">
            <label
              htmlFor="budgetOptimization"
              className="block text-sm font-medium text-gray-900 dark:text-white"
            >
              تفعيل Campaign Budget Optimization (CBO)
            </label>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              يسمح لـ Facebook بتوزيع الميزانية تلقائياً بين Ad Sets للحصول على أفضل نتائج
            </p>
          </div>
        </div>
      </div>

      {/* Budget Type */}
      <div>
        <label
          htmlFor="create-campaign-budget-type"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          نوع الميزانية *
        </label>
        <select
          id="create-campaign-budget-type"
          name="budgetType"
          autoComplete="off"
          value={formData.budgetType}
          onChange={(e) =>
            handleInputChange(
              "budgetType",
              e.target.value as "DAILY" | "LIFETIME",
            )
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="DAILY">ميزانية يومية</option>
          <option value="LIFETIME">ميزانية إجمالية</option>
        </select>
      </div>

      {/* Budget Amount */}
      <div>
        <label
          htmlFor="create-campaign-budget-amount"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          مبلغ الميزانية ({formData.budgetType === "DAILY" ? "يومياً" : "إجمالي"}) *
        </label>
        <div className="relative">
          <input
            id="create-campaign-budget-amount"
            name="budgetAmount"
            type="number"
            autoComplete="off"
            min="1"
            step="0.01"
            value={formData.budgetAmount}
            onChange={(e) =>
              handleInputChange(
                "budgetAmount",
                parseFloat(e.target.value) || 0,
              )
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono tabular-nums"
            placeholder="100"
          />
          <span className="absolute left-4 top-2 text-gray-500 dark:text-gray-400">EGP</span>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">الحد الأدنى: 1 EGP</p>
      </div>

      {/* Spend Limit */}
      <div>
        <label
          htmlFor="create-campaign-spend-limit"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          حد الإنفاق (اختياري)
        </label>
        <div className="relative">
          <input
            id="create-campaign-spend-limit"
            name="spendLimit"
            type="number"
            autoComplete="off"
            min="1"
            step="0.01"
            value={formData.spendLimit || ""}
            onChange={(e) =>
              handleInputChange(
                "spendLimit",
                e.target.value ? parseFloat(e.target.value) : undefined,
              )
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono tabular-nums"
            placeholder="حد أقصى للإنفاق"
          />
          <span className="absolute left-4 top-2 text-gray-500 dark:text-gray-400">EGP</span>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          حد أقصى للإنفاق على هذه الحملة (اختياري)
        </p>
      </div>

      {/* Timezone */}
      <div>
        <label
          htmlFor="create-campaign-timezone"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          المنطقة الزمنية
        </label>
        <select
          id="create-campaign-timezone"
          name="timezone"
          autoComplete="off"
          value={formData.timezone}
          onChange={(e) => handleInputChange("timezone", e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Start Date */}
      <div>
        <label
          htmlFor="create-campaign-start-date"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          تاريخ البدء (اختياري)
        </label>
        <DateInput
          autoComplete="off"
          value={formData.startDate}
          onChange={(e) => handleInputChange("startDate", e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* End Date */}
      <div>
        <label
          htmlFor="create-campaign-end-date"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          تاريخ الانتهاء (اختياري)
        </label>
        <DateInput
          autoComplete="off"
          value={formData.endDate}
          onChange={(e) => handleInputChange("endDate", e.target.value)}
          min={formData.startDate || new Date().toISOString().split("T")[0]}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  );
};
