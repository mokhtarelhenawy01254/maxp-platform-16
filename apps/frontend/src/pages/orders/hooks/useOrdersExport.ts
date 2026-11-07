import { useCallback, useRef, useState } from "react";
import { transformOrder } from "../utils/orderTransformer";
import type { Order } from "../utils/orderTransformer";
import type { OrdersFilters } from "../ordersFilterTypes";
import {
  ORDERS_EXPORT_MAX_ROWS,
  ORDERS_EXPORT_PAGE_SIZE,
  buildEnhancedOrdersQueryParams,
  buildOrdersExportRows,
  buildOrdersQueryParams,
  ordersExportFileName,
  usesEnhancedOrdersApi,
} from "../utils/ordersExport";

interface UseOrdersExportOptions {
  filters: OrdersFilters;
}

interface UseOrdersExportReturn {
  exporting: boolean;
  exportedCount: number;
  exportError: string | null;
  exportOrders: () => Promise<void>;
}

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybe = error as { message?: unknown; response?: { data?: { message?: unknown } } };
    const apiMessage = maybe.response?.data?.message;
    if (typeof apiMessage === "string" && apiMessage.trim()) return apiMessage;
    if (typeof maybe.message === "string" && maybe.message.trim()) return maybe.message;
  }
  return "تعذّر تصدير الطلبات";
};

/**
 * يسحب كل الطلبات المطابقة للفلاتر الحالية (بنفس باراميترات الشاشة) ثم يكتبها .xlsx.
 * لا يعتمد على الصفحة المعروضة فقط — التصدير يشمل كل النتائج المطابقة حتى السقف.
 */
export function useOrdersExport({ filters }: UseOrdersExportOptions): UseOrdersExportReturn {
  const [exporting, setExporting] = useState(false);
  const [exportedCount, setExportedCount] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportingRef = useRef(false);

  const exportOrders = useCallback(async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setExportError(null);
    setExportedCount(0);

    try {
      const { apiClient } = await import("../../../services/apiClient");
      const enhanced = usesEnhancedOrdersApi(filters);
      const collected: Order[] = [];
      const seenIds = new Set<string>();
      let page = 1;
      let hasMore = true;
      let totalMatching = 0;

      while (hasMore && collected.length < ORDERS_EXPORT_MAX_ROWS) {
        const params = enhanced
          ? buildEnhancedOrdersQueryParams(filters, page, ORDERS_EXPORT_PAGE_SIZE)
          : buildOrdersQueryParams(filters, page, ORDERS_EXPORT_PAGE_SIZE);

        const response = await apiClient.get(enhanced ? "/orders-enhanced" : "/orders-new/simple", {
          params,
          _skipErrorToast: true,
        });

        const data = response.data as {
          success?: boolean;
          message?: string;
          data?: unknown[];
          pagination?: { pages?: number; total?: number };
        };

        if (!data?.success) {
          throw new Error(data?.message || "فشل تحميل الطلبات للتصدير");
        }

        const batch = (Array.isArray(data.data) ? data.data : []).map(transformOrder);
        batch.forEach((order) => {
          const key = String(order.id || order.orderNumber || "");
          if (key) {
            if (seenIds.has(key)) return;
            seenIds.add(key);
          }
          collected.push(order);
        });

        totalMatching = Number(data.pagination?.total) || collected.length;
        const pages = Number(data.pagination?.pages) || 0;
        if (pages > 0) {
          hasMore = page < pages;
        } else {
          hasMore = batch.length >= ORDERS_EXPORT_PAGE_SIZE;
        }
        if (batch.length === 0) hasMore = false;
        page += 1;
      }

      const rows = collected.slice(0, ORDERS_EXPORT_MAX_ROWS);
      if (rows.length === 0) {
        setExportError("لا توجد طلبات مطابقة للفلاتر الحالية");
        return;
      }

      // xlsx يُحمّل عند الطلب فقط حتى لا يكبر بندل صفحة الطلبات
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(buildOrdersExportRows(rows));
      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 24 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 22 },
        { wch: 16 },
        { wch: 11 },
        { wch: 18 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "الطلبات");
      XLSX.writeFile(workbook, ordersExportFileName(), { compression: true });

      setExportedCount(rows.length);
      if (rows.length < totalMatching) {
        setExportError(`تم تصدير أول ${rows.length} من ${totalMatching} طلب (سقف التصدير)`);
      }
    } catch (error) {
      setExportError(getErrorMessage(error));
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }, [filters]);

  return { exporting, exportedCount, exportError, exportOrders };
}

export default useOrdersExport;
