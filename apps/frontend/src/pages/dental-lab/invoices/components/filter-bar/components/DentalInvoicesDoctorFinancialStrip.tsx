import React from "react";
import { fmtMoney } from "../../../../shared";
import type { ActiveDoctorStats } from "../types";

export interface DentalInvoicesDoctorFinancialStripProps {
  stats: ActiveDoctorStats;
}

export const DentalInvoicesDoctorFinancialStrip: React.FC<DentalInvoicesDoctorFinancialStripProps> = ({
  stats,
}) => {
  return (
    <div className="pt-2 border-t dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
      <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
        <span className="text-gray-400 block text-[11px]">إجمالي الفواتير</span>
        <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5 font-mono">
          {fmtMoney(stats.totalBilled)} ج.م{" "}
          <span className="text-[10px] text-gray-400 font-normal">
            ({stats.invoicesCount} فاتورة)
          </span>
        </p>
      </div>

      <div className="p-2.5 bg-green-50/60 dark:bg-green-900/20 rounded-lg">
        <span className="text-green-700 dark:text-green-400 block text-[11px]">إجمالي المسدد</span>
        <p className="text-sm sm:text-base font-bold text-green-700 dark:text-green-400 mt-0.5 font-mono">
          {fmtMoney(stats.totalPaid)} ج.م
        </p>
      </div>

      <div className="p-2.5 bg-red-50/60 dark:bg-red-900/20 rounded-lg">
        <span className="text-red-700 dark:text-red-400 block text-[11px]">المديونية الحالية المتبقية</span>
        <p className="text-sm sm:text-base font-bold text-red-600 mt-0.5 font-mono">
          {fmtMoney(stats.outstanding)} ج.م
        </p>
      </div>

      <div className="p-2.5 bg-amber-50/60 dark:bg-amber-900/20 rounded-lg">
        <span className="text-amber-700 dark:text-amber-400 block text-[11px]">حالات غير مفوترة</span>
        <p className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-300 mt-0.5 font-mono">
          {stats.uninvoicedCases} حالة ({fmtMoney(stats.uninvoicedAmount)} ج.م)
        </p>
      </div>
    </div>
  );
};
