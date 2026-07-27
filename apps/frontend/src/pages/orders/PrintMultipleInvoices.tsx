import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import InvoiceContent, { getInvoicePages, type InvoiceData } from "../../components/orders/InvoiceContent";
import { useInvoiceSettings } from "../../hooks/useInvoiceSettings";
import { printClean } from "../../utils/printClean";

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

/** Represents one slot on a printed sheet */
interface PageSlot {
  invoiceData: InvoiceData;
  page: ReturnType<typeof getInvoicePages>[0];
  key: string;
}

/**
 * Print layout modes:
 *  - "single"  → one invoice per A5 page   (1 slot / sheet, no grid)
 *  - "2up"     → two invoices per A4 page   (2 slots / sheet, stacked vertically)
 *  - "grid"    → four invoices per A4 page  (2×2 grid)
 */
type PrintLayout = "single" | "2up" | "grid";

/** Smart auto-detect based on total slot count */
function autoDetectLayout(slotCount: number): PrintLayout {
  if (slotCount <= 1) return "single";
  if (slotCount === 2) return "2up";
  return "grid";
}

/** How many slots go on each sheet for a given layout */
const SLOTS_PER_SHEET: Record<PrintLayout, number> = {
  single: 1,
  "2up": 2,
  grid: 4,
};

