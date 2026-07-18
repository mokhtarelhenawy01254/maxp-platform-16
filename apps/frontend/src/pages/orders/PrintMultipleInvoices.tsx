import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { groupOrderDocumentQuantityOffers } from "../../utils/orderDocumentQuantityOffers";
import InvoiceBarcode from "../../components/orders/InvoiceBarcode";

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  totalAmount: number;
  currency: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  city: string | null;
  governorrate: string | null;
  companyName: string;
  companyPhone: string | null;
  companyEmail: string | null;
  companyAddress: string | null;
  companyLogo: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  notes: string | null;
  terms: string | null;
    order: {
      orderNumber: string;
      turboTrackingNumber?: string | null;
      orderItems: Array<{
        productName: string;
        productSku?: string;
        productColor?: string;
        productSize?: string;
        productDetails?: string;
        quantity: number;
        price: number;
        total: number;
        metadata?: unknown;
        product?: { sku?: string | null };
      }>;
    };
  }

const PrintMultipleInvoices: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvoices = useCallback(async () => {
    try {
      const ids = searchParams.get("ids");
      if (!ids) {
        setError("لم يتم تحديد فواتير");
        setLoading(false);
        return;
      }

      const invoiceIds = ids.split(",");
      const fetchedInvoices: Invoice[] = [];

      for (const id of invoiceIds) {
        try {
          const response = await apiClient.get(`/order-invoices/${id}`);
          if (response.data.success) {
            fetchedInvoices.push(response.data.data);
          }
        } catch (err) {
          console.error(`Error fetching invoice ${id}:`, err);
        }
      }

      setInvoices(fetchedInvoices);
      setLoading(false);
    } catch (err: unknown) {
      console.error("Error fetching invoices:", err);
      setError("خطأ في جلب الفواتير");
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (invoices.length > 0 && !loading) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [invoices, loading]);

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

  const renderInvoiceRows = (invoice: Invoice) => {
    const groupedItems = groupOrderDocumentQuantityOffers(
      invoice.order.orderItems || [],
    );

    return [
      ...groupedItems.groups.flatMap((group) => {
        const summaryRow = (
          <tr
            key={`${invoice.id}-${group.groupId}-summary`}
            className="border-b border-emerald-200 bg-emerald-50/70"
          >
            <td className="text-right py-3 pr-4 font-bold">
              <div>عرض كميات: {group.offerLabel}</div>
              <div className="text-xs font-medium text-slate-600 mt-1">
                {group.selectedPieces}/{group.offerQuantity || group.selectedPieces} قطع
                {group.freeShipping ? " • شحن مجاني" : ""}
              </div>
            </td>
            <td className="text-center font-mono text-xs text-slate-400">—</td>
            <td className="text-center font-bold">
              {group.offerQuantity || group.selectedPieces}
            </td>
            <td className="text-left text-slate-500">-</td>
            <td className="text-left font-bold">
              {formatCurrency(group.total, invoice.currency)}
            </td>
          </tr>
        );

        const itemRows = group.items.map(({ item, slotIndex }, itemIndex) => {
          const code = item.productSku || item.product?.sku;
          const extraDetails = [
            item.productColor ? `اللون: ${item.productColor}` : "",
            item.productSize ? `المقاس: ${item.productSize}` : "",
            item.productDetails ? item.productDetails : "",
          ]
            .filter(Boolean)
            .join(" | ");

          return (
            <tr
              key={`${invoice.id}-${group.groupId}-${itemIndex}`}
              className="border-b border-slate-100"
            >
              <td className="text-right py-3 pr-8">
                <div className="font-medium text-slate-900">{`القطعة ${slotIndex || itemIndex + 1} - ${item.productName}`}</div>
                {extraDetails ? (
                  <div className="text-xs text-slate-500 mt-1">{extraDetails}</div>
                ) : null}
              </td>
              <td className="text-center font-mono text-xs text-slate-500">{code || "—"}</td>
              <td className="text-center text-slate-700">{item.quantity}</td>
              <td className="text-left text-slate-700">
                {formatCurrency(item.price, invoice.currency)}
              </td>
              <td className="text-left font-semibold text-slate-900">
                {formatCurrency(item.total, invoice.currency)}
              </td>
            </tr>
          );
        });

        return [summaryRow, ...itemRows];
      }),
      ...groupedItems.singles.map((item, idx) => {
        const code = item.productSku || item.product?.sku;
        const extraDetails = [
          item.productColor ? `اللون: ${item.productColor}` : "",
          item.productSize ? `المقاس: ${item.productSize}` : "",
          item.productDetails ? item.productDetails : "",
        ]
          .filter(Boolean)
          .join(" | ");

        return (
          <tr key={`${invoice.id}-single-${idx}`} className="border-b border-slate-100">
            <td className="text-right py-3">
              <div className="font-medium text-slate-900">{item.productName}</div>
              {extraDetails ? (
                <div className="text-xs text-slate-500 mt-1">{extraDetails}</div>
              ) : null}
            </td>
            <td className="text-center font-mono text-xs text-slate-500">{code || "—"}</td>
            <td className="text-center text-slate-700">{item.quantity}</td>
            <td className="text-left text-slate-700">
              {formatCurrency(item.price, invoice.currency)}
            </td>
            <td className="text-left font-semibold text-slate-900">
              {formatCurrency(item.total, invoice.currency)}
            </td>
          </tr>
        );
      }),
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الفواتير...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-print-wrapper">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: #fff; }
          .invoice-page { page-break-after: always; padding: 0 !important; }
          .invoice-page:last-child { page-break-after: auto; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A4; }
        }
        @media screen {
          .invoice-print-wrapper {
            background: #f1f5f9;
            min-height: 100vh;
            padding: 32px 16px;
          }
          .invoice-page {
            background: #fff;
            max-width: 210mm;
            margin: 0 auto 24px;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
            overflow: hidden;
          }
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

      {/* زر الطباعة للشاشة فقط */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          طباعة جميع الفواتير ({invoices.length})
        </button>
      </div>

      {invoices.map((invoice) => {
        const statusBadge = getPaymentStatusBadge(invoice.paymentStatus);
        return (
          <div key={invoice.id} className="invoice-page" dir="rtl">
            {/* الهيدر */}
            <div className="px-10 pt-10 pb-6" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
              <div className="flex justify-between items-start">
                <div className="text-right">
                  <h1 className="text-2xl font-bold text-white mb-1">{invoice.companyName}</h1>
                  <div className="text-sm text-slate-400 space-y-0.5 mt-2">
                    {invoice.companyPhone && <p>{invoice.companyPhone}</p>}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-400 mb-1 font-medium tracking-wider">فاتورة</p>
                  <h2 className="text-lg font-bold text-white">{invoice.invoiceNumber}</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {new Date(invoice.issueDate).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-10 py-6">
              {/* معلومات العميل + الطلب */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 tracking-wide">معلومات العميل</p>
                  <p className="text-sm font-semibold text-slate-900">{invoice.customerName}</p>
                  <div className="text-sm text-slate-600 space-y-0.5 mt-1">
                    <p>هاتف: {invoice.customerPhone}</p>
                    <p className="max-w-xs">العنوان: {invoice.customerAddress || ""}</p>
                    <p>المدينة: {invoice.city || ""}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 mb-2 tracking-wide">بيانات الطلب</p>
                  <div className="text-sm text-slate-600 space-y-0.5">
                    <p><span className="font-medium text-slate-900">رقم الطلب:</span> {invoice.order.orderNumber}</p>
                    {invoice.order.turboTrackingNumber && (
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
              <div className="mb-8">
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
                    {renderInvoiceRows(invoice)}
                  </tbody>
                </table>
              </div>

              {/* المجاميع + الدفع */}
              <div className="grid grid-cols-2 gap-8">
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
              {(invoice.order.orderNumber || invoice.order.turboTrackingNumber) && (
                <div className="pt-6 mt-6" style={{ borderTop: "1px solid #e2e8f0" }}>
                  <div className="flex justify-center gap-12">
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
            <div className="px-10 py-4 text-center" style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
              <p className="text-xs text-slate-400">شكراً لتعاملكم معنا</p>
              <p className="text-xs text-slate-400 mt-0.5">منصة إدارة التواصل والمبيعات الإلكترونية</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PrintMultipleInvoices;
