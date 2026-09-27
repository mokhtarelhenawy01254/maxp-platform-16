import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ArrowLeft, Download, Mail, Printer } from "lucide-react";
import InvoiceContent from "./InvoiceContent";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
import { printClean } from "../../utils/printClean";

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
    total?: number | string;
    subtotal?: number | string;
    shipping?: number | string;
    discount?: number | string;
    tax?: number | string;
    turboTrackingNumber?: string | null;
    orderItems?: Array<{
      id?: string;
      productName: string;
      quantity: number;
      price: number | string;
      total?: number | string;
      totalPrice?: number | string;
      productSku?: string | null;
      productColor?: string | null;
      productSize?: string | null;
    }>;
  };
}

interface ApiErrorShape {
  response?: { data?: { message?: string } };
  message?: string;
}

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

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const { settings } = useInvoiceSettings();
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
  }, [finalInvoiceId, finalOrderId, t]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldPrint = urlParams.get("print") === "true";
    if (shouldPrint && invoice && !loading) {
      setTimeout(() => {
        printClean();
      }, 1200);
    }
  }, [invoice, loading]);

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      setPrinting(true);
      await apiClient.post(`/order-invoices/${invoice.id}/print`);
      printClean();
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

  return (
    <div className="invoice-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff; }
          .invoice-page { padding: 0 !important; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A5; }
          .invoice-number-text { display: none !important; }
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
      `}</style>

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

      <div className="invoice-page p-3 print:p-2">
        <InvoiceContent invoice={invoice} settings={settings} />
      </div>
    </div>
  );
};

export default OrderInvoice;