const PrintMultipleInvoices: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { settings } = useInvoiceSettings();
  const [printLayout, setPrintLayout] = useState<PrintLayout>("grid");
  const [autoLayout, setAutoLayout] = useState(true); // tracks if user overrode auto

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

  // Auto-set layout once slots are known (only if user hasn't overridden)
  useEffect(() => {
    if (allSlots.length > 0 && !loading && autoLayout) {
      setPrintLayout(autoDetectLayout(allSlots.length));
    }
  }, [allSlots, loading, autoLayout]);

  // Increment print count for all invoices (fire once per page load)
  const printedRef = useRef(false);
  useEffect(() => {
    if (!loading && invoices.length > 0 && !printedRef.current) {
      printedRef.current = true;
      invoices.forEach((inv) => {
        apiClient.post(`/order-invoices/${inv.id}/print`).catch(() => {});
      });
    }
  }, [invoices, loading]);

  // Trigger print after layout is set and data is ready
  useEffect(() => {
    if (allSlots.length > 0 && !loading) {
      setTimeout(() => { printClean(); }, 1200);
    }
  }, [allSlots, loading]);

  // Group slots into sheets
  const sheets = useMemo(() => {
    const perSheet = SLOTS_PER_SHEET[printLayout];
    const grouped: PageSlot[][] = [];
    for (let i = 0; i < allSlots.length; i += perSheet) {
      grouped.push(allSlots.slice(i, i + perSheet));
    }
    return grouped;
  }, [allSlots, printLayout]);

  // --- CSS per layout ---
  const printCSS = (() => {
    if (printLayout === "single") {
      return `
        @page { margin: 6mm; size: A5 portrait; }
        .a4-sheet {
          width: 100%; height: auto;
          page-break-after: always; page-break-inside: avoid;
          padding: 0; margin: 0; display: block;
        }
        .a4-sheet:last-child { page-break-after: auto; }
        .a4-cell { width: 100%; height: auto; overflow: hidden; box-sizing: border-box; border: none; }
      `;
    }
    if (printLayout === "2up") {
      return `
        @page { margin: 0; size: A4 portrait; }
        .a4-sheet {
          width: 210mm; height: 297mm;
          page-break-after: always; page-break-inside: avoid;
          padding: 0; margin: 0; overflow: hidden; box-sizing: border-box;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr 1fr;
        }
        .a4-sheet:last-child { page-break-after: auto; }
        .a4-cell {
          width: 210mm; height: 148.5mm;
          overflow: hidden; box-sizing: border-box;
          page-break-inside: avoid;
          border-bottom: 1.5px dashed #94a3b8;
        }
        .a4-cell:last-child { border-bottom: none; }
      `;
    }
    // grid (4-up)
    return `
      @page { margin: 0; size: A4 portrait; }
      .a4-sheet {
        width: 210mm; height: 297mm;
        page-break-after: always; page-break-inside: avoid;
        padding: 0; margin: 0; overflow: hidden; box-sizing: border-box;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
      }
      .a4-sheet:last-child { page-break-after: auto; }
      .a4-cell {
        width: 105mm; height: 148.5mm;
        overflow: hidden; box-sizing: border-box;
        page-break-inside: avoid;
        border-right: 1px dashed #e2e8f0;
        border-bottom: 1px dashed #e2e8f0;
      }
      .a4-cell:nth-child(even) { border-right: none; }
      .a4-cell:nth-child(n+3) { border-bottom: none; }
    `;
  })();

  const screenCSS = (() => {
    if (printLayout === "single") {
      return `
        .a4-sheet {
          background: #fff; max-width: 148mm;
          margin: 0 auto 24px; border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          overflow: hidden; padding: 16px;
        }
        .a4-cell { border: none; }
      `;
    }
    if (printLayout === "2up") {
      return `
        .a4-sheet {
          background: #fff; max-width: 210mm; height: 297mm;
          margin: 0 auto 24px; border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr 1fr;
        }
        .a4-cell {
          padding: 12px 16px;
          border-bottom: 1.5px dashed #cbd5e1;
          overflow: hidden; box-sizing: border-box;
        }
        .a4-cell:last-child { border-bottom: none; }
      `;
    }
    return `
      .a4-sheet {
        background: #fff; max-width: 210mm; height: 297mm;
        margin: 0 auto 24px; border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        overflow: hidden;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
      }
      .a4-cell {
        padding: 10px 12px;
        border-right: 1px dashed #cbd5e1;
        border-bottom: 1px dashed #cbd5e1;
        overflow: hidden; box-sizing: border-box;
      }
      .a4-cell:nth-child(even) { border-right: none; }
      .a4-cell:nth-child(n+3) { border-bottom: none; }
    `;
  })();

  /** is the current layout compact (multiple per sheet)? */
  const isCompact = printLayout !== "single";

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
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');

        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff; }
          .no-print { display: none !important; }
          ${printCSS}
          .invoice-header, .invoice-totals { page-break-inside: avoid; }
          .invoice-number-text { display: none !important; }
        }
        @media screen {
          .invoice-print-wrapper {
            background: #f1f5f9;
            min-height: 100vh;
            padding: 32px 16px;
          }
          ${screenCSS}
        }
      `}</style>

      {/* ── Controls ── */}
      <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-3 bg-white p-3 rounded-xl shadow-xl border border-gray-200" dir="rtl">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-700">
            تنسيق الطباعة:
            {autoLayout && (
              <span className="ml-1 text-blue-500 text-[10px] font-normal">(تلقائي)</span>
            )}
          </label>
          <select
            value={printLayout}
            onChange={(e) => {
              setPrintLayout(e.target.value as PrintLayout);
              setAutoLayout(false); // user override
            }}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="grid">4 فواتير في A4 (توفير ورق)</option>
            <option value="2up">2 فواتير في A4 (أوسع)</option>
            <option value="single">فاتورة كاملة (A5 / حراري)</option>
          </select>
          <span className="text-[10px] text-gray-400">
            {allSlots.length} فاتورة · {sheets.length} ورقة
          </span>
        </div>
        <button
          onClick={() => printClean()}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-md mt-auto h-[38px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          طباعة ({invoices.length})
        </button>
      </div>

      {sheets.map((slots, sheetIdx) => (
        <div key={sheetIdx} className="a4-sheet">
          {slots.map((slot) => (
            <div key={slot.key} className="a4-cell">
              <InvoiceContent
                invoice={slot.invoiceData}
                settings={settings}
                compact={isCompact}
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
