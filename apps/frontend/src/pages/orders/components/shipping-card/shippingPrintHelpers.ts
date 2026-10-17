/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";
import { apiClient } from "../../../../services/apiClient";
import tokenManager from "../../../../utils/tokenManager";

export async function printBostaAWB(deliveryId?: string | null) {
  if (!deliveryId) {
    toast.error("لا يوجد رقم تسليم لطباعة بوليصة بوستا");
    return;
  }

  try {
    const res: any = await apiClient.get(`/bosta/awb/${deliveryId}`);
    const awbData = res.data?.data?.data || res.data?.data;
    if (typeof awbData === "string" && awbData.length > 50) {
      const byteCharacters = atob(awbData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } else if (res.data?.data?.url) {
      window.open(res.data.data.url, "_blank");
    } else {
      toast.error("تعذر جلب ملف بوليصة بوستا");
    }
  } catch (err: any) {
    toast.error(err?.response?.data?.error || "تعذر طباعة بوليصة بوستا");
  }
}

export function printQpWaybill(existingTracking?: string | null) {
  if (!existingTracking) return;
  const token = tokenManager.getAccessToken();
  const printUrl = `/api/v1/qp-express/waybill/${existingTracking}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const w = window.open(printUrl, "_blank", "width=450,height=400");
  if (w) w.focus();
}
