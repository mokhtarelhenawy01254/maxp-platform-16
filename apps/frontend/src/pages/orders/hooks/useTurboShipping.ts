import { useState, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import { toast } from "sonner";
import { tToast } from "../../../utils/i18n-toast";
import i18n from "../../../i18n";
import {
  useTurboRealtime,
  type TurboTrackingData,
  type ShippingComparison,
} from "./useTurboRealtime";
import { useTurboWaybill } from "./useTurboWaybill";

export type { TurboTrackingData, ShippingComparison };

export const useTurboShipping = (
  order: any,
  setOrder: (order: any) => void,
) => {
  const { user } = useAuth();

  const [turboLoading, setTurboLoading] = useState(false);
  const [turboTrackingData, setTurboTrackingData] = useState<TurboTrackingData | null>(null);
  const [shippingComparison, setShippingComparison] = useState<ShippingComparison | null>(null);

  // Real-time socket & shipping comparison synchronization
  useTurboRealtime({
    order,
    setOrder,
    user,
    setTurboTrackingData,
    setShippingComparison,
  });

  // Waybill fetching & printing
  const { getWaybill } = useTurboWaybill({
    order,
    setTurboLoading,
  });

  // Actions

  const createShipment = useCallback(async (options?: { replaceExisting?: boolean }) => {
    if (!order?.id) return;
    setTurboLoading(true);
    try {
      const response = await apiClient.post(
        `/turbo/orders/${order.id}/shipment`,
        options?.replaceExisting ? { replaceExisting: true } : undefined,
      );

      if (response.data.success) {
        setOrder((prev: any) =>
          prev
            ? {
                ...prev,
                turboShipmentId: response.data.data.shipmentId,
                turboTrackingNumber: response.data.data.trackingNumber,
                turboShipmentStatus: response.data.data.status,
                turboLabelUrl: response.data.data.labelUrl,
              }
            : null,
        );
        toast.success(
          options?.replaceExisting
            ? i18n.t("turbo.shipmentRecreated", { trackingNumber: response.data.data.trackingNumber })
            : i18n.t("turbo.shipmentCreated", { trackingNumber: response.data.data.trackingNumber }),
        );
        return {
          success: true,
          trackingNumber: response.data.data.trackingNumber,
        };
      }
      return { success: false };
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          (options?.replaceExisting
            ? i18n.t("turbo.recreateFailed")
            : i18n.t("turbo.createFailed")),
      );
      return { success: false, error: error.message };
    } finally {
      setTurboLoading(false);
    }
  }, [order?.id, setOrder]);

  const cancelShipment = useCallback(async () => {
    if (!order?.id || (!order?.turboShipmentId && !order?.turboTrackingNumber)) {
      return false;
    }

    setTurboLoading(true);
    try {
      const response = await apiClient.post(`/turbo/orders/${order.id}/cancel`);
      if (response.data.success) {
        setOrder((prev: any) =>
          prev
            ? {
                ...prev,
                turboShipmentStatus: "cancelled",
              }
            : null,
        );
        toast.success(i18n.t("turbo.shipmentCancelledSuccess"));
        return true;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || i18n.t("turbo.cancelFailed"));
    } finally {
      setTurboLoading(false);
    }
    return false;
  }, [order?.id, order?.turboShipmentId, order?.turboTrackingNumber, setOrder]);

  const unlinkShipment = useCallback(async () => {
    const orderIdentifier = order?.id || order?.orderNumber;
    if (!orderIdentifier) return false;

    setTurboLoading(true);
    try {
      const response = await apiClient.post(
        `/turbo/orders/${orderIdentifier}/unlink`,
      );
      if (response.data.success) {
        setOrder((prev: any) =>
          prev
            ? {
                ...prev,
                turboShipmentId: null,
                turboTrackingNumber: null,
                turboShipmentStatus: null,
                turboLabelUrl: null,
                turboMetadata: null,
                turboBranchId: null,
                updatedAt: new Date().toISOString(),
              }
            : null,
        );
        setTurboTrackingData(null);
        setShippingComparison(null);
        toast.success(i18n.t("turbo.unlinkSuccess"));
        return true;
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          i18n.t("turbo.unlinkFailed"),
      );
    } finally {
      setTurboLoading(false);
    }
    return false;
  }, [order?.id, order?.orderNumber, setOrder]);

  const calculateShipping = useCallback(async (governorate: string, city: string) => {
    if (!governorate && !order?.shippingAddress) {
      toast.error(i18n.t("turbo.selectGovernorate"));
      return;
    }
    setTurboLoading(true);
    try {
      const response = await apiClient.post("/turbo/calculate", {
        weight: 1,
        governorate: governorate || order.city || "",
        city: city || order.city || "",
        address: typeof order.shippingAddress === 'string' ? order.shippingAddress : '',
        orderId: order?.id || order?.orderNumber,
        cod: order.total || order.finalTotal,
      });

      if (response.data?.success) {
        const data = response.data.data;
        const cost = Number(data?.cost || data?.price || data?.shippingCost || order.shipping || 70);
        const customerCost = Number(order.shipping || 0);
        setShippingComparison({
          actualCost: cost,
          customerCost: customerCost,
          difference: cost - customerCost,
        });
        toast.success(`تم حساب السعر الفعلي للشحن: ${cost} ج.م`);
      }
    } catch (error: any) {
      console.error("Shipping calc error:", error);
      const fallbackCost = Number(order?.shippingCost || order?.shipping || 70);
      const customerCost = Number(order?.shipping || 0);
      setShippingComparison({
        actualCost: fallbackCost,
        customerCost: customerCost,
        difference: fallbackCost - customerCost,
      });
      toast.info(`تم عرض سعر الشحن: ${fallbackCost} ج.م`);
    } finally {
      setTurboLoading(false);
    }
  }, [order?.id, order?.orderNumber, order?.city, order?.shippingAddress, order?.total, order?.finalTotal, order?.shipping, order?.shippingCost]);

  const updateShipment = useCallback(async () => {
    if (!order?.id || (!order?.turboShipmentId && !order?.turboTrackingNumber)) {
      tToast.error("useTurboShipping.msg_d8b2");
      return false;
    }

    setTurboLoading(true);
    try {
      const response = await apiClient.put(`/turbo/orders/${order.id}/shipment`);
      if (response.data?.success) {
        toast.success(
          `تم تحديث بيانات الشحنة في تربو بنجاح (كود: ${order.turboTrackingNumber || order.turboShipmentId})`
        );
        setOrder((prev: any) =>
          prev
            ? {
                ...prev,
                updatedAt: new Date().toISOString(),
              }
            : null,
        );
        return true;
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "فشل تحديث بيانات الشحنة في تربو";
      toast.error(errorMsg);
    } finally {
      setTurboLoading(false);
    }
    return false;
  }, [order?.id, order?.turboShipmentId, order?.turboTrackingNumber, setOrder]);

  const syncStatus = useCallback(async () => {
    if (!order?.id || (!order?.turboShipmentId && !order?.turboTrackingNumber)) {
      tToast.error("useTurboShipping.msg_2fbc");
      return false;
    }

    setTurboLoading(true);
    try {
      const orderIdentifier = order.id || order.orderNumber;
      const response = await apiClient.post(`/turbo/orders/${orderIdentifier}/sync-status`);
      if (response.data?.success) {
        const syncedStatus = response.data.data?.status || response.data.data?.turboShipmentStatus;
        const syncedTrackingData = response.data.data;
        const orderStatus = response.data.data?.orderStatus || response.data.data?.systemStatus;

        toast.success(
          `تم سحب ومزامنة حالة الشحنة من تربو بنجاح! (${response.data.message || syncedStatus || 'محدثة'})`
        );

        setOrder((prev: any) =>
          prev
            ? {
                ...prev,
                status: orderStatus || prev.status,
                turboShipmentStatus: syncedStatus || prev.turboShipmentStatus,
                updatedAt: new Date().toISOString(),
              }
            : null,
        );

        if (syncedTrackingData) {
          setTurboTrackingData({
            status: syncedStatus,
            currentLocation: syncedTrackingData.currentLocation || syncedTrackingData.raw?.location,
            estimatedDelivery: syncedTrackingData.estimatedDelivery,
            deliveredAt: syncedTrackingData.deliveredAt,
            branch: syncedTrackingData.branch || syncedTrackingData.raw?.expected_branch,
            history: syncedTrackingData.history || syncedTrackingData.raw?.history || [],
          });
        }
        return true;
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "فشل سحب ومزامنة حالة الشحنة من تربو";
      toast.error(errorMsg);
    } finally {
      setTurboLoading(false);
    }
    return false;
  }, [order?.id, order?.orderNumber, order?.turboShipmentId, order?.turboTrackingNumber, setOrder]);

  return {
    turboLoading,
    turboTrackingData,
    shippingComparison,
    createShipment,
    updateShipment,
    syncStatus,
    getWaybill,
    cancelShipment,
    unlinkShipment,
    calculateShipping,
    setTurboTrackingData,
  };
};

export default useTurboShipping;
