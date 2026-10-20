import React from "react";
import { fmtMoney, type DoctorStatement } from "../../../../shared";

interface StatementTotalsSummaryProps {
  statement: DoctorStatement | null;
}

export const StatementTotalsSummary: React.FC<StatementTotalsSummaryProps> = ({
  statement,
}) => {
  const totalCards =
    statement?.totals?.totalCards ??
    statement?.totals?.invoicesCount ??
    statement?.invoices?.length ??
    0;

  const totalUnits =
    statement?.totals?.totalUnits ??
    statement?.invoices?.reduce(
      (sum, inv) => sum + (inv.unitsCount || inv.case?.unitsCount || 1),
      0
    ) ??
    0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 print:grid-cols-4 print:border print:border-slate-300 print:p-2">
      <div className="p-3 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl print:border-none print:p-1 font-mono tabular-nums">
        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium print:text-black font-sans">
          عدد الحالات والوحدات
        </span>
        <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5 print:text-black">
          <span className="tabular-nums">{totalCards}</span> حالة (
          <span className="tabular-nums">{totalUnits}</span> وحدة)
        </p>
      </div>

      <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border dark:border-gray-700 rounded-xl print:border-none print:p-1 font-mono tabular-nums">
        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium print:text-black font-sans">
          إجمالي المفوتر
        </span>
        <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5 print:text-black">
          <span className="tabular-nums">{fmtMoney(statement?.totals?.invoiced)}</span> ج.م
        </p>
      </div>

      <div className="p-3 bg-green-50/60 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 rounded-xl print:border-none print:p-1 font-mono tabular-nums">
        <span className="text-[11px] text-green-700 dark:text-green-400 font-medium print:text-black font-sans">
          إجمالي المسدد
        </span>
        <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-400 mt-0.5 print:text-black">
          <span className="tabular-nums">{fmtMoney(statement?.totals?.paid)}</span> ج.م
        </p>
      </div>

      <div className="p-3 bg-red-50/60 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl print:border-none print:p-1 font-mono tabular-nums">
        <span className="text-[11px] text-red-700 dark:text-red-400 font-medium print:text-black font-sans">
          الرصيد المتبقي المستحق
        </span>
        <p className="text-base sm:text-lg font-bold text-red-600 mt-0.5 print:text-black">
          <span className="tabular-nums">{fmtMoney(statement?.totals?.remaining)}</span> ج.م
        </p>
      </div>
    </div>
  );
};

export default StatementTotalsSummary;
