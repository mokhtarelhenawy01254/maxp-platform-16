import React from "react";
import { CustomerPointsStats, formatPoints } from "./types";

interface CustomerPointsTelemetryStripProps {
  stats: CustomerPointsStats;
}

export const CustomerPointsTelemetryStrip: React.FC<CustomerPointsTelemetryStripProps> = ({
  stats,
}) => {
  return (
    <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
      <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>أعضاء الولاء</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
            {stats.activeMembers.toLocaleString("ar-EG")}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">عضو نشط</div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>إجمالي الرصيد</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
            {formatPoints(stats.totalPointsBalance)}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">نقطة متاحة</div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>معدل الاستبدال</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats.redemptionRate}%
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">نسبة الفاعلية</div>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <span>مهدد بالانتهاء</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {stats.atRiskCount.toLocaleString("ar-EG")}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">عميل بحاجة لتنبيه</div>
        </div>
      </div>
    </div>
  );
};
