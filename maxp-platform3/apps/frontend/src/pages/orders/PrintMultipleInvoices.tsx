import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import InvoiceContent from "../../components/orders/InvoiceContent";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";

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
      productSku?: string | null;
      productColor?: string | null;
      productSize?: string | null;
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
  const { settings } = useInvoiceSettings();

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

  // Group invoices into pairs (2 per A4 sheet)
  const pairs: Invoice[][] = [];
  for (let i = 0; i < invoices.length; i += 2) {
    pairs.push(invoices.slice(i, i + 2));
  }

  return (
    <div className="invoice-print-wrapper">
      <style>{`
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff; }
          .a4-sheet { page-break-after: always; width: 100%; }
          .a4-sheet:last-child { page-break-after: auto; }
          .invoice-half { height: 50%; overflow: hidden; padding: 3mm 5mm; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A4; }
        }
        @media screen {
          .invoice-print-wrapper {
            background: #f1f5f9;
            min-height: 100vh;
            padding: 32px 16px;
          }
          .a4-sheet {
            background: #fff;
            max-width: 210mm;
            margin: 0 auto 24px;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            overflow: hidden;
          }
          .invoice-half {
            padding: 10px 14px;
            border-bottom: 1px dashed #cbd5e1;
          }
          .invoice-half:last-child { border-bottom: none; }
        }
      `}</style>

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

      {pairs.map((pair, pageIdx) => (
        <div key={pageIdx} className="a4-sheet">
          {pair.map((inv) => (
            <div key={inv.id} className="invoice-half">
              <InvoiceContent
                invoice={{
                  id: inv.id,
                  invoiceNumber: inv.invoiceNumber,
                  companyName: inv.companyName,
                  companyPhone: inv.companyPhone,
                  companyLogo: inv.companyLogo,
                  customerName: inv.customerName,
                  customerPhone: inv.customerPhone,
                  customerEmail: inv.customerEmail,
                  customerAddress: inv.customerAddress,
                  city: inv.city,
                  paymentMethod: inv.paymentMethod,
                  paymentStatus: inv.paymentStatus,
                  currency: inv.currency,
                  subtotal: inv.subtotal,
                  tax: inv.tax,
                  shipping: inv.shipping,
                  discount: inv.discount,
                  totalAmount: inv.totalAmount,
                  order: {
                    orderNumber: inv.order?.orderNumber,
                    turboTrackingNumber: inv.order?.turboTrackingNumber,
                    orderItems: inv.order?.orderItems?.map((item) => ({
                      productName: item.productName,
                      quantity: item.quantity,
                      price: item.price,
                      total: item.total,
                      productSku: item.productSku ?? item.product?.sku ?? null,
                      productColor: item.productColor ?? null,
                      productSize: item.productSize ?? null,
                    })),
                  },
                }}
                settings={settings}
                compact
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default PrintMultipleInvoices;
