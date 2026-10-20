import React from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { DentalInvoiceBatchMode } from "../types";

export interface DentalInvoiceBatchFooterProps {
  mode: DentalInvoiceBatchMode;
  submitting: boolean;
  selectedDoctorIdsCount: number;
  selectedStats: {
    doctorsCount: number;
    cases: number;
    amount: number;
  };
  onClose: () => void;
  onRunBatch: () => void;
}

export const DentalInvoiceBatchFooter: React.FC<DentalInvoiceBatchFooterProps> = ({
  mode,
  submitting,
  selectedDoctorIdsCount,
  selectedStats,
  onClose,
  onRunBatch,
}) => {
  return (
    <div className="flex items-center justify-between pt-4 border-t dark:border-gray-800 mt-4">
      <div className="text-xs text-gray-500">
        سيتم إنشاء الفواتير بنمط{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {mode === "PER_CASE"
            ? "فاتورة منفصلة لكل حالة"
            : "فاتورة شهرية مجمعة شاملة الحالات"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onRunBatch}
          disabled={submitting || selectedDoctorIdsCount === 0}
          className="px-5 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold disabled:opacity-50 flex items-center gap-2 shadow-sm font-mono tabular-nums transition-all"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {submitting
            ? "جاري الإصدار..."
            : mode === "PER_CASE"
            ? `إصدار (${selectedStats.cases}) فاتورة`
            : `إصدار فواتير مجمعة لـ (${selectedStats.doctorsCount}) طبيب`}
        </button>
      </div>
    </div>
  );
};
