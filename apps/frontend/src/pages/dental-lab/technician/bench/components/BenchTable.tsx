import React from "react";
import { Link } from "react-router-dom";
import { MyCase, nextStatusOf, fmtDate } from "../../../shared";

interface BenchTableProps {
  cases: MyCase[];
  isCaseOverdue: (c: MyCase) => boolean;
  onAdvance: (c: MyCase) => void;
  busyId: string | null;
}

export const BenchTable: React.FC<BenchTableProps> = ({
  cases,
  isCaseOverdue,
  onAdvance,
  busyId,
}) => {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="py-3 px-3">رقم الحالة</th>
              <th className="py-3 px-3">نوع الشغل</th>
              <th className="py-3 px-3">المرحلة الحالية</th>
              <th className="py-3 px-3">الطبيب / المريض</th>
              <th className="py-3 px-3">اللون</th>
              <th className="py-3 px-3">الاستحقاق</th>
              <th className="py-3 px-3 text-left">إجراءات سريعة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {cases.map((c) => {
              const overdue = isCaseOverdue(c);
              const nextStatus = nextStatusOf(c.status);
              return (
                <tr
                  key={c.id}
                  className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${
                    overdue ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono font-bold tabular-nums">
                    <Link
                      to={`/dental-lab/cases/${c.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      #{c.caseNumber || c.id.slice(0, 6)}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                    {c.workTypeName || "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                      {c.activeStageName || c.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                    {c.doctorName || "—"} / {c.patientName || "—"}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">
                    {c.shade || "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`tabular-nums font-mono ${
                        overdue ? "text-rose-600 font-bold" : "text-gray-500"
                      }`}
                    >
                      {fmtDate(c.dueDate)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-left">
                    {nextStatus ? (
                      <button
                        type="button"
                        onClick={() => onAdvance(c)}
                        disabled={busyId === c.id}
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] disabled:opacity-50"
                      >
                        إنهاء المرحلة
                      </button>
                    ) : (
                      <span className="text-gray-400 text-[11px]">مكتمل</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BenchTable;
