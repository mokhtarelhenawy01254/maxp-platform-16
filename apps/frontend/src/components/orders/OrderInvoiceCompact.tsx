import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import InvoiceContent from "./InvoiceContent";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
import { printClean } from "../../utils/printClean";

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
  companyName: string;
  companyPhone: string | null;
  companyLogo: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  notes: string | null;
  order: {
    orderNumber: string;
    total?: number;
    subtotal?: number;
    shipping?: number;
    discount?: number;
    tax?: number;
    turboTrackingNumber?: string | null;
    orderItems: Array<{
      productName: string;
      quantity: number;
      price: number;
      total: number;
      productSku?: string | null;
    }>;
  };
}

const OrderInvoiceCompact: React.FC = () => {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { settings } = useInvoiceSettings();

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  useEffect(() => {
    const shouldPrint = searchParams.get("print") === "true";
    if (shouldPrint && invoice && !loading) {
      setTimeout(() => printClean(), 800);
    }
  }, [invoice, loading, searchParams]);

  const fetchInvoice = async () => {
    try {
      const response = await apiClient.get(`/order-invoices/${invoiceId}`);
      setInvoice(response.data.data);
      setLoading(false);
    } catch {
      setError("خطأ في جلب الفاتورة");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || "الفاتورة غير موجودة"}</p>
      </div>
    );
  }

  return (
    <div className="invoice-wrapper">
      <style>{`
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

      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => printClean()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          طباعة الفاتورة
        </button>
      </div>

      <div className="invoice-page p-3 print:p-2">
        <InvoiceContent invoice={invoice} settings={settings} compact />
      </div>
    </div>
  );
};

export default OrderInvoiceCompact;
