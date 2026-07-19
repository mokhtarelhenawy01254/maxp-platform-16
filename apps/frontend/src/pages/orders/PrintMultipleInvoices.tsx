import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import InvoiceContent, { getInvoicePages, type InvoiceData } from "../../components/orders/InvoiceContent";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";

interface Invoice {
  id: string;
  invoiceNumber: string;
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
  order: {
    orderNumber: string;
    turboTrackingNumber?: string | null;
    orderItems: Array<{
      productName: string;
      productSku?: string | null;
      productColor?: string | null;
      productSize?: string | null;
      quantity: number;
      price: number;
      total: number;
    }>;
  };
}

/** Convert API Invoice to InvoiceData shape */
function toInvoiceData(inv: Invoice): InvoiceData {
  return {
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
      orderNumber: inv.order.orderNumber,
      turboTrackingNumber: inv.order.turboTrackingNumber,
      orderItems: inv.order.orderItems?.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        productSku: item.productSku,
        productColor: item.productColor,
        productSize: item.productSize,
      })),
    },
  };
}

/** Represents one half-page slot on an A4 sheet */
interface PageSlot {
  invoiceData: InvoiceData;
  page: ReturnType<typeof getInvoicePages>[0];
  key: string;
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
      const fetched: Invoice[] = [];
      for (const id of invoiceIds) {
        try {
          const response = await apiClient.get(`/order-invoices/${id}`);
          if (response.data.success) fetched.push(response.data.data);
        } catch (err) {
          console.error(`Error fetching invoice ${id}:`, err);
        }
      }
      setInvoices(fetched);
      setLoading(false);
    } catch (err: unknown) {
      console.error("Error fetching invoices:", err);
      setError("خطأ في جلب الفواتير");
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { void fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    if (invoices.length > 0 && !loading) {
      setTimeout(() => { window.print(); }, 1000);
    }
  }, [invoices, loading]);

  // Expand every invoice into its page chunks, collect all slots
  const allSlots: PageSlot[] = useMemo(() => {
    const slots: PageSlot[] = [];
    invoices.forEach((inv) => {
      const data = toInvoiceData(inv);
      const pages = getInvoicePages(data);
      pages.forEach((page) => {
        slots.push({ invoiceData: data, page, key: `${inv.id}-p${page.pageIndex}` });
      });
    });
    return slots;
  }, [invoices]);

  // Pair slots into A4 sheets (2 per sheet)
  const a4Sheets: PageSlot[][] = [];
  for (let i = 0; i < allSlots.length; i += 2) {
    a4Sheets.push(allSlots.slice(i, i + 2));
  }

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
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="invoice-print-wrapper">
      <style>{`
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff; }
          .a4-sheet {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            page-break-inside: avoid;
            padding: 0;
            margin: 0;
            overflow: hidden;
            box-sizing: border-box;
          }
          .a4-sheet:last-child { page-break-after: auto; }
          .a4-half {
            width: 100%;
            height: 148.5mm;
            overflow: hidden;
            box-sizing: border-box;
            page-break-inside: avoid;
          }
          .invoice-header, .invoice-totals { page-break-inside: avoid; }
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
          .a4-half {
            border-bottom: 1px dashed #cbd5e1;
            min-height: 148mm;
          }
          .a4-half:last-child { border-bottom: none; }
        }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          طباعة جميع الفواتير ({invoices.length})
        </button>
      </div>

      {a4Sheets.map((slots, sheetIdx) => (
        <div key={sheetIdx} className="a4-sheet">
          {slots.map((slot) => (
            <div key={slot.key} className="a4-half">
              <InvoiceContent
                invoice={slot.invoiceData}
                settings={settings}
                compact
                page={slot.page}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default PrintMultipleInvoices;
