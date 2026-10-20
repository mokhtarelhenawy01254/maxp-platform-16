import React from "react";
import { Loader2, Lock, RefreshCw } from "lucide-react";
import type { DentalLabDoctor } from "../../../../shared";

interface SettlementFilterBarProps {
  period: string;
  onPeriodChange: (val: string) => void;
  doctorId: string;
  onDoctorIdChange: (val: string) => void;
  doctors: DentalLabDoctor[];
  onRefresh: () => void;
  onCloseAll: () => void;
  saving: boolean;
  loading: boolean;
  hasSettlements: boolean;
}

export const SettlementFilterBar: React.FC<SettlementFilterBarProps> = ({
  period,
  onPeriodChange,
  doctorId,
  onDoctorIdChange,
  doctors,
  onRefresh,
  onCloseAll,
  saving,
  loading,
  hasSettlements,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl mb-3 text-xs">
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-600 dark:text-gray-300">
            شهر التقفيل:
          </span>
          <input
            type="month"
            aria-label="شهر التقفيل"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 font-mono tabular-nums"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
          <span className="font-semibold text-gray-600 dark:text-gray-300">
            الطبيب:
          </span>
          <select
            aria-label="اختيار الطبيب"
            value={doctorId}
            onChange={(e) => onDoctorIdChange(e.target.value)}
            className="flex-1 border dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">-- جميع الأطباء النشطين --</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.clinicName ? `(${d.clinicName})` : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 text-gray-500 hover:text-gray-700 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          title="تحديث البيانات"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCloseAll}
          disabled={saving || loading || !hasSettlements}
          className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-xs flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          <span>إغلاق واعتماد كافة الحسابات دفعة واحدة</span>
        </button>
      </div>
    </div>
  );
};

export default SettlementFilterBar;
