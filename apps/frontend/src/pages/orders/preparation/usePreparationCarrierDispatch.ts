import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { getApiErrorMessage } from "../../../utils/apiError";
import type { ActiveCarrier } from "./components/DispatchCarrierModal";
import type { PreparationOrder } from "./types";

export interface UsePreparationCarrierDispatchParams {
  selectedOrders: string[];
  activeStage: string;
  getOrderByNumber: (orderNumber: string) => PreparationOrder | null;
  fetchAll: () => Promise<void> | void;
  clearBulkControls: () => void;
}

export function usePreparationCarrierDispatch({
  selectedOrders,
  activeStage,
  getOrderByNumber,
  fetchAll,
  clearBulkControls,
}: UsePreparationCarrierDispatchParams) {
  const { t } = useTranslation();
  const [activeCarriers, setActiveCarriers] = useState<ActiveCarrier[]>([]);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [sendingToTurbo, setSendingToTurbo] = useState(false);

  const fetchActiveCarriers = useCallback(async () => {
    try {
      const res = await apiClient.get("/shipping-companies/active-carriers");
      if (res.data?.success) {
        setActiveCarriers(res.data.data || []);
      }
    } catch (e) {
      console.warn("Failed to fetch active shipping carriers:", e);
    }
  }, []);

  useEffect(() => {
    void fetchActiveCarriers();
  }, [fetchActiveCarriers]);

  const handleOpenDispatchModal = useCallback(async () => {
    if (selectedOrders.length === 0) {
      toast.error(t("preparation.page.selectOrderFirst"));
      return;
    }

    const onHoldSelected =
      selectedOrders.some((orderNumber) => {
        const o = getOrderByNumber(orderNumber);
        return o?.stage === "ON_HOLD_PREP" || o?.normalizedStatus === "ON_HOLD_PREP";
      }) || activeStage === "ON_HOLD_PREP";

    if (onHoldSelected) {
      const confirmed = window.confirm(
        "⚠️ تنبيه: لقد حددت طلبات معلقة لوجود مشكلة (ON_HOLD_PREP).\n\nهل أنت متأكد من رغبتك في إرسالها لشركة الشحن واستخراج بوالص شحن رسمية لها الآن؟",
      );
      if (!confirmed) return;
    }

    await fetchActiveCarriers();
    setShowDispatchModal(true);
  }, [activeStage, fetchActiveCarriers, getOrderByNumber, selectedOrders, t]);

  const handleDispatchToCarrier = useCallback(
    async (carrier: ActiveCarrier) => {
      if (selectedOrders.length === 0) {
        toast.error(t("preparation.page.selectOrderFirst"));
        return;
      }

      try {
        setSendingToTurbo(true);
        let response: {
          data?: {
            success?: boolean;
            data?: {
              success?: number;
              failed?: number;
              results?: {
                failed?: Array<{ orderNumber: string; error?: string; reason?: string }>;
                skipped?: Array<{ orderNumber: string; reason?: string }>;
              };
            };
            error?: string;
          };
        };

        if (carrier.providerKey === "QP_EXPRESS") {
          response = await apiClient.post("/qp-express/bulk/create-shipments", {
            orderIds: selectedOrders,
          });
        } else if (carrier.providerKey === "BOSTA") {
          response = await apiClient.post("/bosta/bulk/create-shipments", {
            orderIds: selectedOrders,
          });
        } else if (carrier.providerKey === "TURBO") {
          response = await apiClient.post("/turbo/bulk/create-shipments", {
            orderIds: selectedOrders,
          });
        } else {
          let successCount = 0;
          for (const orderId of selectedOrders) {
            try {
              await apiClient.post("/shipments/create", {
                orderId,
                shippingCompanyId: carrier.id,
              });
              successCount++;
            } catch (err) {
              console.warn(`Failed to create shipment for order ${orderId}:`, err);
            }
          }
          response = {
            data: {
              success: true,
              data: { success: successCount, failed: selectedOrders.length - successCount },
            },
          };
        }

        if (response.data?.success) {
          const data = response.data.data || {};
          const successCount = data.success ?? selectedOrders.length;
          const failedCount = data.failed ?? 0;
          const failedList = data.results?.failed || [];

          toast.success(
            `تم بنجاح إرسال ${successCount} طلب إلى ${carrier.name}` +
              (failedCount > 0 ? ` (فشل ${failedCount})` : ""),
          );

          if (failedList.length > 0) {
            const preview = failedList
              .slice(0, 5)
              .map((item) => `• طلب #${item.orderNumber}: ${item.error || item.reason || "تعذر الإنشاء"}`)
              .join("\n");
            const remainder = failedList.length > 5 ? `\n... و ${failedList.length - 5} طلبات أخرى` : "";
            toast.error(
              `تعذر إرسال ${failedList.length} طلب إلى ${carrier.name}:\n${preview}${remainder}`,
              { duration: 10000 },
            );
          }

          setShowDispatchModal(false);
          clearBulkControls();
          void fetchAll();
        } else {
          toast.error(response.data?.error || `فشل إرسال الشحنات إلى ${carrier.name}`);
        }
      } catch (error: unknown) {
        console.error("Failed to dispatch shipments:", error);
        toast.error(getApiErrorMessage(error) || `فشل إرسال الشحنات إلى ${carrier.name}`);
      } finally {
        setSendingToTurbo(false);
      }
    },
    [clearBulkControls, fetchAll, selectedOrders, t],
  );

  return {
    activeCarriers,
    showDispatchModal,
    setShowDispatchModal,
    sendingToTurbo,
    handleOpenDispatchModal,
    handleDispatchToCarrier,
  };
}
