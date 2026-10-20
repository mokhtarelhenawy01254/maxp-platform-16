import React from "react";
import {
  Banknote,
  CalendarClock,
  FileSpreadsheet,
  MessageCircle,
  User,
} from "lucide-react";
import type { DentalLabDoctor } from "../../../../shared";
import { fmtMoney } from "../../../../shared";
import { shareStatementWhatsApp } from "../../../types/dentalInvoicesTypes";
import type { ActiveDoctorStats } from "../types";

export interface DentalInvoicesDoctorSelectorProps {
  selectedDoctorId: string;
  onSelectDoctorId: (id: string) => void;
  doctors: DentalLabDoctor[];
  activeDoctor: DentalLabDoctor | null;
  activeDoctorStats: ActiveDoctorStats | null;
  onOpenStatement: (doctor: DentalLabDoctor) => void;
  onOpenSettlement: (doctorId?: string) => void;
  onBulkPayment: (doctor: DentalLabDoctor) => void;
}

export const DentalInvoicesDoctorSelector: React.FC<DentalInvoicesDoctorSelectorProps> = ({
  selectedDoctorId,
  onSelectDoctorId,
  doctors,
  activeDoctor,
  activeDoctorStats,
  onOpenStatement,
  onOpenSettlement,
  onBulkPayment,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-[240px]">
        <User className="w-4 h-4 text-blue-600 shrink-0" />
        <label
          htmlFor="doctor-account-select"
          className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap"
        >
          حساب الطبيب:
        </label>
        <select
          id="doctor-account-select"
          className="flex-1 border dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          value={selectedDoctorId}
          onChange={(e) => onSelectDoctorId(e.target.value)}
        >
          <option value="">-- جميع الأطباء (عرض شامل) --</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} {d.clinicName ? `(${d.clinicName})` : ""}{" "}
              {d.outstanding ? `— متبقي: ${fmtMoney(d.outstanding)} ج.م` : ""}
            </option>
          ))}
        </select>
      </div>

      {activeDoctor && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenStatement(activeDoctor)}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>كشف حساب الطبيب</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenSettlement(activeDoctor.id)}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>تقفيل الشهر</span>
          </button>
          <button
            type="button"
            onClick={() => onBulkPayment(activeDoctor)}
            className="px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-green-100 transition-colors"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>تحصيل دفعة</span>
          </button>
          {activeDoctor.phone && (
            <button
              type="button"
              onClick={() =>
                shareStatementWhatsApp(activeDoctor.name, activeDoctor.phone, {
                  invoiced: activeDoctorStats?.totalBilled,
                  paid: activeDoctorStats?.totalPaid,
                  remaining: activeDoctorStats?.outstanding,
                  cases: activeDoctorStats?.invoicesCount,
                })
              }
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors"
              title="مراسلة الطبيب عبر واتساب"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
