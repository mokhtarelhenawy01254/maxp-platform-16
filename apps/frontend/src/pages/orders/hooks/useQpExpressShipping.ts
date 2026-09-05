import { useState } from "react";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";

export const useQpExpressShipping = (order: any, setOrder: (order: any) => void) => {
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);

  const fetchTracking = async () => {
    const trackingNum = order?.shippingTrackingNumber || order?.trackingNumber;
    if (!trackingNum) return;
    try {
      const res: any = await apiClient.get(`/qp-express/track/${trackingNum}`);
      if (res.data?.success && res.data?.data?.found) {
        setTrackingData(res.data.data);
      }
    } catch {
      // ignore
    }
  };

  const createShipment = async (customNotes?: string) => {
    if (!order?.id) return { success: false };
    setLoading(true);
    try {
      const res: any = await apiClient.post(`/qp-express/orders/${order.id}/shipment`, {
        notes: customNotes,
      });
      if (res.data?.success && res.data?.data?.trackingNumber) {
        const d = res.data.data;
        setOrder((prev: any) =>
          prev
            ? {
                ...prev,
                shippingTrackingNumber: d.trackingNumber,
                trackingNumber: d.trackingNumber,
                shippingCarrier: "QP_EXPRESS",
              }
            : null
        );
        toast.success(`تم إنشاء بوليصة QP Express بنجاح: ${d.trackingNumber}`);
        await fetchTracking();
        return { success: true, trackingNumber: d.trackingNumber };
      }
      return { success: false };
    } catch (err: any) {
      toast.error(err.response?.data?.error || "تعذر إنشاء الشحنة لدى QP Express");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    trackingData,
    fetchTracking,
    createShipment,
  };
};
