import React from "react";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import InvoiceBarcode from "./InvoiceBarcode";

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
  const formatCurrency = (amount: number, currency: string = "EGP") => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      CANCELLED: "bg-red-50 text-red-700 border-red-200",
      REFUNDED: "bg-slate-50 text-slate-700 border-slate-200",
      PARTIALLY_PAID: "bg-amber-50 text-amber-700 border-amber-200",
    };
    const labels: Record<string, string> = {
      PAID: "مدفوعة",
      PENDING: "قيد الانتظار",
      CANCELLED: "ملغاة",
      REFUNDED: "مستردة",
      PARTIALLY_PAID: "مدفوعة جزئياً",
    };
    return {
      className: styles[status] || "bg-slate-50 text-slate-700 border-slate-200",
      label: labels[status] || status,
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const formatAddress = (address: any): string => {
    if (!address) return "";
    if (typeof address === "string") {
      if (address.startsWith("{")) {
        try {
          const parsed = JSON.parse(address);
          return formatAddress(parsed);
        } catch (e) {
          return address;
        }
      }
      return address;
    }
    if (typeof address === "object") {
      const parts = [];
      if (address.address) parts.push(address.address);
      if (address.area) parts.push(address.area);
      if (address.city) parts.push(address.city);
      if (address.governorate) parts.push(address.governorate);
      if (address.country) parts.push(address.country);
      return parts.filter(Boolean).join(", ") || "";
    }
    return "";
  };

  const statusBadge = getPaymentStatusBadge(invoice.paymentStatus);

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
        {/* Header - للشاشة فقط */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur print:hidden dark:border-slate-700 dark:bg-slate-900/95 sm:px-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
            فاتورة #{invoice.invoiceNumber}
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
            body { margin: 0; padding: 0; background: #fff; }
            body * { visibility: hidden; }
            .print\\:max-w-none, .print\\:max-w-none * { visibility: visible; }
            .print\\:max-w-none { position: absolute; left: 0; top: 0; width: 100%; }
            @page { margin: 0; size: A5; }
          }
          .invoice-table th {
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            padding: 4px 8px;
            border-bottom: 1.5px solid #e2e8f0;
          }
          .invoice-table td {
            padding: 3px 8px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 12px;
          }
          .invoice-table tr:last-child td {
            border-bottom: none;
          }
        `}</style>

        {/* محتوى الفاتورة */}
        <div className="p-3 print:p-2">
          {/* الهيدر - سوان */}
          <div className="mb-2">
            <h1 className="text-base font-bold text-slate-900">{invoice.companyName}</h1>
          </div>

          {/* الباركود - فوق */}
          {(invoice.order?.orderNumber || invoice.order?.turboTrackingNumber) && (
            <div className="mb-2">
              <div className="flex justify-center gap-6" style={{ transform: "scale(0.7)", transformOrigin: "center" }}>
                {invoice.order.orderNumber && (
                  <InvoiceBarcode value={invoice.order.orderNumber} label="رقم الطلب" />
                )}
                {invoice.order.turboTrackingNumber && (
                  <InvoiceBarcode value={invoice.order.turboTrackingNumber} label="كود الشحن" />
                )}
              </div>
            </div>
          )}

          {/* العميل */}
          <div className="mb-2">
            <p className="text-xs font-semibold text-slate-900">{invoice.customerName}</p>
            <div className="text-xs text-slate-600 space-y-0.5 mt-0.5">
              {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
              {invoice.customerEmail && <p>{invoice.customerEmail}</p>}
              <p className="max-w-xs">{formatAddress(invoice.customerAddress)}</p>
              {invoice.city && <p>{invoice.city}</p>}
            </div>
          </div>

          {/* جدول المنتجات */}
          <div className="mb-1">
            <table className="w-full invoice-table">
              <thead>
                <tr>
                  <th className="text-right">المنتج</th>
                  <th className="text-center">SKU</th>
                  <th className="text-center">الكمية</th>
                  <th className="text-left">السعر</th>
                  <th className="text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.order?.orderItems?.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="text-right font-medium text-slate-900">{item.productName}</td>
                    <td className="text-center font-mono text-xs text-slate-500">{item.productSku || "—"}</td>
                    <td className="text-center text-slate-700">{item.quantity}</td>
                    <td className="text-left text-slate-700">{formatCurrency(item.price, invoice.currency)}</td>
                    <td className="text-left font-semibold text-slate-900">{formatCurrency(item.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* المجاميع */}
          <div className="mb-1">
            <div className="max-w-xs mr-auto text-left">
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-500">المجموع الفرعي</span>
                  <span className="text-slate-700">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-500">الخصم</span>
                    <span className="text-red-500">- {formatCurrency(invoice.discount, invoice.currency)}</span>
                  </div>
                )}
                {invoice.shipping > 0 && (
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-500">الشحن</span>
                    <span className="text-slate-700">{formatCurrency(invoice.shipping, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 mt-0.5" style={{ borderTop: "1.5px solid #0f172a" }}>
                  <span className="text-xs font-bold text-slate-900">الإجمالي</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                </div>
              </div>
              {invoice.paymentMethod && (
                <div className="mt-1 pt-1" style={{ borderTop: "1px solid #e2e8f0" }}>
                  <p className="text-xs text-slate-500">طريقة الدفع: <span className="font-medium text-slate-700">{invoice.paymentMethod}</span></p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
