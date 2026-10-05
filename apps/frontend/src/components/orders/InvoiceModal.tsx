import React from "react";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import InvoiceContent from "./InvoiceContent";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
import { printClean } from "../../utils/printClean";

interface InvoiceModalProps {
  invoice: Record<string, unknown>;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
  const { settings } = useInvoiceSettings();

  const handlePrint = () => {
    printClean();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-md p-0 sm:items-center sm:p-4 overscroll-contain"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`فاتورة ${invoice.invoiceNumber}`}
    >
      <div
        className="max-h-[calc(100vh-0.5rem)] w-full overflow-y-auto rounded-t-[30px] border border-slate-200/70 bg-white text-slate-900 shadow-xl dark:border-slate-700/70 dark:bg-slate-900 dark:text-slate-100 sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[28px] print:max-h-none print:max-w-none print:rounded-none print:border-0 print:bg-white print:text-black print:shadow-none"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden print:hidden" />

        {/* Header bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur print:hidden dark:border-slate-700 dark:bg-slate-900/95 sm:px-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
            فاتورة #{invoice.invoiceNumber as string}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <PrinterIcon className="w-5 h-5" />
              طباعة
            </button>
            <button
              onClick={onClose}
              aria-label="إغلاق الفاتورة"
              className="rounded-2xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        <style>{`
          @media print {
            html, body { margin: 0 !important; padding: 0 !important; background: #fff; }
            body * { visibility: hidden; }
            .print\\:max-w-none, .print\\:max-w-none * { visibility: visible; }
            .print\\:max-w-none { position: absolute; left: 0; top: 0; width: 100%; }
            @page { margin: 0; size: A5; }
            .invoice-number-text { display: none !important; }
          }
        `}</style>

        <div className="p-3 print:p-2">
          <InvoiceContent
            invoice={{
              ...invoice,
              companyName: invoice.companyName as string,
              companyPhone: invoice.companyPhone as string | null,
              companyLogo: invoice.companyLogo as string | null,
              customerName: invoice.customerName as string,
              customerPhone: invoice.customerPhone as string | null,
              customerEmail: invoice.customerEmail as string | null,
              customerAddress: invoice.customerAddress as string | null,
              city: invoice.city as string | null,
              governorate: (invoice.governorate || (invoice.order as any)?.governorate) as string | null,
              paymentMethod: invoice.paymentMethod as string | null,
              paymentStatus: invoice.paymentStatus as string,
              currency: invoice.currency as string,
              subtotal: invoice.subtotal as number,
              tax: invoice.tax as number,
              shipping: invoice.shipping as number,
              discount: invoice.discount as number,
              discountReason: (invoice as any).discountReason as string | null,
              totalAmount: invoice.totalAmount as number,
              invoiceNumber: invoice.invoiceNumber as string,
              notes: (invoice.notes || (invoice.order as any)?.notes) as string | null,
              metadata: invoice.metadata || (invoice.order as any)?.metadata,
              order: {
                ...((invoice.order as any) || {}),
                orderNumber: (invoice.order as any)?.orderNumber as string,
                total: (invoice.order as any)?.total,
                subtotal: (invoice.order as any)?.subtotal,
                shipping: (invoice.order as any)?.shipping,
                discount: (invoice.order as any)?.discount,
                tax: (invoice.order as any)?.tax,
                notes: ((invoice.order as any)?.notes || invoice.notes) as string | null,
                metadata: (invoice.order as any)?.metadata || invoice.metadata,
                turboTrackingNumber: (invoice.order as any)?.turboTrackingNumber as string | null,
                orderItems: ((invoice.order as any)?.orderItems || (invoice as any).items || []) as Array<{
                  productName: string;
                  quantity: number;
                  price: number;
                  total: number;
                  productSku?: string;
                }>,
              },
            }}
            settings={settings}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
