import React from "react";
import { Check } from "lucide-react";
import {
  type TechnicianProductivity,
  ROLE_CONFIG,
  fmtMoney,
} from "../../../shared";
import { tableWrap, thCls, tdCls } from "../../types/reportsTypes";

export interface TechnicianProductivityTableProps {
  rows: TechnicianProductivity[];
}

export const TechnicianProductivityTable: React.FC<TechnicianProductivityTableProps> = ({
  rows,
}) => {
  return (
    <div className={tableWrap}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300">
            <th className={thCls}>عضو الفريق</th>
            <th className={thCls}>التخصص / المحطة</th>
            <th className={thCls}>الحالات المسندة</th>
            <th className={thCls}>المراحل المنجزة</th>
            <th className={thCls}>الوحدات المنجزة</th>
            <th className={thCls}>متوسط سرعة الإنجاز</th>
            <th className={thCls}>أجر المرحلة</th>
            <th className={thCls}>إجمالي المستحقات</th>
            <th className={thCls}>الإعادات المرتبطة</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const roleMeta = ROLE_CONFIG[r.role || ""];
            return (
              <tr
                key={r.technicianId ?? r.name ?? "—"}
                className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <td
                  className={`${tdCls} font-semibold text-gray-900 dark:text-gray-100`}
                >
                  {r.name || "—"}
                </td>
                <td className={tdCls}>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      roleMeta?.color ||
                      "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {roleMeta?.label || r.role || "فني"}
                  </span>
                </td>
                <td className={`${tdCls} font-mono tabular-nums`}>
                  {r.assignedCases ?? 0}
                </td>
                <td
                  className={`${tdCls} font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums`}
                >
                  {r.completedStages ?? 0}
                </td>
                <td
                  className={`${tdCls} font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums`}
                >
                  {r.completedUnits ?? 0}
                </td>
                <td className={tdCls}>
                  {r.avgHoursPerStage ? (
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-mono tabular-nums">
                      {r.avgHoursPerStage} ساعة (~{r.avgDaysPerStage} يوم)
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`${tdCls} font-mono tabular-nums`}>
                  {r.wagePerStage ? `${fmtMoney(r.wagePerStage)} ج.م` : "—"}
                </td>
                <td
                  className={`${tdCls} font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums`}
                >
                  {fmtMoney(r.earnedWages ?? 0)} ج.م
                </td>
                <td className={tdCls}>
                  {(r.remakesCount ?? 0) > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono tabular-nums">
                      {r.remakesCount} إعادات
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      ممتاز (0)
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TechnicianProductivityTable;
