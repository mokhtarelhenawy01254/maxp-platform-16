import React from "react";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";

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

  const getPaymentStatusText = (status: string) => {
    const statusMap: any = {
      PAID: "مدفوعة",
      PENDING: "قيد الانتظار",
      CANCELLED: "ملغاة",
      REFUNDED: "مستردة",
      PARTIALLY_PAID: "مدفوعة جزئياً",
    };
    return statusMap[status] || status;
  };

  const handlePrint = () => {
    window.print();
  };

  // دالة لتحويل العنوان من JSON إلى نص مقروء
  const formatAddress = (address: any): string => {
    if (!address) return "";

    // إذا كان string، حاول parse
    if (typeof address === "string") {
      // إذا كان يبدأ بـ { يعني JSON
      if (address.startsWith("{")) {
        try {
          const parsed = JSON.parse(address);
          return formatAddress(parsed); // استدعاء نفس الدالة بعد الـ parse
        } catch (e) {
          return address; // إذا فشل الـ parse، أرجع النص كما هو
        }
      }
      return address;
    }

    // إذا كان object، استخرج البيانات
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

        {/* محتوى الفاتورة */}
        <div className="p-5 text-slate-900 dark:text-slate-100 print:p-8 print:text-black sm:p-6">
          {/* Header الفاتورة */}
          <div className="mb-6 flex items-start justify-between border-b-2 border-slate-200 pb-4 dark:border-slate-700 print:border-slate-300">
            <div>
              {invoice.companyLogo && (
                <img
                  src={invoice.companyLogo}
                  alt="Logo"
                  className="h-12 mb-2"
                />
              )}
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 print:text-black">
                {invoice.companyName}
              </h1>
              {invoice.companyPhone && (
                <p className="text-sm text-slate-500 dark:text-slate-400 print:text-slate-600">
                  {invoice.companyPhone}
                </p>
              )}
              {invoice.companyAddress && (
                <p className="text-sm text-slate-500 dark:text-slate-400 print:text-slate-600">
                  {invoice.companyAddress}
                </p>
              )}
            </div>
            <div className="text-left">
              <div className="mb-2 text-2xl font-bold text-blue-600 dark:text-blue-400 print:text-blue-700">
                فاتورة
              </div>
              <p className="text-sm">
                <span className="font-semibold">رقم:</span>{" "}
                {invoice.invoiceNumber}
              </p>
              <p className="text-sm">
                <span className="font-semibold">طلب:</span>{" "}
                {invoice.order?.orderNumber}
              </p>
              {invoice.order?.turboTrackingNumber && (
                <p className="text-sm">
                  <span className="font-semibold">رقم تتبع تربو:</span>{" "}
                  {invoice.order.turboTrackingNumber}
                </p>
              )}
              <p className="text-sm">
                <span className="font-semibold">التاريخ:</span>{" "}
                {new Date(invoice.issueDate).toLocaleDateString("ar-EG")}
              </p>
            </div>
          </div>

          {/* معلومات العميل */}
          <div className="mb-6 rounded-[24px] border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70 print:border-slate-200 print:bg-slate-50">
            <h3 className="mb-2 font-bold text-slate-800 dark:text-slate-100 print:text-slate-800">
              معلومات العميل
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-semibold">الاسم:</span>{" "}
                {invoice.customerName}
              </div>
              {invoice.customerPhone && (
                <div>
                  <span className="font-semibold">الهاتف:</span>{" "}
                  {invoice.customerPhone}
                </div>
              )}
              {invoice.order?.createdByName && (
                <div>
                  <span className="font-semibold">الكوتشي:</span>{" "}
                  {invoice.order.createdByName}
                </div>
              )}
              {invoice.customerAddress && (
                <div className="col-span-2">
                  <span className="font-semibold">العنوان:</span>{" "}
                  {invoice.customerAddress}
                </div>
              )}
              {invoice.city && (
                <div>
                  <span className="font-semibold">المدينة:</span> {invoice.city}
                </div>
              )}
            </div>
          </div>

          {/* جدول المنتجات */}
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-800 dark:border-slate-500 print:border-slate-800">
                  <th className="text-right py-2 font-bold">المنتج</th>
                  <th className="text-center py-2 font-bold w-20">الكمية</th>
                  <th className="text-right py-2 font-bold w-24">السعر</th>
                  <th className="text-right py-2 font-bold w-28">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.order?.orderItems?.map((item: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-200 dark:border-slate-700 print:border-slate-200"
                  >
                    <td className="text-right py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100 print:text-black">
                        {item.productName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
                        {item.productSku && (
                          <span>SQ: {item.productSku}</span>
                        )}
                        {item.productSku && (item.productColor || item.productSize) && (
                          <span> | </span>
                        )}
                        {item.productColor && (
                          <span>اللون: {item.productColor}</span>
                        )}
                        {item.productColor && item.productSize && (
                          <span> | </span>
                        )}
                        {item.productSize && (
                          <span>المقاس: {item.productSize}</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3">{item.quantity}</td>
                    <td className="text-right py-3">
                      {formatCurrency(item.price, invoice.currency)}
                    </td>
                    <td className="text-right py-3 font-semibold">
                      {formatCurrency(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* المجاميع */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 print:text-slate-600">
                  المجموع الفرعي:
                </span>
                <span className="font-semibold">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </span>
              </div>
              {invoice.shipping > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600">
                    الشحن:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(invoice.shipping, invoice.currency)}
                  </span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600">
                    الضريبة:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(invoice.tax, invoice.currency)}
                  </span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-600">
                    الخصم:
                  </span>
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(invoice.discount, invoice.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-3 bg-blue-600 text-white px-4 rounded-lg font-bold text-base">
                <span>الإجمالي:</span>
                <span>
                  {formatCurrency(invoice.totalAmount, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* حالة الدفع */}
          <div className="mb-4 rounded-[24px] border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70 print:border-slate-200 print:bg-slate-50">
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="font-semibold">حالة الدفع: </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    invoice.paymentStatus === "PAID"
                      ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300"
                      : invoice.paymentStatus === "PENDING"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300"
                        : "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300"
                  }`}
                >
                  {getPaymentStatusText(invoice.paymentStatus)}
                </span>
              </div>
              {invoice.paymentMethod && (
                <div>
                  <span className="font-semibold">طريقة الدفع: </span>
                  <span>{invoice.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>

          {/* ملاحظات */}
          {invoice.notes && (
            <div className="rounded-[22px] border-r-4 border-yellow-400 bg-yellow-50 p-4 text-sm dark:border-yellow-500/70 dark:bg-yellow-500/10">
              <p className="font-semibold mb-1">ملاحظات:</p>
              <p className="text-slate-700 dark:text-slate-200 print:text-slate-700">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 print:border-slate-200 print:text-slate-500">
            <p>شكراً لتعاملكم معنا</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:max-w-none, .print\\:max-w-none * {
            visibility: visible;
          }
          .print\\:max-w-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceModal;
