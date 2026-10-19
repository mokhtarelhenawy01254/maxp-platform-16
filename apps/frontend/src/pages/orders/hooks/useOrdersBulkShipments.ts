import { useCallback } from "react";
import type { TFunction } from "i18next";
import { apiClient } from "../../../services/apiClient";

export interface UseOrdersBulkShipmentsParams {
  selectedOrders: string[];
  setSelectedOrders: (orders: string[]) => void;
  fetchOrders: () => Promise<void>;
  setBulkProcessing: (processing: boolean) => void;
  getApiErrorMessage: (error: unknown, fallbackMessage: string) => string;
  t: TFunction;
}

export interface UseOrdersBulkShipmentsReturn {
  handleBulkCreateTurboShipments: () => Promise<void>;
  handleBulkCreateQpExpressShipments: () => Promise<void>;
  handleBulkCreateBostaShipments: () => Promise<void>;
}

export const useOrdersBulkShipments = ({
  selectedOrders,
  setSelectedOrders,
  fetchOrders,
  setBulkProcessing,
  getApiErrorMessage,
  t,
}: UseOrdersBulkShipmentsParams): UseOrdersBulkShipmentsReturn => {
  const handleBulkCreateTurboShipments = useCallback(async () => {
    if (
      !window.confirm(
        t("orders.confirmTurboShipments", {
          count: selectedOrders.length,
          defaultValue: `هل تريد إرسال ${selectedOrders.length} طلب إلى تيربو؟`,
        }),
      )
    ) {
      return;
    }

    try {
      setBulkProcessing(true);
      const response = await apiClient.post("/turbo/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data.success) {
        const { success, failed, skipped } = response.data.data;
        let message = t("orders.shipmentsCreated", { success, defaultValue: `تم إنشاء ${success} شحنة بنجاح` });
        if (failed > 0) {
          message += `\n${t("orders.shipmentsFailed", { failed, defaultValue: `فشل: ${failed}` })}`;
        }
        if (skipped > 0) {
          message += `\n${t("orders.shipmentsSkipped", { skipped, defaultValue: `تم تخطيها: ${skipped}` })}`;
        }
        alert(message);
        setSelectedOrders([]);
        await fetchOrders();
      }
    } catch (error: unknown) {
      console.error("Error bulk creating shipments:", error);
      alert(getApiErrorMessage(error, t("orders.createShipmentsFailed", { defaultValue: "فشل إنشاء الشحنات لدى تيربو" })));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrders, t, fetchOrders, setSelectedOrders, setBulkProcessing, getApiErrorMessage]);

  const handleBulkCreateQpExpressShipments = useCallback(async () => {
    if (
      !window.confirm(
        `هل تريد تأكيد إرسال ${selectedOrders.length} طلب إلى شركة كيو بي إكسبريس (QP Express) وتوليد البوالص آلياً؟`,
      )
    ) {
      return;
    }

    try {
      setBulkProcessing(true);
      const response: any = await apiClient.post("/qp-express/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const { success, failed, skipped } = response.data.data;
        let message = `تم إنشاء ${success} بوليصة شحن لدى QP Express بنجاح`;
        if (failed > 0) message += `\nفشل: ${failed}`;
        if (skipped > 0) message += `\nتم تخطيها (مشحونة مسبقاً): ${skipped}`;
        alert(message);
        setSelectedOrders([]);
        await fetchOrders();
      } else {
        alert(response.data?.error || "تعذر الشحن الجماعي لدى QP Express");
      }
    } catch (error: unknown) {
      console.error("Error bulk creating QP Express shipments:", error);
      alert(getApiErrorMessage(error, "فشل إنشاء شحنات QP Express المجمعة"));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrders, fetchOrders, setSelectedOrders, setBulkProcessing, getApiErrorMessage]);

  const handleBulkCreateBostaShipments = useCallback(async () => {
    if (
      !window.confirm(
        `هل تريد تأكيد إرسال ${selectedOrders.length} طلب إلى شركة بوستا (Bosta) وتوليد البوالص آلياً؟`,
      )
    ) {
      return;
    }

    try {
      setBulkProcessing(true);
      const response: any = await apiClient.post("/bosta/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const { success, failed, skipped } = response.data.data;
        let message = `تم إنشاء ${success} بوليصة شحن لدى بوستا بنجاح`;
        if (failed > 0) message += `\nفشل: ${failed}`;
        if (skipped > 0) message += `\nتم تخطيها (مشحونة مسبقاً): ${skipped}`;
        alert(message);
        setSelectedOrders([]);
        await fetchOrders();
      } else {
        alert(response.data?.error || "تعذر الشحن الجماعي لدى بوستا");
      }
    } catch (error: unknown) {
      console.error("Error bulk creating Bosta shipments:", error);
      alert(getApiErrorMessage(error, "فشل إنشاء شحنات بوستا المجمعة"));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrders, fetchOrders, setSelectedOrders, setBulkProcessing, getApiErrorMessage]);

  return {
    handleBulkCreateTurboShipments,
    handleBulkCreateQpExpressShipments,
    handleBulkCreateBostaShipments,
  };
};
