import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  Mail,
  Printer,
} from "lucide-react";
import InvoiceBarcode from "./InvoiceBarcode";

interface OrderInvoiceProps {
  orderId?: string;
  invoiceId?: string;
}

interface InvoiceSettings {
  showCompanyLogo: boolean;
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  showOrderItems: boolean;
  pdfPageSize: string;
  pdfOrientation: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
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
  companyEmail?: string | null;
  companyAddress?: string | null;
  companyLogo?: string | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  notes?: string | null;
  terms?: string | null;
  printCount: number;
  order?: {
    orderNumber?: string;
    status?: string;
    turboTrackingNumber?: string | null;
    turboShipmentId?: string | null;
    orderItems?: InvoiceOrderItem[];
    createdByName?: string | null;
  };
}

interface ApiErrorShape {
  response?: {
    data?: { message?: string };
  };
  message?: string;
}

const defaultSettings: InvoiceSettings = {
  showCompanyLogo: true,
  showTaxBreakdown: true,
  showPaymentMethod: true,
  showOrderItems: true,
  pdfPageSize: "A4",
  pdfOrientation: "portrait",
  primaryColor: "#4F46E5",
  secondaryColor: "#6B7280",
  fontFamily: "Arial",
};

const pageWidths: Record<string, { portrait: string; landscape: string }> = {
  A4: { portrait: "210mm", landscape: "297mm" },
  A5: { portrait: "148mm", landscape: "210mm" },
  LETTER: { portrait: "216mm", landscape: "279mm" },
  Letter: { portrait: "216mm", landscape: "279mm" },
  Legal: { portrait: "216mm", landscape: "356mm" },
};

const parseNumber = (value: number | string | null | undefined) =>
  Number(value || 0);

const getErrorMessage = (error: unknown, fallback: string) => {
  const typedError = error as ApiErrorShape;
  return typedError.response?.data?.message || typedError.message || fallback;
};

