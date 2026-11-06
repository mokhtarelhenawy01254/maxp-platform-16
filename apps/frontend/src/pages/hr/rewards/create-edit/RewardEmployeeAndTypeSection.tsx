import React from "react";
import {
  Award,
  Clock,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { RewardEmployee, RewardType, RewardFormData } from "./types";
import { REWARD_CATEGORIES, getCategoryLabel } from "./helpers";
import { RewardTypeSummaryCard } from "./RewardTypeSummaryCard";

interface RewardEmployeeAndTypeSectionProps {
  isEdit: boolean;
  loading: boolean;
  employees: RewardEmployee[];
  rewardTypes: RewardType[];
  selectedRewardType: RewardType | null;
  formData: RewardFormData;
  validationErrors: Record<string, string>;
  onChange: (field: keyof RewardFormData, value: string) => void;
  onSeedDefaults: () => void;
}

const PREVIEW_TEMPLATES = [
  {
    name: "موظف الشهر",
    Icon: Award,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
  {
    name: "مكافأة الالتزام",
    Icon: Clock,
    color: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400",
  },
  {
    name: "تحقيق التارجت",
    Icon: Target,
    color:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
  {
    name: "المبادرة والابتكار",
    Icon: Lightbulb,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
];

export const RewardEmployeeAndTypeSection: React.FC<
  RewardEmployeeAndTypeSectionProps
> = ({
  isEdit,
  loading,
  employees,
  rewardTypes,
  selectedRewardType,
  formData,
  validationErrors,
  onChange,
  onSeedDefaults,
}) => {
  return (
    <>
      {/* Employee Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          معلومات الموظف
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الموظف <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.userId}
              onChange={(e) => onChange("userId", e.target.value)}
              disabled={isEdit}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
                validationErrors.userId ? "border-red-500" : "border-gray-300"
              } ${isEdit ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-75" : ""}`}
            >
              <option value="">اختر الموظف</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                  {emp.departmentRelation &&
                    ` (${emp.departmentRelation.name})`}
                </option>
              ))}
            </select>
            {validationErrors.userId && (
              <p className="text-sm text-red-600 mt-1">
                {validationErrors.userId}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reward Type & Value Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600" />
          تفاصيل المكافأة
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نوع المكافأة <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.rewardTypeId}
              onChange={(e) => onChange("rewardTypeId", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
                validationErrors.rewardTypeId
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            >
              <option value="">اختر نوع المكافأة</option>
              {rewardTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.nameAr || type.name} ({getCategoryLabel(type.category)})
                </option>
              ))}
              <option value="custom">-- إضافة نوع مكافأة جديد --</option>
            </select>

            {rewardTypes.length === 0 && (
              <div className="mt-4 p-8 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-gray-700 rounded-3xl shadow-xl shadow-indigo-100/50 dark:shadow-none relative overflow-hidden group">
                <div className="relative z-10">
                  <div
                    className="flex flex-col md:flex-row items-center gap-8 text-right"
                    dir="rtl"
                  >
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                        <Sparkles className="w-3 h-3" />
                        نظام ذكي متكامل
                      </div>
                      <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
                        جاهز لتكريم موظفيك؟
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                        قائمة القوالب فارغة حالياً. بضغطة واحدة، سنقوم بتجهيز{" "}
                        <span className="font-bold text-primary">
                          <span className="font-mono tabular-nums">10</span>{" "}
                          أنواع مكافآت احترافية
                        </span>{" "}
                        مصممة بعناية لتغطية كافة جوانب العمل (موظف الشهر،
                        الالتزام، المبيعات...)
                      </p>

                      <button
                        type="button"
                        onClick={onSeedDefaults}
                        disabled={loading}
                        className="relative px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-xs hover:bg-primary/90 transition-all active:scale-98 flex items-center gap-2.5 disabled:opacity-50 text-sm"
                      >
                        <RefreshCw
                          className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                        />
                        تجهيز كافة القوالب الآن
                      </button>
                    </div>

                    <div className="w-full md:w-64 space-y-2 relative">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-3">
                        معاينة لبعض القوالب
                      </p>
                      {PREVIEW_TEMPLATES.map((item, idx) => {
                        const IconComp = item.Icon;
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm"
                          >
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}
                            >
                              <IconComp className="w-4 h-4" />
                            </span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              {item.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {validationErrors.rewardTypeId && (
              <p className="text-sm text-red-600 mt-1">
                {validationErrors.rewardTypeId}
              </p>
            )}

            {formData.rewardTypeId === "custom" && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  تفاصيل المكافأة الجديدة
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم المكافأة بالعربي
                  </label>
                  <input
                    type="text"
                    value={formData.rewardName}
                    onChange={(e) => onChange("rewardName", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="مثلاً: مكافأة الأداء الاستثنائي"
                  />
                  {validationErrors.rewardName && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.rewardName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    التصنيف
                  </label>
                  <select
                    value={formData.rewardCategory}
                    onChange={(e) => onChange("rewardCategory", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(REWARD_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedRewardType && (
              <RewardTypeSummaryCard selectedRewardType={selectedRewardType} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              قيمة المكافأة (ج.م) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.calculatedValue}
              onChange={(e) => onChange("calculatedValue", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 font-mono tabular-nums ${
                validationErrors.calculatedValue
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              placeholder="0.00"
            />
            {validationErrors.calculatedValue && (
              <p className="text-sm text-red-600 mt-1">
                {validationErrors.calculatedValue}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              السبب / الوصف
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => onChange("reason", e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="اكتب سبب منح المكافأة..."
            />
          </div>
        </div>
      </div>
    </>
  );
};
