import { useMemo } from "react";
import {
  Banknote,
  Clock,
  FileSpreadsheet,
  FileText,
  Link2,
  MessageCircle,
  Plus,
  Sparkles,
  X as XMarkIcon,
} from "lucide-react";
import type { DentalInvoice } from "../../shared";
import { fmtDate, fmtDateTime, fmtMoney, MODAL_CONTENT_CLS } from "../../shared";
import { invoiceBadge, shareInvoiceWhatsApp } from "../types/dentalInvoicesTypes";

export interface DentalInvoiceDetailModalProps {
  invoice: DentalInvoice;
  onClose: () => void;
  onAddPayment: () => void;
  onPdf: () => void;
  onPaymentLink: () => void;
}

interface ConsolidatedData {
  title?: string;
  note?: string;
  isConsolidated?: boolean;
  casesCount?: number;
  totalUnits?: number;
  summary?: {
    casesCount?: number;
    totalUnits?: number;
  };
  items?: Array<{
    caseId?: string;
    caseNumber?: string;
    patientName?: string;
    doctorName?: string;
    workTypeName?: string;
    unitsCount?: number;
    unitPrice?: number;
    total?: number;
  }>;
}

export function DentalInvoiceDetailModal({
  invoice,
  onClose,
  onAddPayment,
  onPdf,
  onPaymentLink,
}: DentalInvoiceDetailModalProps) {
  const consolidatedData = useMemo<ConsolidatedData | null>(() => {
    if (!invoice.notes) return null;
    try {
      if (invoice.notes.startsWith("{") && invoice.notes.includes('"items"')) {
        const parsed = JSON.parse(invoice.notes);
        if (parsed && (parsed.isConsolidated || Array.isArray(parsed.items))) {
          return parsed as ConsolidatedData;
        }
      }
    } catch {}
    return null;
  }, [invoice.notes]);

  const items = consolidatedData?.items || [];
  const casesCount = items.length || consolidatedData?.casesCount || 0;
  const totalUnits =
    consolidatedData?.totalUnits ||
    consolidatedData?.summary?.totalUnits ||
    items.reduce((acc, it) => acc + (Number(it.unitsCount) || 1), 0);
  const displayNote = consolidatedData
    ? consolidatedData.title || consolidatedData.note || ""
    : invoice.notes;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div className={`${MODAL_CONTENT_CLS} max-w-3xl my-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-mono">
                  فاتورة #{invoice.invoiceNumber || invoice.id.slice(0, 8)}
                </h3>
                {invoiceBadge(invoice.status)}
              </div>
              <p className="text-xs text-gray-400">تاريخ الإصدار: {fmtDateTime(invoice.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[72vh] overflow-y-auto px-0.5 text-xs">
          {/* Doctor & Patient Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-700/60">
            <div>
              <span className="text-gray-400 block mb-0.5">بيانات الطبيب</span>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{invoice.doctorName || "—"}</p>
              {invoice.doctor?.clinicName && <p className="text-gray-500 mt-0.5">{invoice.doctor.clinicName}</p>}
              {invoice.doctor?.phone && <p className="text-gray-500 mt-0.5 font-mono">{invoice.doctor.phone}</p>}
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">
                {consolidatedData ? "نوع المطالبة" : "بيانات المريض والحالة"}
              </span>
              {consolidatedData ? (
                <div>
                  <span className="inline-flex items-center gap-1.5 font-bold text-sm text-indigo-700 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    فاتورة شهرية مجمعة ({casesCount} حالة)
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    إجمالي الوحدات:{" "}
                    <strong className="text-gray-800 dark:text-gray-200 font-mono">{totalUnits} وحدة</strong>
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {invoice.patientName || invoice.case?.patientName || "—"}
                  </p>
                  {invoice.case?.caseNumber && (
                    <p className="text-blue-600 dark:text-blue-400 font-semibold mt-0.5 font-mono">
                      حالة رقم: {invoice.case.caseNumber}
                    </p>
                  )}
                </>
              )}
              {invoice.dueDate && (
                <p className="text-amber-600 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> استحقاق: {fmtDate(invoice.dueDate)}
                </p>
              )}
            </div>
          </div>

          {/* Consolidated cases breakdown if items exist */}
          {consolidatedData && items.length > 0 && (
            <div className="rounded-xl border dark:border-gray-700/80 overflow-hidden bg-white dark:bg-gray-800/40">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 px-3 border-b dark:border-gray-700 flex items-center justify-between">
                <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  تفاصيل حالات الفاتورة المجمعة ({casesCount} حالة — {totalUnits} وحدة)
                </span>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium tabular-nums">
                  متوسط الحالة: {fmtMoney(invoice.total / (casesCount || 1))} ج.م
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-right text-xs tabular-nums">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 sticky top-0 font-semibold border-b dark:border-gray-700">
                    <tr>
                      <th className="py-2 px-2.5 text-center w-8">م</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">رقم الحالة</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">اسم المريض</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">الطبيب المعالج</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">نوع التركيبة / الشغل</th>
                      <th className="py-2 px-2.5 text-center whitespace-nowrap">العدد</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">سعر الوحدة</th>
                      <th className="py-2 px-2.5 text-left whitespace-nowrap">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {items.map((item, idx) => (
                      <tr
                        key={item.caseId || idx}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
                      >
                        <td className="py-2 px-2.5 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-bold text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap">
                          {item.caseNumber || "—"}
                        </td>
                        <td className="py-2 px-2.5 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {item.patientName || "—"}
                        </td>
                        <td className="py-2 px-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {item.doctorName ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                              د. {item.doctorName}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-gray-700 dark:text-gray-300">{item.workTypeName || "—"}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-gray-800 dark:text-gray-200 font-mono">
                          {item.unitsCount || 1}
                        </td>
                        <td className="py-2 px-2.5 text-gray-600 dark:text-gray-300 font-mono whitespace-nowrap">
                          {fmtMoney(item.unitPrice || 0)}
                        </td>
                        <td className="py-2 px-2.5 text-left font-bold text-gray-900 dark:text-gray-100 font-mono whitespace-nowrap">
                          {fmtMoney(item.total || 0)} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Single Case Breakdown if linked */}
          {!consolidatedData && invoice.case && (
            <div className="p-3 bg-blue-50/40 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/40">
              <span className="font-bold text-gray-800 dark:text-gray-200 block mb-2">
                تفاصيل العمل الفني بالحالة:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-400">نوع الشغل:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {invoice.case.workTypeName || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">عدد الوحدات:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                    {invoice.case.unitsCount || 1} وحدة
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">سعر الوحدة:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                    {fmtMoney(invoice.case.unitPrice)} ج.م
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">الأسنان:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.case.teeth || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400">اللون (Shade):</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.case.shade || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400">الخامة:</span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{invoice.case.material || "—"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Financial Totals */}
          <div className="grid grid-cols-3 gap-2.5 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border dark:border-gray-700/60 tabular-nums">
            <div>
              <span className="text-gray-400">الإجمالي</span>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono">
                {fmtMoney(invoice.total)} ج.م
              </p>
            </div>
            <div>
              <span className="text-gray-400">المسدد</span>
              <p className="text-base font-bold text-green-600 dark:text-green-400 font-mono">
                {fmtMoney(invoice.paid)} ج.م
              </p>
            </div>
            <div>
              <span className="text-gray-400">المتبقي</span>
              <p className="text-base font-bold text-red-600 font-mono">{fmtMoney(invoice.remaining)} ج.م</p>
            </div>
          </div>

          {/* Notes */}
          {displayNote && (
            <div className="p-2.5 bg-amber-50/60 dark:bg-amber-900/20 rounded-lg text-amber-900 dark:text-amber-300">
              <span className="font-semibold">ملاحظات:</span> {displayNote}
            </div>
          )}

          {/* Payment History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-900 dark:text-gray-100">
                سجل الدفعات المسددة ({invoice.payments?.length || 0})
              </span>
              {invoice.remaining > 0 && (
                <button
                  type="button"
                  onClick={onAddPayment}
                  className="text-xs text-green-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة دفعة
                </button>
              )}
            </div>

            {!invoice.payments || invoice.payments.length === 0 ? (
              <p className="text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-700">
                لم يتم تسجيل أي دفعات لهذه الفاتورة بعد
              </p>
            ) : (
              <div className="border dark:border-gray-700 rounded-xl overflow-hidden divide-y dark:divide-gray-700 tabular-nums">
                {invoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
                  >
                    <div>
                      <p className="font-bold text-green-700 dark:text-green-400 font-mono">
                        {fmtMoney(p.amount)} ج.م
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {fmtDateTime(p.createdAt)} • طريقة: <span className="font-semibold">{p.method || "CASH"}</span>
                      </p>
                    </div>
                    {p.note && (
                      <span className="text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {p.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t dark:border-gray-800 mt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onPdf}
              className="px-3 py-1.5 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/30 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> فاتورة PDF
            </button>
            <button
              onClick={onPaymentLink}
              className="px-3 py-1.5 border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:bg-indigo-900/30 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" /> رابط دفع
            </button>
            <button
              onClick={() => shareInvoiceWhatsApp(invoice)}
              className="px-3 py-1.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" /> إرسال واتساب
            </button>
          </div>

          <div className="flex items-center gap-2">
            {invoice.remaining > 0 && (
              <button
                onClick={onAddPayment}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 flex items-center gap-1.5"
              >
                <Banknote className="w-3.5 h-3.5" /> تسجيل سداد
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 border dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DentalInvoiceDetailModal;
