import { useState } from "react";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import { config } from "../../../config";
import tokenManager from "../../../utils/tokenManager";

export const useBostaShipping = (order: any, setOrder: (order: any) => void) => {
  const [bostaLoading, setBostaLoading] = useState(false);
  const [bostaShipment, setBostaShipment] = useState<any>(null);

  const fetchShipment = async () => {
    if (!order?.id) return;
    try {
      const res = await apiClient.get(`/bosta/orders/${order.id}`);
      if (res.data.success) setBostaShipment(res.data.data);
      else setBostaShipment(null);
    } catch {
      setBostaShipment(null);
    }
  };

  const createShipment = async () => {
    if (!order?.id) return { success: false };
    setBostaLoading(true);
    try {
      const res = await apiClient.post(`/bosta/orders/${order.id}/shipment`);
      if (res.data.success) {
        const d = res.data.data;
        setOrder((prev: any) => prev ? { ...prev, bostaTrackingNumber: d.trackingNumber, bostaShipmentStatus: d.status } : null);
        toast.success("تم إنشاء شحنة Bosta بنجاح! رقم التتبع: " + d.trackingNumber);
        await fetchShipment();
        return { success: true, trackingNumber: d.trackingNumber };
      }
      return { success: false };
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل إنشاء الشحنة");
      return { success: false, error: err.message };
    } finally {
      setBostaLoading(false);
    }
  };

  const printAWB = async () => {
    const deliveryId = bostaShipment?.externalShipmentId;
    if (!deliveryId) { toast.error("لا توجد شحنة Bosta للطباعة"); return; }
    setBostaLoading(true);
    try {
      const token = tokenManager.getAccessToken();
      const url = `${config.apiUrl}/bosta/awb/${deliveryId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.open(data.data.url, "_blank");
        toast.success("تم فتح بوليصة Bosta");
      } else throw new Error("No AWB URL");
    } catch {
      toast.error("فشل تحميل بوليصة Bosta");
    } finally {
      setBostaLoading(false);
    }
  };

  const cancelShipment = async () => {
    const deliveryId = bostaShipment?.externalShipmentId;
    if (!deliveryId) { toast.error("لا توجد شحنة Bosta للإلغاء"); return; }
    setBostaLoading(true);
    try {
      const res = await apiClient.post(`/bosta/cancel/${deliveryId}`);
      if (res.data.success) {
        toast.success("تم إلغاء الشحنة بنجاح");
        setBostaShipment(null);
        setOrder((prev: any) => prev ? { ...prev, bostaShipmentStatus: "cancelled" } : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل إلغاء الشحنة");
    } finally {
      setBostaLoading(false);
    }
  };

  return { bostaLoading, bostaShipment, fetchShipment, createShipment, printAWB, cancelShipment };
};
