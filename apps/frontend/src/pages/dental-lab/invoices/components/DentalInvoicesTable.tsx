import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Ban,
  Banknote,
  CreditCard,
  Eye,
  FileText,
  Link2,
  Loader2,
  MessageCircle,
  Sparkles,
  X as XMarkIcon,
} from "lucide-react";
import type { DentalInvoice } from "../../shared";
import { fetchInvoicePaymentLink, fetchInvoicePdf, fmtDate, fmtMoney } from "../../shared";
import { invoiceBadge, shareInvoiceWhatsApp } from "../types/dentalInvoicesTypes";

export interface DentalInvoicesTableProps {
  loading: boolean;
  error: string | null;
  onClearError: () => void;
  rows: DentalInvoice[];
  onRowClick: (inv: DentalInvoice) => void;
  onPaymentClick: (inv: DentalInvoice) => void;
  onVoidClick: (inv: DentalInvoice) => void;
}

export function DentalInvoicesTable({
  loading,
  error,
  onClearError,
  rows,
  onRowClick,
  onPaymentClick,
  onVoidClick,
}: DentalInvoicesTableProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button
            onClick={onClearError}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"
            aria-label="إغلاق التنبيه"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-base font-semibold text-gray-600 dark:text-gray-300">
              {t("dentalLab.invoices.noData")}
            </p>
            <p className="text-xs text-gray-400 mt-1">جرّب تغيير فلاتر البحث أو الطبيب المحدد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-right tabular-nums">
              <thead className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-300 font-bold">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">رقم الفاتورة</th>
                  <th className="py-3 px-3 whitespace-nowrap">التاريخ</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">{t("dentalLab.invoices.doctorName")}</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">الحالة / المريض</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t("dentalLab.invoices.total")}</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t("dentalLab.invoices.paid")}</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t("dentalLab.invoices.remaining")}</th>
                  <th className="py-3 px-3 whitespace-nowrap">الاستحقاق</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t("dentalLab.common.status")}</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">
                    {t("dentalLab.common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {rows.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => onRowClick(inv)}
                    className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap font-mono">
                      {inv.invoiceNumber || inv.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmtDate(inv.createdAt)}
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {inv.doctorName || "—"}
                    </td>
                    <td className="py-3 px-3.5">
                      {(() => {
                        let isConsolidated = false;
                        let casesCount = 0;
                        let totalUnits = 0;
                        if (inv.notes && inv.notes.startsWith("{") && inv.notes.includes('"items"')) {
                          try {
                            const p = JSON.parse(inv.notes);
                            if (p.isConsolidated || Array.isArray(p.items)) {
                              isConsolidated = true;
                              casesCount = p.items?.length || p.casesCount || p.summary?.casesCount || 0;
                              totalUnits =
                                p.totalUnits ||
                                p.summary?.totalUnits ||
                                (p.items || []).reduce(
                                  (acc: number, it: any) => acc + (Number(it.unitsCount) || 1),
                                  0
                                );
                            }
                          } catch {}
                        }
                        if (isConsolidated) {
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded text-xs w-fit">
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                                فاتورة مجمعة ({casesCount} حالة)
                              </span>
                              {totalUnits > 0 && (
                                <span className="text-[11px] text-gray-500 font-mono">
                                  {totalUnits} وحدة
                                </span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {inv.patientName || inv.case?.patientName || "—"}
                            </span>
                            {inv.case?.caseNumber && (
                              <span className="text-[11px] text-gray-400 font-mono">
                                حالة: {inv.case.caseNumber}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap font-mono">
                      {fmtMoney(inv.total)}
                    </td>
                    <td className="py-3 px-3 text-green-600 dark:text-green-400 font-semibold whitespace-nowrap font-mono">
                      {fmtMoney(inv.paid)}
                    </td>
                    <td className="py-3 px-3 text-red-600 font-bold whitespace-nowrap font-mono">
                      {fmtMoney(inv.remaining)}
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {inv.dueDate ? (
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                          {fmtDate(inv.dueDate)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">{invoiceBadge(inv.status)}</td>
                    <td className="py-3 px-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onRowClick(inv)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                          title="تفاصيل الفاتورة"
                          aria-label="تفاصيل الفاتورة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const blob = await fetchInvoicePdf(inv.id);
                              const url = URL.createObjectURL(blob);
                              window.open(url, "_blank");
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : t("dentalLab.common.noData")
                              );
                            }
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title={t("dentalLab.invoices.pdf")}
                          aria-label={t("dentalLab.invoices.pdf")}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => shareInvoiceWhatsApp(inv)}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                          title="إرسال الفاتورة عبر واتساب"
                          aria-label="إرسال الفاتورة عبر واتساب"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const r = await fetchInvoicePaymentLink(inv.id);
                              if (r.configured && r.checkoutUrl) {
                                window.open(r.checkoutUrl, "_blank");
                              } else {
                                toast.info(r.message || t("dentalLab.invoices.paymentNotConfigured"));
                              }
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : t("dentalLab.common.noData")
                              );
                            }
                          }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                          title={t("dentalLab.invoices.paymentLink")}
                          aria-label={t("dentalLab.invoices.paymentLink")}
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        {inv.remaining > 0 && (
                          <button
                            onClick={() => onPaymentClick(inv)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300 rounded-lg text-xs font-semibold"
                            title={t("dentalLab.invoices.addPayment")}
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>سداد</span>
                          </button>
                        )}
                        {inv.status !== "VOID" && inv.status !== "PAID" && (
                          <button
                            onClick={() => onVoidClick(inv)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                            title="إلغاء الفاتورة (Void)"
                            aria-label="إلغاء الفاتورة"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DentalInvoicesTable;
