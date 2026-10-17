/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../../services/apiClient";
import { printBostaAWB, printQpWaybill } from "./shippingPrintHelpers";

interface UseShippingActionsProps {
  order: any;
  onOrderUpdated?: () => void;
  canManageShipments?: boolean;
  existingTracking: string | null;
  isTurbo: boolean;
  isQpExpress: boolean;
  isBosta: boolean;
  existingCarrierName: string;
  shipment: any;
  shipmentMeta: any;
  selectedCompanyId: string;
  isManualCourier: boolean;
}

export function useShippingActions({
  order,
  onOrderUpdated,
  canManageShipments = true,
  existingTracking,
  isTurbo,
  isQpExpress,
  isBosta,
  existingCarrierName,
  shipment,
  shipmentMeta,
  selectedCompanyId,
  isManualCourier,
}: UseShippingActionsProps) {
  const [manualTracking, setManualTracking] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [qpNotes, setQpNotes] = useState("المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resending, setResending] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const copyTracking = useCallback(() => {
    if (existingTracking) {
      navigator.clipboard.writeText(existingTracking);
      toast.success("تم نسخ رقم التتبع");
    }
  }, [existingTracking]);

  const handleTurboDirectShipment = useCallback(async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setLoading(true);
    try {
      const orderIdentifier = order?.orderNumber || order?.id;
      const res: any = await apiClient.post(`/turbo/orders/${orderIdentifier}/shipment`);

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء بوليصة الشحن بنجاح لدى Turbo");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة مع Turbo");
      }
    } catch (err: any) {
      console.error("Turbo dispatch error:", err);
      toast.error(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "حدث خطأ أثناء الشحن عبر Turbo"
      );
    } finally {
      setLoading(false);
    }
  }, [canManageShipments, order, onOrderUpdated]);

  const handleQpExpressDirectShipment = useCallback(async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setLoading(true);
    try {
      const res: any = await apiClient.post(`/qp-express/orders/${order.id}/shipment`, {
        notes: qpNotes || "المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة",
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء بوليصة الشحن بنجاح لدى QP Express");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة مع QP Express");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "حدث خطأ أثناء الشحن عبر QP Express");
    } finally {
      setLoading(false);
    }
  }, [canManageShipments, order, qpNotes, onOrderUpdated]);

  const handleBostaDirectShipment = useCallback(async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setLoading(true);
    try {
      const res: any = await apiClient.post(`/bosta/orders/${order.id}/shipment`);

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء بوليصة الشحن بنجاح لدى Bosta");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة مع Bosta");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "حدث خطأ أثناء الشحن عبر Bosta");
    } finally {
      setLoading(false);
    }
  }, [canManageShipments, order, onOrderUpdated]);

  const handlePrintBostaAWB = useCallback(async () => {
    const deliveryId =
      shipmentMeta?.bostaDeliveryId ||
      shipment?.externalShipmentId ||
      existingTracking;
    await printBostaAWB(deliveryId);
  }, [shipmentMeta?.bostaDeliveryId, shipment?.externalShipmentId, existingTracking]);

  const handlePrintQpWaybill = useCallback(() => {
    printQpWaybill(existingTracking);
  }, [existingTracking]);

  const handleCreateShipment = useCallback(async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setLoading(true);
    try {
      const res: any = await apiClient.post("/shipments/create", {
        orderId: order.id,
        shippingCompanyId: isManualCourier ? null : selectedCompanyId || null,
        trackingNumber: isManualCourier ? manualTracking : undefined,
        manualDeliveryNotes: manualNotes || undefined,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء الشحنة بنجاح");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء إنشاء الشحنة");
    } finally {
      setLoading(false);
    }
  }, [canManageShipments, order?.id, isManualCourier, selectedCompanyId, manualTracking, manualNotes, onOrderUpdated]);

  const handleSyncStatus = useCallback(async () => {
    setSyncing(true);
    try {
      if (isBosta && existingTracking) {
        const res: any = await apiClient.get(`/bosta/track/${existingTracking}`);
        if (res.data?.success) {
          toast.success("تمت مزامنة حالة شحنة بوستا بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      }
      if (shipment?.id) {
        const res: any = await apiClient.post(`/shipments/${shipment.id}/sync`);
        if (res.data?.success) {
          toast.success(res.data.message || "تمت مزامنة حالة الشحنة بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        } else {
          toast.error(res.data?.error || "فشلت المزامنة");
        }
      } else if (isQpExpress && existingTracking) {
        const res: any = await apiClient.get(`/qp-express/track/${existingTracking}`);
        if (res.data?.success) {
          toast.success("تمت مزامنة حالة شحنة QP Express بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        } else {
          toast.error(res.data?.error || "تعذر مزامنة الشحنة");
        }
      } else if (order?.turboTrackingNumber) {
        const res: any = await apiClient.post(`/turbo/sync-status/${order.id}`);
        if (res.data?.success) {
          toast.success("تمت مزامنة حالة شحنة تربو");
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      }
      toast.error("لا توجد شحنة مسجلة للمزامنة");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "تعذر مزامنة الشحنة");
    } finally {
      setSyncing(false);
    }
  }, [isBosta, existingTracking, shipment?.id, isQpExpress, order?.turboTrackingNumber, order?.id, onOrderUpdated]);

  const handleCancelShipment = useCallback(async () => {
    setCancelling(true);
    try {
      if (isBosta) {
        const deliveryId =
          shipmentMeta?.bostaDeliveryId ||
          shipment?.externalShipmentId ||
          existingTracking;
        if (deliveryId) {
          const res: any = await apiClient.post(`/bosta/cancel/${deliveryId}`);
          if (res.data?.success) {
            toast.success("تم إلغاء شحنة بوستا بنجاح");
            setShowCancelModal(false);
            if (onOrderUpdated) onOrderUpdated();
            return;
          }
        }
      }
      if (shipment?.id) {
        const res: any = await apiClient.post(`/shipments/${shipment.id}/cancel`, {
          reason: cancelReason,
        });
        if (res.data?.success) {
          toast.success("تم إلغاء الشحنة بنجاح");
          setShowCancelModal(false);
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      } else if (order?.turboTrackingNumber) {
        const res: any = await apiClient.post(`/turbo/cancel-shipment/${order.id}`, {
          reason: cancelReason,
        });
        if (res.data?.success) {
          toast.success("تم إلغاء شحنة تربو بنجاح");
          setShowCancelModal(false);
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      }
      toast.error("تعذر إلغاء الشحنة");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إلغاء الشحنة");
    } finally {
      setCancelling(false);
    }
  }, [isBosta, shipmentMeta?.bostaDeliveryId, shipment?.externalShipmentId, shipment?.id, existingTracking, cancelReason, order?.turboTrackingNumber, order?.id, onOrderUpdated]);

  const handleResendShipment = useCallback(async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setResending(true);
    try {
      const isTurboOrder =
        existingCarrierName?.toLowerCase().includes("turbo") ||
        Boolean(order?.turboTrackingNumber || order?.turboShipmentId);

      if (isTurboOrder) {
        const orderIdentifier = order?.orderNumber || order?.id;
        let success = false;
        let successMessage = "";

        try {
          const updateRes: any = await apiClient.put(`/turbo/orders/${orderIdentifier}/shipment`);
          if (updateRes.data?.success) {
            success = true;
            successMessage = updateRes.data.message || "تم تحديث وإعادة إرسال بيانات الشحنة لتربو بنجاح";
          }
        } catch {
          const createRes: any = await apiClient.post(`/turbo/orders/${orderIdentifier}/shipment`, {
            replaceExisting: true,
          });
          if (createRes.data?.success) {
            success = true;
            successMessage = "تم إنشاء وإعادة إرسال الشحنة لتربو بنجاح";
          } else {
            throw new Error(createRes.data?.error || "فشل إعادة إرسال الشحنة");
          }
        }

        if (success) {
          toast.success(successMessage);
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      } else if (isQpExpress) {
        const res: any = await apiClient.post(`/qp-express/orders/${order.id}/shipment`, {
          notes: qpNotes || "المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة",
        });
        if (res.data?.success) {
          toast.success(res.data.message || "تم إنشاء وتوجيه بوليصة الشحن بنجاح لـ QP Express");
          if (onOrderUpdated) onOrderUpdated();
          return;
        } else {
          throw new Error(res.data?.error || "تعذر إعادة إرسال الشحنة لـ QP Express");
        }
      } else if (isBosta) {
        const res: any = await apiClient.post(`/bosta/orders/${order.id}/shipment`);
        if (res.data?.success) {
          toast.success(res.data.message || "تم إنشاء وتوجيه الشحنة لـ Bosta بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        } else {
          throw new Error(res.data?.error || "تعذر إعادة إرسال الشحنة لـ Bosta");
        }
      } else if (shipment?.id) {
        const res: any = await apiClient.post(`/shipments/${shipment.id}/sync`);
        if (res.data?.success) {
          toast.success(res.data.message || "تم تحديث ومزامنة بيانات الشحنة بنجاح");
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      }

      toast.error("تعذر إعادة إرسال بيانات الشحنة");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "فشل إعادة إرسال بيانات الشحنة"
      );
    } finally {
      setResending(false);
    }
  }, [canManageShipments, existingCarrierName, order, isQpExpress, isBosta, shipment?.id, qpNotes, onOrderUpdated]);

  return {
    manualTracking,
    setManualTracking,
    manualNotes,
    setManualNotes,
    qpNotes,
    setQpNotes,
    loading,
    syncing,
    cancelling,
    resending,
    showCancelModal,
    setShowCancelModal,
    cancelReason,
    setCancelReason,
    copyTracking,
    handleTurboDirectShipment,
    handleQpExpressDirectShipment,
    handleBostaDirectShipment,
    handlePrintBostaAWB,
    handlePrintQpWaybill,
    handleCreateShipment,
    handleSyncStatus,
    handleCancelShipment,
    handleResendShipment,
  };
}
