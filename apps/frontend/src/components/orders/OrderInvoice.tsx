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

  const getPaymentStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PAID: "مدفوعة",
      PENDING: "قيد الانتظار",
      CANCELLED: "ملغاة",
      REFUNDED: "مستردة",
      PARTIALLY_PAID: "مدفوعة جزئياً",
    };
    return statusMap[status] || status;
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
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mt-2"
        >
          <ArrowLeft className="size-4" /> {t("orders.invoice.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="invoice-container">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .invoice-page { padding: 15mm !important; }
          .no-print { display: none !important; }
          @page { margin: 1cm; size: A4; }
        }
        @media screen {
          .invoice-container {
            background: #f3f4f6;
            min-height: 100vh;
            padding: 20px;
          }
          .invoice-page {
            background: white;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      {/* شريط الإجراءات */}
      <div className="no-print mb-4 flex gap-2 flex-wrap">
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
        {/* عنوان المنصة */}
        <div className="text-right mb-4 text-xs text-gray-500">
          <p>منصة إدارة التواصل والمبيعات الإلكترونية</p>
        </div>

        {/* رأس الفاتورة */}
        <div className="flex justify-between items-start mb-6">
          <div className="text-right">
            <p className="text-sm mb-1">
              <span className="font-bold">فاتورة: </span>
              {invoice.invoiceNumber}
            </p>
            <p className="text-sm mb-1">
              <span className="font-bold">طلب: </span>
              {invoice.order?.orderNumber || "-"}
            </p>
            {invoice.order?.turboTrackingNumber && (
              <p className="text-sm mb-1">
                <span className="font-bold">رقم تتبع تربو: </span>
                {invoice.order.turboTrackingNumber}
              </p>
            )}
            <p className="text-sm">{formatDate(invoice.issueDate)}</p>
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold mb-1">
              {invoice.companyName}
            </h1>
            <p className="text-sm">{invoice.customerPhone || ""}</p>
          </div>
        </div>

        {/* معلومات العميل */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-2 border-b pb-1">
            معلومات العميل
          </h3>
          <p className="text-sm mb-1">{invoice.customerName}</p>
          <p className="text-sm mb-1">هاتف: {invoice.customerPhone}</p>
          <p className="text-sm mb-1">
            العنوان: {invoice.customerAddress || ""}
          </p>
          <p className="text-sm">المدينة: {invoice.city || ""}</p>
        </div>

        {/* جدول المنتجات */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-right py-2 font-bold">المنتج</th>
              <th className="text-center py-2 font-bold">SKU</th>
              <th className="text-center py-2 font-bold">الكمية</th>
              <th className="text-right py-2 font-bold">السعر</th>
              <th className="text-right py-2 font-bold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.order?.orderItems?.map((item, idx) => (
              <tr key={item.id || idx} className="border-b border-gray-300">
                <td className="text-right py-2">{item.productName}</td>
                <td className="text-center py-2" dir="ltr">
                  {item.productSku || "—"}
                </td>
                <td className="text-center py-2">{item.quantity}</td>
                <td className="text-right py-2">
                  {formatCurrency(parseNumber(item.price), invoice.currency)}
                </td>
                <td className="text-right py-2">
                  {formatCurrency(getItemTotal(item), invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* المجاميع */}
        <div className="text-right mb-6 text-sm space-y-1">
          <p>
            المجموع الفرعي:{" "}
            <span className="font-bold">
              {formatCurrency(parseNumber(invoice.subtotal), invoice.currency)}
            </span>
          </p>
          {parseNumber(invoice.discount) > 0 && (
            <p>
              الخصم:{" "}
              <span className="font-bold text-red-500">
                -{" "}
                {formatCurrency(
                  parseNumber(invoice.discount),
                  invoice.currency
                )}
              </span>
            </p>
          )}
          {parseNumber(invoice.shipping) > 0 && (
            <p>
              الشحن:{" "}
              <span className="font-bold">
                {formatCurrency(
                  parseNumber(invoice.shipping),
                  invoice.currency
                )}
              </span>
            </p>
          )}
          <p className="text-base pt-2 border-t border-gray-800">
            <span className="font-bold">الإجمالي: </span>
            <span className="font-bold text-lg">
              {formatCurrency(
                parseNumber(invoice.totalAmount),
                invoice.currency
              )}
            </span>
          </p>
        </div>

        {/* حالة الدفع */}
        <div className="mb-6 text-sm space-y-1">
          <p className="text-right">
            حالة الدفع:{" "}
            <span className="font-bold">
              {getPaymentStatusText(invoice.paymentStatus)}
            </span>
          </p>
          {invoice.paymentMethod && (
            <p className="text-right">
              طريقة الدفع:{" "}
              <span className="font-bold">{invoice.paymentMethod}</span>
            </p>
          )}
        </div>

        {/* ملاحظات */}
        {invoice.notes && (
          <div className="mb-4 text-sm">
            <p className="font-bold mb-1">ملاحظات:</p>
            <p className="text-gray-700">{invoice.notes}</p>
          </div>
        )}

        {/* الباركود */}
        {(showBarcodeOrderCode || showBarcodeShippingCode) &&
          (invoice.order?.orderNumber ||
            invoice.order?.turboTrackingNumber) && (
            <div
              className="flex justify-center gap-8 mt-4 pt-3"
              style={{ borderTop: "1px solid #e2e8f0" }}
            >
              {showBarcodeOrderCode && invoice.order?.orderNumber && (
                <InvoiceBarcode
                  value={invoice.order.orderNumber}
                  label="رقم الطلب"
                />
              )}
              {showBarcodeShippingCode &&
                invoice.order?.turboTrackingNumber && (
                  <InvoiceBarcode
                    value={invoice.order.turboTrackingNumber}
                    label="كود الشحن"
                  />
                )}
            </div>
          )}

        {/* خاتم */}
        <div
          className="mt-4 pt-3 text-center"
          style={{ borderTop: "1px solid #e2e8f0" }}
        >
          <p className="text-sm text-gray-500">
            {t("orders.invoice.thankYou")}
          </p>
          {invoice.printCount > 0 && (
            <p className="text-xs mt-1 text-gray-500">
              {t("orders.invoice.printedCount", { count: invoice.printCount })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderInvoice;
