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
            body * { visibility: hidden; }
            .print\\:max-w-none, .print\\:max-w-none * { visibility: visible; }
            .print\\:max-w-none { position: absolute; left: 0; top: 0; width: 100%; }
          }
          .invoice-table th {
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            padding: 12px 16px;
            border-bottom: 2px solid #e2e8f0;
          }
          .invoice-table td {
            padding: 14px 16px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
          }
          .invoice-table tr:last-child td {
            border-bottom: none;
          }
        `}</style>

        {/* محتوى الفاتورة - التصميم الموحد */}
        <div className="p-5 sm:p-6 print:p-8">
          {/* الهيدر */}
          <div className="px-6 pt-6 pb-4 rounded-t-xl" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
            <div className="flex justify-between items-start">
              <div className="text-right">
                <h1 className="text-xl font-bold text-white mb-1">{invoice.companyName}</h1>
                {invoice.companyPhone && (
                  <div className="text-sm text-slate-400 space-y-0.5 mt-2">
                    <p>{invoice.companyPhone}</p>
                  </div>
                )}
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-400 mb-1 font-medium tracking-wider">فاتورة</p>
                <h2 className="text-lg font-bold text-white">{invoice.invoiceNumber}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {new Date(invoice.issueDate).toLocaleDateString("ar-EG")}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            {/* معلومات العميل + الطلب */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 tracking-wide">معلومات العميل</p>
                <p className="text-sm font-semibold text-slate-900">{invoice.customerName}</p>
                <div className="text-sm text-slate-600 space-y-0.5 mt-1">
                  {invoice.customerPhone && <p>هاتف: {invoice.customerPhone}</p>}
                  {invoice.customerEmail && <p>بريد: {invoice.customerEmail}</p>}
                  <p className="max-w-xs">{formatAddress(invoice.customerAddress)}</p>
                  {invoice.city && <p>{invoice.city}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 mb-2 tracking-wide">بيانات الطلب</p>
                <div className="text-sm text-slate-600 space-y-0.5">
                  <p><span className="font-medium text-slate-900">رقم الطلب:</span> {invoice.order?.orderNumber || "-"}</p>
                  {invoice.order?.turboTrackingNumber && (
                    <p><span className="font-medium text-slate-900">رقم تتبع:</span> {invoice.order.turboTrackingNumber}</p>
                  )}
                  <p><span className="font-medium text-slate-900">الحالة:</span>{" "}
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* جدول المنتجات */}
            <div className="mb-6">
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

            {/* المجاميع + الدفع */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                {invoice.notes && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2 tracking-wide">ملاحظات</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{invoice.notes}</p>
                  </div>
                )}
              </div>
              <div className="text-left">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-slate-500">المجموع الفرعي</span>
                    <span className="text-slate-700">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-slate-500">الخصم</span>
                      <span className="text-red-500">- {formatCurrency(invoice.discount, invoice.currency)}</span>
                    </div>
                  )}
                  {invoice.shipping > 0 && (
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-slate-500">الشحن</span>
                      <span className="text-slate-700">{formatCurrency(invoice.shipping, invoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 mt-1" style={{ borderTop: "2px solid #0f172a" }}>
                    <span className="text-sm font-bold text-slate-900">الإجمالي</span>
                    <span className="text-lg font-bold text-slate-900">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                  </div>
                </div>
                {invoice.paymentMethod && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid #e2e8f0" }}>
                    <p className="text-xs text-slate-500">طريقة الدفع: <span className="font-medium text-slate-700">{invoice.paymentMethod}</span></p>
                  </div>
                )}
              </div>
            </div>

            {/* الباركود */}
            {(invoice.order?.orderNumber || invoice.order?.turboTrackingNumber) && (
              <div className="pt-5" style={{ borderTop: "1px solid #e2e8f0" }}>
                <div className="flex justify-center gap-10">
                  {invoice.order.orderNumber && (
                    <InvoiceBarcode value={invoice.order.orderNumber} label="رقم الطلب" />
                  )}
                  {invoice.order.turboTrackingNumber && (
                    <InvoiceBarcode value={invoice.order.turboTrackingNumber} label="كود الشحن" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* الفوتر */}
          <div className="px-6 py-3 text-center rounded-b-xl" style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            <p className="text-xs text-slate-400">شكراً لتعاملكم معنا</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
