import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { groupOrderDocumentQuantityOffers } from "../../utils/orderDocumentQuantityOffers";
import InvoiceBarcode from "../../components/orders/InvoiceBarcode";

interface InvoiceSettings {
  showBarcodeOrderCode: boolean;
  showBarcodeShippingCode: boolean;
}

const defaultSettings: InvoiceSettings = {
  showBarcodeOrderCode: true,
  showBarcodeShippingCode: true,
};

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
  const [settings, setSettings] = useState<InvoiceSettings>(defaultSettings);

  useEffect(() => {
    apiClient.get("/order-invoice-settings").then((res) => {
      if (res.data?.success && res.data?.data) {
        setSettings((prev) => ({ ...prev, ...res.data.data }));
      }
    }).catch(() => {});
  }, []);

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
          @page { margin: 0; size: A5; }
        }
        @media screen {
          .invoice-print-wrapper {
            background: #f1f5f9;
            min-height: 100vh;
            padding: 32px 16px;
          }
          .invoice-page {
            background: #fff;
            max-width: 148mm;
            margin: 0 auto 24px;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            overflow: hidden;
          }
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
            {/* الهيدر - سوان */}
            <div className="px-3 pt-3 pb-1">
              <h1 className="text-base font-bold text-slate-900">{invoice.companyName}</h1>
            </div>

            <div className="px-3 py-2">
              {/* الباركود - فوق */}
              {(settings.showBarcodeOrderCode || settings.showBarcodeShippingCode) &&
                (invoice.order.orderNumber || invoice.order.turboTrackingNumber) && (
                <div className="mb-2">
                  <div className="flex justify-center gap-6" style={{ transform: "scale(0.7)", transformOrigin: "center" }}>
                    {settings.showBarcodeOrderCode && invoice.order.orderNumber && (
                      <InvoiceBarcode value={invoice.order.orderNumber} label="رقم الطلب" />
                    )}
                    {settings.showBarcodeShippingCode && invoice.order.turboTrackingNumber && (
                      <InvoiceBarcode value={invoice.order.turboTrackingNumber} label="كود الشحن" />
                    )}
                  </div>
                </div>
              )}

              {/* العميل */}
              <div className="mb-2">
                <p className="text-xs font-semibold text-slate-900">{invoice.customerName}</p>
                <div className="text-xs text-slate-600 space-y-0.5 mt-0.5">
                  <p>{invoice.customerPhone}</p>
                  <p className="max-w-xs">{invoice.customerAddress || ""}</p>
                  <p>{invoice.city || ""}</p>
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
                    {renderInvoiceRows(invoice)}
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
        );
      })}
    </div>
  );
};

export default PrintMultipleInvoices;
