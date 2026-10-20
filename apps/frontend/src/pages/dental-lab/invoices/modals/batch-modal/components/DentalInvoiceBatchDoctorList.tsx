import React from "react";
import { Check, CheckSquare, Square } from "lucide-react";
import type { UninvoicedSummaryResult } from "../../../../shared";
import { fmtMoney } from "../../../../shared";

export interface DentalInvoiceBatchDoctorListProps {
  currentSummary: UninvoicedSummaryResult;
  selectedDoctorIds: string[];
  allSelected: boolean;
  toggleSelectAll: () => void;
  toggleDoctor: (id: string | null) => void;
  selectedStats: {
    doctorsCount: number;
    cases: number;
    amount: number;
  };
}

export const DentalInvoiceBatchDoctorList: React.FC<DentalInvoiceBatchDoctorListProps> = ({
  currentSummary,
  selectedDoctorIds,
  allSelected,
  toggleSelectAll,
  toggleDoctor,
  selectedStats,
}) => {
  return (
    <>
      {/* Doctors Selection Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>{allSelected ? "إلغاء تحديد الكل" : "تحديد جميع الأطباء"}</span>
          </button>
        </div>
        <span className="text-xs text-gray-500 font-mono tabular-nums">
          المحدد:{" "}
          <strong className="text-gray-900 dark:text-gray-100">
            {selectedStats.doctorsCount} طبيب
          </strong>{" "}
          ({selectedStats.cases} حالة) بإجمالي{" "}
          <strong className="text-blue-600 dark:text-blue-400">
            {fmtMoney(selectedStats.amount)} ج.م
          </strong>
        </span>
      </div>

      {/* Doctor Rows */}
      <div className="border dark:border-gray-700 rounded-xl divide-y dark:divide-gray-700 max-h-56 overflow-y-auto">
        {currentSummary.doctors.map((doc) => {
          const isSelected = Boolean(
            doc.doctorId && selectedDoctorIds.includes(doc.doctorId)
          );
          return (
            <div
              key={doc.doctorId || doc.doctorName}
              onClick={() => toggleDoctor(doc.doctorId)}
              className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-blue-50/60 dark:bg-blue-900/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {doc.doctorName}
                  </p>
                  <p className="text-xs text-gray-500 font-mono tabular-nums">
                    {doc.clinicName ? `${doc.clinicName} • ` : ""}
                    {doc.casesCount} حالة غير مفوترة
                  </p>
                </div>
              </div>
              <div className="text-left font-mono tabular-nums">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {fmtMoney(doc.totalAmount)} ج.م
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
