import React from "react";
import {
  CalendarDaysIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { OwnerReportOptions } from "./types";

interface OwnerAttendanceReportModalProps {
  open: boolean;
  onClose: () => void;
  reportOptions: OwnerReportOptions;
  onOptionsChange: (options: OwnerReportOptions) => void;
  startDate: string;
  endDate: string;
  filteredCount: number;
  isGeneratingReport: boolean;
  onGenerateReport: () => void;
}

export const OwnerAttendanceReportModal: React.FC<
  OwnerAttendanceReportModalProps
> = ({
  open,
  onClose,
  reportOptions,
  onOptionsChange,
  startDate,
  endDate,
  filteredCount,
  isGeneratingReport,
  onGenerateReport,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DocumentChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  إنشاء تقرير مفصل
                </h2>
                <p className="text-indigo-100 text-sm mt-1">
                  اختر إعدادات التقرير المطلوب
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
              صيغة التقرير
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  onOptionsChange({ ...reportOptions, format: "pdf" })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  reportOptions.format === "pdf"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                }`}
              >
                <DocumentTextIcon
                  className={`w-8 h-8 mx-auto mb-2 ${
                    reportOptions.format === "pdf"
                      ? "text-indigo-600"
                      : "text-gray-400"
                  }`}
                />
                <div className="font-bold text-gray-900 dark:text-white">
                  PDF / HTML
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  تقرير مفصل بالتصميم
                </div>
              </button>
              <button
                onClick={() =>
                  onOptionsChange({ ...reportOptions, format: "excel" })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  reportOptions.format === "excel"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                }`}
              >
                <DocumentChartBarIcon
                  className={`w-8 h-8 mx-auto mb-2 ${
                    reportOptions.format === "excel"
                      ? "text-indigo-600"
                      : "text-gray-400"
                  }`}
                />
                <div className="font-bold text-gray-900 dark:text-white">
                  Excel / CSV
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  جدول بيانات
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
              خيارات التقرير
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={reportOptions.includeCharts}
                onChange={(e) =>
                  onOptionsChange({
                    ...reportOptions,
                    includeCharts: e.target.checked,
                  })
                }
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  تضمين الإحصائيات العامة
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  عرض ملخص الحضور في بداية التقرير
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={reportOptions.includeDetails}
                onChange={(e) =>
                  onOptionsChange({
                    ...reportOptions,
                    includeDetails: e.target.checked,
                  })
                }
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  تضمين التفاصيل الكاملة
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  عرض جميع أرقام الحضور لكل موظف
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={reportOptions.groupByCompany}
                onChange={(e) =>
                  onOptionsChange({
                    ...reportOptions,
                    groupByCompany: e.target.checked,
                  })
                }
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  تجميع حسب الشركة
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  تنظيم الموظفين حسب شركاتهم
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors border border-yellow-200 dark:border-yellow-900/30">
              <input
                type="checkbox"
                checked={reportOptions.showOnlyIssues}
                onChange={(e) =>
                  onOptionsChange({
                    ...reportOptions,
                    showOnlyIssues: e.target.checked,
                  })
                }
                className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  عرض المشاكل فقط
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  إظهار الموظفين ذوي الأداء الضعيف فقط (أقل من 80%)
                </div>
              </div>
            </label>
          </div>

          <div className="bg-muted/30 border border-border/70 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 border border-primary/20 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <CalendarDaysIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground mb-1">
                  نطاق التقرير
                </div>
                <div className="text-sm text-muted-foreground font-mono tabular-nums">
                  من <span className="font-bold">{startDate}</span> إلى{" "}
                  <span className="font-bold">{endDate}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  سيتم تضمين{" "}
                  <span className="font-bold font-mono tabular-nums">
                    {filteredCount}
                  </span>{" "}
                  موظف في التقرير
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 p-6 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={onGenerateReport}
              disabled={isGeneratingReport}
              className="flex-1 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGeneratingReport ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <DocumentChartBarIcon className="w-5 h-5" />
                  إنشاء التقرير
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
