import { FileSpreadsheet, Loader2, Printer, RefreshCw } from "lucide-react";
import { fmtDate, fmtMoney, MODAL_INPUT_CLS } from "../../shared";
import type { DoctorStatementTabProps } from "../types/doctorDetailTypes";

export function DoctorStatementTab({
  doctor,
  statementData,
  invoices,
  loading,
  from,
  to,
  onFromChange,
  onToChange,
  onRefresh,
}: DoctorStatementTabProps) {
  return (
    <div className="space-y-4">
      {/* Date Range Selector and Print CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">من تاريخ:</label>
            <input
              type="date"
              className={`${MODAL_INPUT_CLS} text-sm py-1.5 font-mono tabular-nums`}
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">إلى تاريخ:</label>
            <input
              type="date"
              className={`${MODAL_INPUT_CLS} text-sm py-1.5 font-mono tabular-nums`}
              value={to}
              onChange={(e) => onToChange(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5 mt-auto transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث الكشف</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 border dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة كشف الحساب</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 space-y-6 print:border-none print:shadow-none">
          {/* Printable Header */}
          <div className="flex justify-between items-start border-b pb-4 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <span>كشف حساب معمل الأسنان</span>
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                العميل / الطبيب: <span className="font-bold text-gray-900 dark:text-gray-100">{doctor.name}</span>
              </p>
              {doctor.clinicName && (
                <p className="text-xs text-gray-500">العيادة: {doctor.clinicName}</p>
              )}
            </div>
            <div className="text-left text-xs text-gray-500 font-mono">
              <p>تاريخ الاستخراج: {new Date().toLocaleDateString("ar-EG")}</p>
              {from && <p>من: {from}</p>}
              {to && <p>إلى: {to}</p>}
            </div>
          </div>

          {/* Summary Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
            <div>
              <span className="text-xs text-gray-500 block">إجمالي الفواتير الصادرة</span>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono tabular-nums">
                {fmtMoney(statementData?.totals?.invoiced ?? doctor.totalBilled ?? 0)} ج.م
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">إجمالي المسدد</span>
              <span className="text-base font-bold text-emerald-600 font-mono tabular-nums">
                {fmtMoney(statementData?.totals?.paid ?? doctor.totalPaid ?? 0)} ج.م
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">الرصيد المتبقي</span>
              <span className="text-base font-bold text-red-600 font-mono tabular-nums">
                {fmtMoney(statementData?.totals?.remaining ?? doctor.outstanding ?? 0)} ج.م
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">عدد الحالات بالفترة</span>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono tabular-nums">
                {statementData?.totals?.cases ?? doctor.casesCount ?? 0} حالة
              </span>
            </div>
          </div>

          {/* Statement Invoices Table */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              تفاصيل الفواتير والمسحوبات:
            </h4>
            <table className="w-full text-sm border dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-right">
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">القيمة الكلية</th>
                  <th className="py-2.5 px-3">المدفوع</th>
                  <th className="py-2.5 px-3">المتبقي</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {(statementData?.invoices || invoices).map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2 px-3 font-semibold font-mono">{inv.invoiceNumber}</td>
                    <td className="py-2 px-3 text-xs font-mono tabular-nums">{fmtDate(inv.createdAt)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums">{fmtMoney(inv.total)} ج.م</td>
                    <td className="py-2 px-3 text-emerald-600 font-mono tabular-nums">{fmtMoney(inv.paid)} ج.م</td>
                    <td className="py-2 px-3 font-bold text-red-600 font-mono tabular-nums">
                      {fmtMoney(inv.remaining)} ج.م
                    </td>
                    <td className="py-2 px-3 text-xs">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorStatementTab;
