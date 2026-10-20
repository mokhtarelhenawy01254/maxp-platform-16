import React from "react";
import {
  INVOICE_STATUS_MAP,
  fmtDate,
  fmtMoney,
  type DoctorStatement,
} from "../../../../shared";
import { FALLBACK_BADGE } from "../../../types/dentalInvoicesTypes";

interface StatementInvoicesTableProps {
  invoices: NonNullable<DoctorStatement["invoices"]>;
}

const renderInvoiceBadge = (status?: string) => {
  if (!status) return null;
  const meta = INVOICE_STATUS_MAP[status] ?? {
    ...FALLBACK_BADGE,
    label: status,
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.color}`}
    >
      {meta.label}
    </span>
  );
};

export const StatementInvoicesTable: React.FC<StatementInvoicesTableProps> = ({
  invoices,
}) => {
  return (
    <div className="overflow-x-auto max-h-72 print:max-h-none print:overflow-visible border dark:border-gray-700 rounded-xl print:border-slate-300 print:rounded-none">
      <table className="w-full text-xs text-right">
        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold print:bg-slate-100 print:text-black">
          <tr>
            <th className="py-2.5 px-3">رقم الفاتورة</th>
            <th className="py-2.5 px-3">رقم الكارتة</th>
            <th className="py-2.5 px-3">اسم المريض</th>
            <th className="py-2.5 px-3">نوع الشغل</th>
            <th className="py-2.5 px-3">الوحدات</th>
            <th className="py-2.5 px-3">التاريخ</th>
            <th className="py-2.5 px-3">الإجمالي</th>
            <th className="py-2.5 px-3">المسدد</th>
            <th className="py-2.5 px-3">المتبقي</th>
            <th className="py-2.5 px-3">الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700 print:divide-slate-200">
          {!invoices || invoices.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-8 text-center text-gray-400">
                لا توجد فواتير مسجلة في هذه الفترة
              </td>
            </tr>
          ) : (
            invoices.map((inv) => (
              <tr
                key={inv.id}
                className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 font-mono tabular-nums"
              >
                <td className="py-2.5 px-3 font-semibold text-blue-600 print:text-black">
                  {inv.invoiceNumber || inv.id?.slice(0, 8)}
                </td>
                <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                  {inv.caseNumber || inv.case?.caseNumber || "—"}
                </td>
                <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100 font-sans">
                  {inv.patientName || inv.case?.patientName || "—"}
                </td>
                <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 font-sans">
                  {inv.workTypeName || inv.case?.workTypeName || "—"}
                </td>
                <td className="py-2.5 px-3 font-semibold text-gray-700 dark:text-gray-300">
                  {inv.unitsCount ?? inv.case?.unitsCount ?? 1}
                </td>
                <td className="py-2.5 px-3 text-gray-500 print:text-black">
                  {fmtDate(inv.createdAt)}
                </td>
                <td className="py-2.5 px-3 font-medium">{fmtMoney(inv.total)}</td>
                <td className="py-2.5 px-3 text-green-600 print:text-black">
                  {fmtMoney(inv.paid)}
                </td>
                <td className="py-2.5 px-3 text-red-600 font-bold print:text-black">
                  {fmtMoney(inv.remaining)}
                </td>
                <td className="py-2.5 px-3 font-sans">
                  {renderInvoiceBadge(inv.status)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StatementInvoicesTable;
