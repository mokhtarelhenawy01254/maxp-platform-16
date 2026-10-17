import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/apiClient";
import { getInvoicePages, type InvoiceData } from "../../../components/orders/InvoiceContent";
import { useInvoiceSettings } from "../../../hooks/useInvoiceSettings";
import { printClean } from "../../../utils/printClean";
import {
  GuestPrintPayload,
} from "./guestPrintPayload";
import {
  ApiInvoice,
  toInvoiceData,
  guestOrderToInvoiceData,
} from "./invoiceDataAdapters";
import {
  PrintLayout,
  PageSlot,
  autoDetectLayout,
  SLOTS_PER_SHEET,
} from "./printLayoutConfig";

export function usePrintMultipleInvoicesData() {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [guestSlots, setGuestSlots] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { settings, loading: settingsLoading } = useInvoiceSettings();
  const [printLayout, setPrintLayout] = useState<PrintLayout>("grid");
  const [autoLayout, setAutoLayout] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      const ids = searchParams.get("ids");
      const guestKey = searchParams.get("guestKey");

      // حمّل طلبات الضيف من sessionStorage لو موجودة
      let guests: InvoiceData[] = [];
      if (guestKey) {
        try {
          const raw = sessionStorage.getItem(guestKey);
          if (raw) {
            const payload = JSON.parse(raw) as GuestPrintPayload;
            guests = (payload.orders || []).map((g) =>
              guestOrderToInvoiceData(g, payload.company || { companyName: "" })
            );
          }
        } catch (e) {
          console.error("Failed reading guest print payload:", e);
        }
        setGuestSlots(guests);
      }

      // الفواتير العادية من DB (تحميل موازي عبر دفعات لتجنب البطء والشلال المتسلسل)
      const fetched: ApiInvoice[] = [];
      if (ids) {
        const invoiceIds = ids.split(",").map((s) => s.trim()).filter(Boolean);
        const chunkSize = 8;
        for (let i = 0; i < invoiceIds.length; i += chunkSize) {
          const chunk = invoiceIds.slice(i, i + chunkSize);
          const chunkResponses = await Promise.all(
            chunk.map((id) =>
              apiClient.get(`/order-invoices/${id}`).catch((err) => {
                console.error(`Error fetching invoice ${id}:`, err);
                return null;
              })
            )
          );
          for (const res of chunkResponses) {
            if (res?.data?.success && res.data.data) {
              fetched.push(res.data.data);
            }
          }
        }
      }
      setInvoices(fetched);

      // لو مفيش فواتير ولا طلبات ضيف → خطأ
      if (fetched.length === 0 && guests.length === 0) {
        setError("لم يتم تحديد فواتير");
      }
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
    guestSlots.forEach((data, idx) => {
      const pages = getInvoicePages(data);
      pages.forEach((page) => {
        slots.push({ invoiceData: data, page, key: `guest-${idx}-p${page.pageIndex}` });
      });
    });
    return slots;
  }, [invoices, guestSlots]);

  // Auto-set layout once slots are known (only if user hasn't overridden)
  useEffect(() => {
    if (allSlots.length > 0 && !loading && !settingsLoading && autoLayout) {
      setPrintLayout(autoDetectLayout(allSlots.length));
    }
  }, [allSlots, loading, settingsLoading, autoLayout]);

  // Increment print count for DB invoices only
  const printedRef = useRef(false);
  useEffect(() => {
    if (!loading && !settingsLoading && invoices.length > 0 && !printedRef.current) {
      printedRef.current = true;
      invoices.forEach((inv) => {
        apiClient.post(`/order-invoices/${inv.id}/print`).catch(() => {});
      });
    }
  }, [invoices, loading, settingsLoading]);

  // Trigger print after layout is set and data is ready
  useEffect(() => {
    if (allSlots.length > 0 && !loading && !settingsLoading) {
      const timer = setTimeout(() => {
        printClean();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [allSlots, loading, settingsLoading]);

  // Group slots into sheets
  const sheets = useMemo(() => {
    const perSheet = SLOTS_PER_SHEET[printLayout];
    const grouped: PageSlot[][] = [];
    for (let i = 0; i < allSlots.length; i += perSheet) {
      grouped.push(allSlots.slice(i, i + perSheet));
    }
    return grouped;
  }, [allSlots, printLayout]);

  const handleLayoutChange = (layout: PrintLayout) => {
    setPrintLayout(layout);
    setAutoLayout(false);
  };

  return {
    invoices,
    guestSlots,
    loading,
    error,
    settings,
    settingsLoading,
    printLayout,
    autoLayout,
    allSlots,
    sheets,
    handleLayoutChange,
    triggerPrint: () => printClean(),
  };
}
