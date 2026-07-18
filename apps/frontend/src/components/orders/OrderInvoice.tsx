import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ArrowLeft, Download, Mail, Printer } from "lucide-react";
import InvoiceBarcode from "./InvoiceBarcode";

interface InvoiceSettings {
  showBarcodeOrderCode: boolean;
  showBarcodeShippingCode: boolean;
}

interface InvoiceOrderItem {
  id?: string;
  productName: string;
  quantity: number;
  price: number | string;
  total?: number | string;
  totalPrice?: number | string;
  variantName?: string | null;
  productColor?: string | null;
  productSize?: string | null;
  productSku?: string | null;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  subtotal: number | string;
  tax: number | string;
  taxRate?: number;
  shipping: number | string;
  discount: number | string;
  totalAmount: number | string;
  currency: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  city?: string | null;
  governorate?: string | null;
  companyName: string;
  companyPhone?: string | null;
  companyLogo?: string | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  notes?: string | null;
  printCount: number;
  order?: {
    orderNumber?: string;
    status?: string;
    turboTrackingNumber?: string | null;
    orderItems?: InvoiceOrderItem[];
  };
}

interface ApiErrorShape {
  response?: { data?: { message?: string } };
  message?: string;
}

const defaultSettings: InvoiceSettings = {
  showBarcodeOrderCode: true,
  showBarcodeShippingCode: true,
};

const parseNumber = (value: number | string | null | undefined) =>
  Number(value || 0);

const getErrorMessage = (error: unknown, fallback: string) => {
  const typedError = error as ApiErrorShape;
  return typedError.response?.data?.message || typedError.message || fallback;
};

const OrderInvoice: React.FC<{ orderId?: string; invoiceId?: string }> = ({
  orderId,
  invoiceId,
}) => {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  const finalOrderId = orderId || params["orderId"];
  const finalInvoiceId = invoiceId || params["invoiceId"];

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let response;
      if (finalInvoiceId) {
        response = await apiClient.get(`/order-invoices/${finalInvoiceId}`);
      } else if (finalOrderId) {
        response = await apiClient.get(`/order-invoices/order/${finalOrderId}`);
      } else {
        throw new Error(t("orders.invoice.errorOrderRequired"));
      }

      setInvoice(response.data.data);
    } catch (err: unknown) {
      console.error("Error fetching invoice:", err);
      setError(getErrorMessage(err, t("orders.invoice.fetchError")));
    } finally {
      setLoading(false);
    }
  }, [finalInvoiceId, finalOrderId]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await apiClient.get("/order-invoice-settings");
      if (response.data?.success && response.data?.data) {
        setSettings((prev) => ({ ...prev, ...response.data.data }));
      }
    } catch (err) {
      console.warn("Could not load invoice settings, using defaults.", err);
    }
  }, []);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldPrint = urlParams.get("print") === "true";
    if (shouldPrint && invoice && !loading) {
      setTimeout(() => {
        window.print();
      }, 1200);
    }
  }, [invoice, loading]);

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      setPrinting(true);
      await apiClient.post(`/order-invoices/${invoice.id}/print`);
      window.print();
    } catch (err: unknown) {
      console.error("Error printing invoice:", err);
    } finally {
      setPrinting(false);
    }
  };

  const handleEmail = async () => {
    if (!invoice) return;
    try {
      await apiClient.post(`/order-invoices/${invoice.id}/email`);
      alert(t("orders.invoice.emailSent"));
    } catch (err: unknown) {
      console.error("Error emailing invoice:", err);
      alert(t("orders.invoice.emailError"));
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatCurrency = (amount: number, currency: string = "EGP") => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
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

  const getItemTotal = (item: InvoiceOrderItem) => {
    const explicitTotal = item.total ?? item.totalPrice;
    if (explicitTotal !== undefined && explicitTotal !== null) {
      return parseNumber(explicitTotal);
    }
    return parseNumber(item.price) * parseNumber(item.quantity);
  };

  const showBarcodeOrderCode = settings.showBarcodeOrderCode !== false;
  const showBarcodeShippingCode = settings.showBarcodeShippingCode !== false;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || t("orders.invoice.notFound")}
        </div>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-2">
          <ArrowLeft className="size-4" /> {t("orders.invoice.back")}
        </Button>
      </div>
    );
  }

  const statusBadge = getPaymentStatusBadge(invoice.paymentStatus);

  return (
    <div className="invoice-wrapper">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: #fff; }
          .invoice-page { padding: 0 !important; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A5; }
        }
        @media screen {
          .invoice-wrapper {
            background: #f1f5f9;
            min-height: 100vh;
            padding: 32px 16px;
          }
          .invoice-page {
            background: #fff;
            max-width: 148mm;
            margin: 0 auto;
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

      {/* شريط الإجراءات */}
      <div className="no-print mb-4 flex gap-2 flex-wrap max-w-[210mm] mx-auto">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" /> {t("orders.invoice.back")}
        </Button>
        <Button onClick={handlePrint} disabled={printing}>
          <Printer className="size-4" /> {t("orders.invoice.print")}
        </Button>
        <Button variant="outline" onClick={handleEmail}>
          <Mail className="size-4" /> {t("orders.invoice.email")}
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Download className="size-4" /> {t("orders.invoice.downloadPdf")}
        </Button>
      </div>

      <div className="invoice-page" dir="rtl" ref={printRef}>
        {/* الهيدر - سوان */}
        <div className="px-4 pt-3 pb-1">
          <h1 className="text-base font-bold text-slate-900">{invoice.companyName}</h1>
        </div>

        <div className="px-3 py-2">
          {/* الباركود - فوق */}
          {(showBarcodeOrderCode || showBarcodeShippingCode) &&
            (invoice.order?.orderNumber || invoice.order?.turboTrackingNumber) && (
            <div className="mb-2">
              <div className="flex justify-center gap-6" style={{ transform: "scale(0.7)", transformOrigin: "center" }}>
                {showBarcodeOrderCode && invoice.order?.orderNumber && (
                  <InvoiceBarcode value={invoice.order.orderNumber} label="رقم الطلب" />
                )}
                {showBarcodeShippingCode && invoice.order?.turboTrackingNumber && (
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
              {invoice.customerAddress && <p className="max-w-xs">{invoice.customerAddress}</p>}
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
                {invoice.order?.orderItems?.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="text-right font-medium text-slate-900">{item.productName}</td>
                    <td className="text-center font-mono text-xs text-slate-500">{item.productSku || "—"}</td>
                    <td className="text-center text-slate-700">{item.quantity}</td>
                    <td className="text-left text-slate-700">{formatCurrency(parseNumber(item.price), invoice.currency)}</td>
                    <td className="text-left font-semibold text-slate-900">{formatCurrency(getItemTotal(item), invoice.currency)}</td>
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
                  <span className="text-slate-700">{formatCurrency(parseNumber(invoice.subtotal), invoice.currency)}</span>
                </div>
                {parseNumber(invoice.discount) > 0 && (
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-500">الخصم</span>
                    <span className="text-red-500">- {formatCurrency(parseNumber(invoice.discount), invoice.currency)}</span>
                  </div>
                )}
                {parseNumber(invoice.shipping) > 0 && (
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-slate-500">الشحن</span>
                    <span className="text-slate-700">{formatCurrency(parseNumber(invoice.shipping), invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 mt-0.5" style={{ borderTop: "1.5px solid #0f172a" }}>
                  <span className="text-xs font-bold text-slate-900">الإجمالي</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(parseNumber(invoice.totalAmount), invoice.currency)}</span>
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

export default OrderInvoice;
