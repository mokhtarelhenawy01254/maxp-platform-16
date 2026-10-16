import React from "react";
import { X, Printer } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-xs p-0 sm:items-center sm:p-4 overscroll-contain animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`فاتورة ${invoice.invoiceNumber}`}
    >
      <div
        className="max-h-[calc(100vh-0.5rem)] w-full overflow-y-auto rounded-t-2xl border border-border/70 bg-card text-foreground shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl print:max-h-none print:max-w-none print:rounded-none print:border-0 print:bg-white print:text-black print:shadow-none"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted sm:hidden print:hidden" />

        {/* Header bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur-xs print:hidden sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground tracking-tight font-mono tabular-nums">
              فاتورة #{invoice.invoiceNumber as string}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-97 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onClose}
              aria-label="إغلاق الفاتورة"
              className="p-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
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
