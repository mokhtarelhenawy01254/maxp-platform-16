import React from "react";
import { fmtMoney } from "../../../shared";

export interface TechnicianProductivityKpiCardsProps {
  totalStages: number;
  totalUnits: number;
  totalWages: number;
  totalRemakes: number;
}

export const TechnicianProductivityKpiCards: React.FC<TechnicianProductivityKpiCardsProps> = ({
  totalStages,
  totalUnits,
  totalWages,
  totalRemakes,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          إجمالي المراحل المكتملة
        </p>
        <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400 tabular-nums font-mono">
          {totalStages} <span className="text-xs font-normal text-gray-400">مرحلة</span>
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          إجمالي الوحدات المنجزة
        </p>
        <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400 tabular-nums font-mono">
          {totalUnits} <span className="text-xs font-normal text-gray-400">وحدة</span>
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          إجمالي مستحقات وأجور الفريق
        </p>
        <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
          {fmtMoney(totalWages)}{" "}
          <span className="text-xs font-normal text-gray-400">ج.م</span>
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          إجمالي الإعادات المرتبطة
        </p>
        <p
          className={`text-2xl font-bold mt-1 tabular-nums font-mono ${
            totalRemakes > 0 ? "text-amber-600" : "text-gray-600"
          }`}
        >
          {totalRemakes} <span className="text-xs font-normal text-gray-400">حالة</span>
        </p>
      </div>
    </div>
  );
};

export default TechnicianProductivityKpiCards;
