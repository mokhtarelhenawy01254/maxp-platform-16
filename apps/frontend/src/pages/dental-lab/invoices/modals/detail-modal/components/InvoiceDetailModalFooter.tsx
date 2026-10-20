import { Banknote, FileText, Link2, MessageCircle } from "lucide-react";
import type { DentalInvoice } from "../../../../shared";
import { shareInvoiceWhatsApp } from "../../../types/dentalInvoicesTypes";

interface InvoiceDetailModalFooterProps {
  invoice: DentalInvoice;
  onPdf: () => void;
  onPaymentLink: () => void;
  onAddPayment: () => void;
  onClose: () => void;
}

export function InvoiceDetailModalFooter({
  invoice,
  onPdf,
  onPaymentLink,
  onAddPayment,
  onClose,
}: InvoiceDetailModalFooterProps) {
  return (
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
  );
}
