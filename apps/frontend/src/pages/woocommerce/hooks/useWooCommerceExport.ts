import { useState } from "react";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
import { LocalOrder, Settings } from "../types";
import tokenManager from "../../../utils/tokenManager";

export const useWooCommerceExport = (settings: Settings | null) => {
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [selectedLocalOrders, setSelectedLocalOrders] = useState<Set<string>>(
    new Set(),
  );
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
    tokenManager.createAuthHeaders(additionalHeaders);

  const fetchLocalOrders = async () => {
    setLoading(true);
    setLocalOrders([]);
    try {
      const response = await fetch("/api/v1/woocommerce/orders/local", {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setLocalOrders(data.data.orders || []);
      }
    } catch (error) {
      tToast.error("useWooCommerceExport.error_fetch_dd37");
    } finally {
      setLoading(false);
    }
  };

  const exportSelectedOrders = async () => {
    if (selectedLocalOrders.size === 0) return;
    if (!settings?.id) {
      tToast.error("useWooCommerceExport.msg_f0f7");
      return;
    }
    setExporting(true);

    try {
      const response = await fetch("/api/v1/woocommerce/orders/export", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: settings.id,
          orderIds: Array.from(selectedLocalOrders),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const exported = data.data?.exported || 0;
        const failed = data.data?.failed || 0;

        if (failed > 0) {
          toast(
            `تم تصدير ${exported} طلب بنجاح، وفشل ${failed} طلب. راجع سجلات المزامنة للتفاصيل.`,
            {
              duration: 5000,
              icon: "⚠️",
            },
          );
        } else {
          toast.success(`تم تصدير ${exported} طلب بنجاح`);
        }

        setSelectedLocalOrders(new Set());
        fetchLocalOrders();
      } else {
        const errorDetails = data.data?.errors;
        const errorMsg = data.message || i18n.t("useWooCommerceExport.msg_d65f");

        toast.error(
          errorDetails
            ? `${errorMsg}\n${typeof errorDetails === "string" ? errorDetails : JSON.stringify(errorDetails)}`
            : errorMsg,
          { duration: 7000 },
        );
      }
    } catch (error: any) {
      toast.error(`خطأ في تصدير الطلبات: ${error.message || "خطأ غير معروف"}`);
    } finally {
      setExporting(false);
    }
  };

  return {
    localOrders,
    selectedLocalOrders,
    setSelectedLocalOrders,
    exporting,
    loading,
    fetchLocalOrders,
    exportSelectedOrders,
  };
};
