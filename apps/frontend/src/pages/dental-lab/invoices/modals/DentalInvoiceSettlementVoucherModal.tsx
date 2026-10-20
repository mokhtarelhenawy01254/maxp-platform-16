import { FileCheck, Printer, X as XMarkIcon } from "lucide-react";
import type { DentalMonthlySettlement } from "../../shared";
import { fmtDate, fmtDateTime, fmtMoney, MODAL_CONTENT_CLS } from "../../shared";

export interface DentalInvoiceSettlementVoucherModalProps {
  settlement: DentalMonthlySettlement;
  onClose: () => void;
}

export function DentalInvoiceSettlementVoucherModal({
  settlement,
  onClose,
}: DentalInvoiceSettlementVoucherModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-2xl my-6 print:shadow-none print:p-0 print:border-none`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Actions header */}
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              سند تسوية واعتماد المستحقات الشهرية
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 border dark:border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>طباعة السند</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
              aria-label="إغلاق"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Sheet */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 print:border-none print:p-0 space-y-4 text-xs sm:text-sm bg-white dark:bg-gray-900">
          {/* Lab Header */}
          <div className="border-b-2 border-indigo-600 pb-3 flex items-start justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-indigo-900 dark:text-indigo-300">
                معمل ماكس بي للتركيبات السنية
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                MaxP Dental Laboratory Management System
              </p>
            </div>
            <div className="text-left text-xs text-gray-600 dark:text-gray-400">
              <p className="font-bold text-gray-800 dark:text-gray-200">سند تقفيل مستحقات شهرية</p>
              <p className="font-mono">رقم السند: STL-{settlement.id.slice(0, 8).toUpperCase()}</p>
              <p>تاريخ السند: {fmtDate(settlement.closedAt || settlement.createdAt || new Date().toISOString())}</p>
            </div>
          </div>

          {/* Doctor & Period Info */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700">
            <div>
              <span className="text-gray-400 block text-[11px]">السيد الطبيب / العيادة:</span>
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                د. {settlement.doctorName || "—"}
              </p>
              {settlement.clinicName && <p className="text-xs text-gray-500">{settlement.clinicName}</p>}
              {settlement.phone && <p className="text-xs text-gray-500 font-mono">هاتف: {settlement.phone}</p>}
            </div>
            <div className="text-left">
              <span className="text-gray-400 block text-[11px]">عن شهر التقفيل:</span>
              <p className="font-bold text-sm text-indigo-700 dark:text-indigo-400 mt-0.5 font-mono">
                {settlement.periodKey} ({settlement.year}/{String(settlement.month).padStart(2, "0")})
              </p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                  settlement.status === "CLOSED"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : settlement.status === "REOPENED"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {settlement.status === "CLOSED"
                  ? "معتمد ومغلق نهائياً"
                  : settlement.status === "REOPENED"
                  ? "معاد فتحه للتدقيق"
                  : "مسودة تسوية أولية"}
              </span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs">
                <tr>
                  <th className="py-2.5 px-3">بيان الحركة المحاسبية</th>
                  <th className="py-2.5 px-3">التفاصيل / العدد</th>
                  <th className="py-2.5 px-3 text-left">المبلغ (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700 tabular-nums">
                <tr>
                  <td className="py-2.5 px-3 font-medium">رصيد أول المدة المرحل من الشهر السابق</td>
                  <td className="py-2.5 px-3 text-gray-500">رصيد سابق معتمد</td>
                  <td className="py-2.5 px-3 font-semibold text-left font-mono">{fmtMoney(settlement.openingBalance)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-blue-700 dark:text-blue-400">
                    (+) قيمة الأعمال والفواتير الصادرة بالشهر
                  </td>
                  <td className="py-2.5 px-3 text-gray-500">
                    {settlement.invoicesCount} فاتورة / {settlement.casesCount} حالة
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-blue-700 dark:text-blue-400 text-left font-mono">
                    + {fmtMoney(settlement.totalBilled)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-green-700 dark:text-green-400">
                    (-) إجمالي التحصيلات والسدادات النقدية والبنكية
                  </td>
                  <td className="py-2.5 px-3 text-gray-500">سدادات مسجلة ومعتمدة</td>
                  <td className="py-2.5 px-3 font-semibold text-green-700 dark:text-green-400 text-left font-mono">
                    - {fmtMoney(settlement.totalPaid)}
                  </td>
                </tr>
                {settlement.totalAdjustments > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-amber-700 dark:text-amber-400">
                      (-) إجمالي الخصومات والإشعارات الدائنة
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">تسويات وخصومات مسموح بها</td>
                    <td className="py-2.5 px-3 font-semibold text-amber-700 dark:text-amber-400 text-left font-mono">
                      - {fmtMoney(settlement.totalAdjustments)}
                    </td>
                  </tr>
                )}
                <tr className="bg-indigo-50/80 dark:bg-indigo-950/40 font-black text-sm">
                  <td className="py-3 px-3 text-indigo-950 dark:text-indigo-200">
                    (=) صافي الرصيد الختامي المستحق والمرحل للشهر القادم
                  </td>
                  <td className="py-3 px-3 text-gray-500 text-xs font-normal">
                    {settlement.closingBalance > 0 ? "مستحق على الطبيب لصالح المعمل" : "خالص المسدد"}
                  </td>
                  <td className="py-3 px-3 text-red-600 dark:text-red-400 text-base text-left font-mono">
                    {fmtMoney(settlement.closingBalance)} ج.م
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes & Audit */}
          {settlement.notes && (
            <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <strong>ملاحظات التقفيل:</strong> {settlement.notes}
            </p>
          )}
          {settlement.closedByName && (
            <p className="text-[11px] text-gray-400">
              تم اعتماد وإغلاق الحساب بواسطة: <strong>{settlement.closedByName}</strong> بتاريخ:{" "}
              {fmtDateTime(settlement.closedAt)}
            </p>
          )}
          {settlement.reopenedReason && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
              <strong>تنبيه تدقيق:</strong> أُعيد فتح هذا الشهر للسبب التالي: {settlement.reopenedReason} بتاريخ{" "}
              {fmtDateTime(settlement.reopenedAt)}
            </p>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-dashed dark:border-gray-700 text-center text-xs">
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">إعداد / قسم الحسابات</p>
              <div className="h-14 border-b border-gray-300 dark:border-gray-600"></div>
            </div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">اعتماد إدارة المعمل</p>
              <div className="h-14 border-b border-gray-300 dark:border-gray-600"></div>
            </div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">توقيع وختم الطبيب بالاستلام</p>
              <div className="h-14 border-b border-gray-300 dark:border-gray-600"></div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-gray-800 mt-4 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalInvoiceSettlementVoucherModal;
