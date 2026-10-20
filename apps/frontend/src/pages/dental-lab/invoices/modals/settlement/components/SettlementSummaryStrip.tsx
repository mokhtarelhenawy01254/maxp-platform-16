import React from "react";
import { fmtMoney, type MonthlySettlementSummary } from "../../../../shared";

interface SettlementSummaryStripProps {
  summary: MonthlySettlementSummary | null;
}

export const SettlementSummaryStrip: React.FC<SettlementSummaryStripProps> = ({
  summary,
}) => {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-xs tabular-nums">
      <div className="p-2.5 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl">
        <span className="text-gray-500 dark:text-gray-400 block text-[11px]">
          إجمالي فواتير الشهر
        </span>
        <p className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5 font-mono">
          <span className="tabular-nums">{fmtMoney(summary.totalBilled)}</span> ج.م
        </p>
      </div>

      <div className="p-2.5 bg-green-50/60 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 rounded-xl">
        <span className="text-green-700 dark:text-green-400 block text-[11px]">
          إجمالي المسدد
        </span>
        <p className="text-sm sm:text-base font-bold text-green-700 dark:text-green-400 mt-0.5 font-mono">
          <span className="tabular-nums">{fmtMoney(summary.totalPaid)}</span> ج.م
        </p>
      </div>

      <div className="p-2.5 bg-amber-50/60 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-xl">
        <span className="text-amber-700 dark:text-amber-400 block text-[11px]">
          إجمالي التسويات
        </span>
        <p className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
          <span className="tabular-nums">{fmtMoney(summary.totalAdjustments)}</span> ج.م
        </p>
      </div>

      <div className="p-2.5 bg-red-50/60 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl">
        <span className="text-red-700 dark:text-red-400 block text-[11px]">
          صافي المديونية المرحلة
        </span>
        <p className="text-sm sm:text-base font-bold text-red-600 mt-0.5 font-mono">
          <span className="tabular-nums">{fmtMoney(summary.totalClosingBalance)}</span> ج.م
        </p>
      </div>

      <div className="p-2.5 bg-purple-50/60 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/40 rounded-xl col-span-2 sm:col-span-1">
        <span className="text-purple-700 dark:text-purple-400 block text-[11px]">
          نسبة الاعتماد للشهر
        </span>
        <p className="text-sm sm:text-base font-bold text-purple-700 dark:text-purple-300 mt-0.5 font-mono">
          <span className="tabular-nums">{summary.closedCount}</span> /{" "}
          <span className="tabular-nums">{summary.totalDoctors}</span> طبيب
        </p>
      </div>
    </div>
  );
};

export default SettlementSummaryStrip;
