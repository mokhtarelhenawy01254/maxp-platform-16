import { FileText, X as XMarkIcon } from "lucide-react";
import type { DentalInvoice } from "../../../../shared";
import { fmtDateTime } from "../../../../shared";
import { invoiceBadge } from "../../../types/dentalInvoicesTypes";

interface InvoiceDetailModalHeaderProps {
  invoice: DentalInvoice;
  onClose: () => void;
}

export function InvoiceDetailModalHeader({ invoice, onClose }: InvoiceDetailModalHeaderProps) {
  return (
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
  );
}
