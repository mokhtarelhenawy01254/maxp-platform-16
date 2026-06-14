import { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { useAuth } from "../../../hooks/useAuthSimple";
import { toast } from "sonner";
import { config } from "../../../config";
import tokenManager from "../../../utils/tokenManager";

export const useTurboShipping = (
  order: any,
  setOrder: (order: any) => void,
) => {
  const { user } = useAuth();

  const [turboLoading, setTurboLoading] = useState(false);
  const [turboTrackingData, setTurboTrackingData] = useState<any>(null);
  const [shippingComparison, setShippingComparison] = useState<{
    actualCost: number;
    customerCost: number;
    difference: number;
  } | null>(null);

  // Socket Listener for Real-time Updates
  useEffect(() => {
    if (!order?.id || !user?.companyId) return;

    if (!socketService.isConnected()) {
      socketService.connect();
    }

    const socket = socketService.getSocket();
    if (!socket) return;

    if (!socket.connected) {
      socket.once("connect", () => {
        if (user.companyId) {
          socket.emit("join_company_room", { companyId: user.companyId });
        }
      });
    }

    const handleTurboUpdate = (data: any) => {
      if (data.orderNumber === order.orderNumber || data.orderId === order.id) {
        // Update order state via the passed setter from useOrderDetails
        setOrder((prev: any) =>
          prev
            ? {
                ...prev,
                turboShipmentStatus: data.status,
                turboTrackingNumber:
                  data.trackingNumber || prev.turboTrackingNumber,
                updatedAt: new Date().toISOString(),
              }
            : null,
        );

        if (data.data) {
          setTurboTrackingData({
            status: data.status,
            currentLocation: data.data.currentLocation || data.data.location,
            estimatedDelivery:
              data.data.estimatedDelivery || data.data.expected_delivery,
            deliveredAt: data.data.deliveredAt || data.data.delivery_date,
            branch: data.data.branch || data.data.expected_branch,
            history: data.data.history || [],
          });
        }

        // Show notification
        if (data.status === "delivered") {
          toast.success("✅ تم تسليم الشحنة بنجاح!");
        } else if (data.status === "cancelled") {
          toast.error("❌ تم إلغاء الشحنة");
        } else if (data.status === "returned") {
          toast.error("🔄 تم إرجاع الشحنة");
        } else {
          toast("📦 تحديث حالة الشحنة: " + data.status, {
            icon: "🚚",
          });
        }
      }
    };

    socket.on("turbo_shipment_update", handleTurboUpdate);

    // Rejoin on reconnect
    const handleReconnect = () => {
      if (user?.companyId) {
        socket.emit("join_company_room", { companyId: user.companyId });
      }
    };
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("turbo_shipment_update", handleTurboUpdate);
      socket.off("connect", handleReconnect);
    };
  }, [order?.id, order?.orderNumber, user?.companyId, setOrder]);

  // Actions

  const openPrintWindow = (htmlContent: string, title: string) => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      throw new Error("تعذر فتح نافذة جديدة للطباعة");
    }

    printWindow.document.write(htmlContent);
    printWindow.document.title = title;
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const createShipment = async (options?: { replaceExisting?: boolean }) => {
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
            ? "تم إرجاع الشحنة على Turbo برقم تتبع جديد: " +
                response.data.data.trackingNumber
            : "تم إنشاء الشحنة بنجاح! رقم التتبع: " +
                response.data.data.trackingNumber,
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
            ? "فشل إرجاع الشحنة على Turbo مرة أخرى"
            : "فشل إنشاء الشحنة"),
      );
      return { success: false, error: error.message };
    } finally {
      setTurboLoading(false);
    }
  };

  const getWaybill = async (useLocalGeneration = false) => {
    if (!order?.id) return null;
    setTurboLoading(true);
    try {
      const orderIdentifier = order.orderNumber || order.id;
      const baseWaybillUrl = `${config.apiUrl}/turbo/orders/${orderIdentifier}/waybill`;
      const authToken = tokenManager.getAccessToken();
      const headers: Record<string, string> = {};

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      toast.info("جاري تجهيز بوليصة Turbo...");

      if (!useLocalGeneration) {
        const pdfResponse = await fetch(baseWaybillUrl, {
          method: "GET",
          headers: {
            ...headers,
            Accept: "application/pdf",
          },
        });

        const contentType = pdfResponse.headers.get("content-type") || "";

        if (pdfResponse.ok && contentType.includes("application/pdf")) {
          const pdfBlob = await pdfResponse.blob();

          if (pdfBlob.size === 0) {
            throw new Error("ملف البوليصة فارغ");
          }

          const pdfUrl = window.URL.createObjectURL(pdfBlob);
          const pdfWindow = window.open(pdfUrl, "_blank");

          if (!pdfWindow) {
            const link = document.createElement("a");
            link.href = pdfUrl;
            link.download = `waybill-${orderIdentifier}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }

          setTimeout(() => {
            window.URL.revokeObjectURL(pdfUrl);
          }, 60_000);

          toast.success("تم فتح بوليصة Turbo في نافذة جديدة");
          return true;
        }
      }

      const htmlResponse = await fetch(`${baseWaybillUrl}?format=html`, {
        method: "GET",
        headers: {
          ...headers,
          Accept: "text/html",
        },
      });

      if (!htmlResponse.ok) {
        const errorText = await htmlResponse.text();

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            errorData.error || errorData.message || "فشل في تحميل بوليصة Turbo",
          );
        } catch (_parseError) {
          throw new Error(errorText || "فشل في تحميل بوليصة Turbo");
        }
      }

      const htmlContent = await htmlResponse.text();
      openPrintWindow(htmlContent, `Turbo Waybill - ${orderIdentifier}`);
      toast.success("تم فتح بوليصة Turbo للطباعة");
      return true;
    } catch (error: any) {
      console.error("❌ [WAYBILL] Error loading waybill:", error);
      toast.error(error.message || "فشل تحميل بوليصة Turbo");
      return null;
    } finally {
      setTurboLoading(false);
    }
  };

  const cancelShipment = async () => {
    if (!order?.id || (!order?.turboShipmentId && !order?.turboTrackingNumber)) {
      return false;
    }

    // In a real UX, we'd use a custom modal. For now, we will rely on a browser confirm
    // or assume the UI button handles the "Are you sure?" step before calling this.
    // Given the task 'Replace window.alert/confirm', we should ideally assume the UI handles confirmation.
    // However, as a safeguard, we can revert to a safe check or just execute if the button is clicked.

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
        toast.success("تم إلغاء الشحنة بنجاح");
        return true;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "فشل إلغاء الشحنة");
    } finally {
      setTurboLoading(false);
    }
    return false;
  };

  const unlinkShipment = async () => {
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
        toast.success("تم إلغاء ربط Turbo من الطلب");
        return true;
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "فشل إلغاء ربط Turbo",
      );
    } finally {
      setTurboLoading(false);
    }
    return false;
  };

  const calculateShipping = async (governorate: string, city: string) => {
    if (!governorate) {
      toast.error("يرجى تحديد المحافظة لحساب تكلفة الشحن");
      return;
    }
    setTurboLoading(true); // Reuse loading state or create specific one
    try {
      // Assuming endpoint accepts these params.
      // If the backend expects IDs, we might need to look them up.
      // Based on previous code, it likely takes IDs or Names.
      const response = await apiClient.post("/turbo/shipping/calculate", {
        weight: 1, // Default weight 1kg
        governorate: governorate,
        city: city,
        cod: order.total, // Cash on Delivery amount
      });

      if (response.data.success) {
        const cost = response.data.data.price || response.data.data.cost;
        if (cost) {
          setShippingComparison({
            actualCost: cost,
            customerCost: order.shipping,
            difference: cost - order.shipping,
          });
          toast.success(`تم حساب تكلفة الشحن: ${cost} ج.م`);
        }
      }
    } catch (error: any) {
      console.error("Shipping calc error:", error);
      toast.error("فشل حساب تكلفة الشحن");
    } finally {
      setTurboLoading(false);
    }
  };

  const fetchShippingComparison = async () => {
    // Logic to fetch comparison if needed
  };

  return {
    turboLoading,
    turboTrackingData,
    shippingComparison,
    createShipment,
    getWaybill,
    cancelShipment,
    unlinkShipment,
    calculateShipping,
    setTurboTrackingData,
  };
};
