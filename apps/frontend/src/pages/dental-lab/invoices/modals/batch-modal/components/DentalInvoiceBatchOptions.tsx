import React from "react";
import { MODAL_INPUT_CLS } from "../../../../shared";
import type { DentalInvoiceBatchMode } from "../types";

export interface DentalInvoiceBatchOptionsProps {
  includeAllStatuses: boolean;
  onIncludeAllToggle: (checked: boolean) => void;
  loadingSummary: boolean;
  submitting: boolean;
  mode: DentalInvoiceBatchMode;
  onModeChange: (m: DentalInvoiceBatchMode) => void;
  dueDate: string;
  onDueDateChange: (d: string) => void;
  notes: string;
  onNotesChange: (n: string) => void;
}

export const DentalInvoiceBatchOptions: React.FC<DentalInvoiceBatchOptionsProps> = ({
  includeAllStatuses,
  onIncludeAllToggle,
  loadingSummary,
  submitting,
  mode,
  onModeChange,
  dueDate,
  onDueDateChange,
  notes,
  onNotesChange,
}) => {
  return (
    <>
      {/* Include all statuses toggle */}
      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-3">
        <label
          htmlFor="include-all-statuses-checkbox"
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <input
            id="include-all-statuses-checkbox"
            type="checkbox"
            checked={includeAllStatuses}
            onChange={(e) => onIncludeAllToggle(e.target.checked)}
            disabled={loadingSummary || submitting}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 cursor-pointer"
          />
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
            تضمين كافة الحالات المسجلة (حتى تحت التشغيل والتصميم)
          </span>
        </label>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {loadingSummary
            ? "جارٍ التحديث..."
            : includeAllStatuses
            ? "شامل جميع الحالات غير المفوترة"
            : "الحالات الجاهزة/المكتملة فقط"}
        </span>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border dark:border-gray-700/50">
        <div>
          <label htmlFor="batch-mode-select" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            نمط إصدار الفواتير
          </label>
          <select
            id="batch-mode-select"
            className={`${MODAL_INPUT_CLS} text-sm`}
            value={mode}
            onChange={(e) => onModeChange(e.target.value as DentalInvoiceBatchMode)}
          >
            <option value="PER_CASE">
              فاتورة مستقلة لكل حالة (إصدار فاتورة برقم منفصل لكل كارتة)
            </option>
            <option value="CONSOLIDATED">
              فاتورة شهرية مجمعة لكل طبيب (تضم كافة الحالات مفصلة بالمرضى والوحدات والأسعار)
            </option>
          </select>
        </div>
        <div>
          <label htmlFor="batch-due-date" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            تاريخ استحقاق الفواتير
          </label>
          <input
            id="batch-due-date"
            type="date"
            className={`${MODAL_INPUT_CLS} text-sm`}
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="batch-notes" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            ملاحظات تظهر على الفواتير الصادرة
          </label>
          <input
            id="batch-notes"
            className={`${MODAL_INPUT_CLS} text-sm`}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="مثال: مطالبات دورية لشهر ..."
          />
        </div>
      </div>
    </>
  );
};