const OrderInvoice: React.FC<OrderInvoiceProps> = ({ orderId, invoiceId }) => {
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
      setTimeout(() => { window.print(); }, 1200);
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
      year: "numeric", month: "long", day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string = "EGP") => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency", currency,
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string): "default" | "success" | "warning" | "destructive" | "secondary" => {
    const colors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
      PAID: "success",
      COMPLETED: "success",
      PENDING: "warning",
      CANCELLED: "destructive",
      REFUNDED: "secondary",
      PARTIALLY_PAID: "warning",
    };
    return colors[status] || "default";
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PAID: t("orders.invoice.statusPaid"),
      COMPLETED: t("orders.invoice.statusPaid"),
      PENDING: t("orders.invoice.statusPending"),
      CANCELLED: t("orders.invoice.statusCancelled"),
      REFUNDED: t("orders.invoice.statusRefunded"),
      PARTIALLY_PAID: t("orders.invoice.statusPartiallyPaid"),
    };
    return labels[status] || status;
  };

  const getItemTotal = (item: InvoiceOrderItem) => {
    const explicitTotal = item.total ?? item.totalPrice;
    if (explicitTotal !== undefined && explicitTotal !== null) {
      return parseNumber(explicitTotal);
    }
    return parseNumber(item.price) * parseNumber(item.quantity);
  };

  const normalizedPageSize = settings.pdfPageSize || "A4";
  const normalizedOrientation = settings.pdfOrientation === "landscape" ? "landscape" : "portrait";
  const maxWidth = pageWidths[normalizedPageSize]?.[normalizedOrientation] || pageWidths["A4"]![normalizedOrientation];
  const primaryColor = settings.primaryColor || defaultSettings.primaryColor;
  const secondaryColor = settings.secondaryColor || defaultSettings.secondaryColor;
  const showCompanyLogo = settings.showCompanyLogo !== false;
  const showTaxBreakdown = settings.showTaxBreakdown !== false;
  const showPaymentMethod = settings.showPaymentMethod !== false;
  const showOrderItems = settings.showOrderItems !== false;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-2">
          <ArrowLeft className="size-4" /> {t("orders.invoice.back")}
        </Button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-3">
        <Alert>
          <AlertDescription>{t("orders.invoice.notFound")}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-2">
          <ArrowLeft className="size-4" /> {t("orders.invoice.back")}
        </Button>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen px-2 md:px-3 py-3"
      style={{ backgroundColor: "#f8fafc", fontFamily: settings.fontFamily || defaultSettings.fontFamily }}
    >
      <div className="mb-3 flex gap-2 flex-wrap no-print">
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

      <div
        ref={printRef}
        className="rounded-xl bg-card text-card-foreground p-2.5 md:p-4 mx-auto"
        style={{
          maxWidth,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
          fontFamily: settings.fontFamily || defaultSettings.fontFamily,
        }}
      >
        <div
          className="flex justify-between gap-3 flex-wrap items-start pb-3"
          style={{ borderBottom: `3px solid ${primaryColor}` }}
        >
          <div className="min-w-[220px]">
            {showCompanyLogo && invoice.companyLogo && (
              <img
                src={invoice.companyLogo}
                alt={invoice.companyName}
                className="max-h-[84px] mb-2"
              />
            )}
            <h2 className="text-xl font-bold" style={{ color: primaryColor }}>
              {invoice.companyName}
            </h2>
            {invoice.companyAddress && (
              <p className="mt-1 text-sm" style={{ color: secondaryColor }}>
                {invoice.companyAddress}
              </p>
            )}
            {invoice.companyPhone && (
              <p className="text-sm" style={{ color: secondaryColor }}>
                {t("orders.invoice.phone")} {invoice.companyPhone}
              </p>
            )}
            {invoice.companyEmail && (
              <p className="text-sm" style={{ color: secondaryColor }}>
                {t("orders.invoice.emailLabel")} {invoice.companyEmail}
              </p>
            )}
          </div>

          <div className="min-w-[220px] text-right">
            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
              {t("orders.invoice.title")}
            </h1>
            <h3 className="text-lg mt-1">{invoice.invoiceNumber}</h3>
            <div className="mt-2 grid gap-1">
              <p className="text-sm">
                <strong>{t("orders.invoice.issueDate")}</strong> {formatDate(invoice.issueDate)}
              </p>
              {invoice.dueDate && (
                <p className="text-sm">
                  <strong>{t("orders.invoice.dueDate")}</strong> {formatDate(invoice.dueDate)}
                </p>
              )}
              <div className="mt-0.5">
                <Badge variant={getPaymentStatusColor(invoice.paymentStatus)}>
                  {getPaymentStatusLabel(invoice.paymentStatus)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-3">
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: secondaryColor }}>
              {t("orders.invoice.billedTo")}
            </p>
            <p className="text-sm font-bold">{invoice.customerName}</p>
            {invoice.customerPhone && (
              <p className="text-sm">{t("orders.invoice.phone")} {invoice.customerPhone}</p>
            )}
            {invoice.customerEmail && (
              <p className="text-sm">{t("orders.invoice.emailLabel")} {invoice.customerEmail}</p>
            )}
            {invoice.customerAddress && (
              <p className="text-sm">{t("orders.invoice.address")} {invoice.customerAddress}</p>
            )}
            {invoice.city && (
              <p className="text-sm">{t("orders.invoice.city")} {invoice.city}</p>
            )}
            {invoice.governorate && (
              <p className="text-sm">{t("orders.invoice.governorate")} {invoice.governorate}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold mb-1" style={{ color: secondaryColor }}>
              {t("orders.invoice.orderInfo")}
            </p>
            <p className="text-sm">
              <strong>{t("orders.invoice.orderNumber")}</strong> {invoice.order?.orderNumber || "-"}
            </p>
            {invoice.order?.createdByName && (
              <p className="text-sm">
                <strong>الكوتشي:</strong> {invoice.order.createdByName}
              </p>
            )}
            {invoice.order?.turboTrackingNumber && (
              <p className="text-sm">
                <strong>رقم تتبع تربو:</strong> {invoice.order.turboTrackingNumber}
              </p>
            )}
            <p className="text-sm">
              <strong>{t("orders.invoice.orderStatus")}</strong> {invoice.order?.status || "-"}
            </p>
            {showPaymentMethod && invoice.paymentMethod && (
              <p className="text-sm">
                <strong>{t("orders.invoice.paymentMethod")}</strong> {invoice.paymentMethod}
              </p>
            )}
          </div>
        </div>

        {showOrderItems && (
          <div className="mb-3">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: `${primaryColor}15` }}>
                  <TableHead className="font-bold">#</TableHead>
                  <TableHead className="font-bold">{t("orders.invoice.product")}</TableHead>
                  <TableHead className="text-center font-bold">{t("orders.invoice.quantity")}</TableHead>
                  <TableHead className="text-right font-bold">{t("orders.invoice.price")}</TableHead>
                  <TableHead className="text-right font-bold">{t("orders.invoice.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.order?.orderItems?.map((item, index: number) => (
                  <TableRow key={item.id || `${item.productName}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{item.productName}</p>
                      {item.productSku && (
                        <p className="text-xs" style={{ color: secondaryColor }}>
                          SQ: {item.productSku}
                        </p>
                      )}
                      {(item.variantName || item.productColor || item.productSize) && (
                        <p className="text-xs" style={{ color: secondaryColor }}>
                          {[item.variantName, item.productColor, item.productSize]
                            .filter(Boolean).join(" / ")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(parseNumber(item.price), invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(getItemTotal(item), invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-end">
          <div className="w-full md:w-1/2 p-2.5 rounded-lg" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="flex justify-between mb-1">
              <span className="text-sm">{t("orders.invoice.subtotal")}</span>
              <span className="text-sm font-medium">
                {formatCurrency(parseNumber(invoice.subtotal), invoice.currency)}
              </span>
            </div>
            {parseNumber(invoice.discount) > 0 && (
              <div className="flex justify-between mb-1">
                <span className="text-sm">{t("orders.invoice.discount")}</span>
                <span className="text-sm font-medium text-red-500">
                  - {formatCurrency(parseNumber(invoice.discount), invoice.currency)}
                </span>
              </div>
            )}
            {showTaxBreakdown && parseNumber(invoice.tax) > 0 && (
              <div className="flex justify-between mb-1">
                <span className="text-sm">{t("orders.invoice.tax", { rate: invoice.taxRate || 0 })}</span>
                <span className="text-sm font-medium">
                  {formatCurrency(parseNumber(invoice.tax), invoice.currency)}
                </span>
              </div>
            )}
            {parseNumber(invoice.shipping) > 0 && (
              <div className="flex justify-between mb-1">
                <span className="text-sm">{t("orders.invoice.shipping")}</span>
                <span className="text-sm font-medium">
                  {formatCurrency(parseNumber(invoice.shipping), invoice.currency)}
                </span>
              </div>
            )}
            <Separator className="my-1.5" />
            <div className="flex justify-between">
              <h3 className="text-base font-bold">{t("orders.invoice.grandTotal")}</h3>
              <h3 className="text-base font-bold" style={{ color: primaryColor }}>
                {formatCurrency(parseNumber(invoice.totalAmount), invoice.currency)}
              </h3>
            </div>
          </div>
        </div>

        {(invoice.notes || invoice.terms) && (
          <div className="mt-4">
            {invoice.notes && (
              <div className="mb-2">
                <p className="text-xs font-bold mb-1">{t("orders.invoice.notes")}</p>
                <p className="text-sm" style={{ color: secondaryColor }}>
                  {invoice.notes}
                </p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs font-bold mb-1">{t("orders.invoice.terms")}</p>
                <p className="text-sm" style={{ color: secondaryColor }}>
                  {invoice.terms}
                </p>
              </div>
            )}
          </div>
        )}

        {(invoice.order?.orderNumber || invoice.order?.turboTrackingNumber) && (
          <div
            className="mt-4 pt-3 flex justify-center gap-8 flex-wrap"
            style={{ borderTop: "1px solid #e2e8f0" }}
          >
            {invoice.order?.orderNumber && (
              <InvoiceBarcode
                value={invoice.order.orderNumber}
                label="رقم الطلب"
              />
            )}
            {invoice.order?.turboTrackingNumber && (
              <InvoiceBarcode
                value={invoice.order.turboTrackingNumber}
                label="كود الشحن"
              />
            )}
          </div>
        )}

        <div className="mt-4 pt-3 text-center" style={{ borderTop: "1px solid #e2e8f0" }}>
          <p className="text-sm" style={{ color: secondaryColor }}>
            {t("orders.invoice.thankYou")}
          </p>
          {invoice.printCount > 0 && (
            <p className="text-xs mt-1" style={{ color: secondaryColor }}>
              {t("orders.invoice.printedCount", { count: invoice.printCount })}
            </p>
          )}
        </div>
      </div>

      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; background: #ffffff !important; }
            @page { size: ${normalizedPageSize} ${normalizedOrientation}; margin: 1cm; }
          }
        `}
      </style>
    </div>
  );
};

export default OrderInvoice;
