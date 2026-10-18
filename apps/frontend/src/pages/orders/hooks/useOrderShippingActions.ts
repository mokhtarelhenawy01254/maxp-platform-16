import { useState } from "react";
import { toast } from "sonner";
import type { OrderDetailsType } from "../types";

export interface UseOrderShippingActionsParams {
  order: OrderDetailsType | null;
  createShipment: (options?: { replaceExisting?: boolean }) => Promise<{ success?: boolean } | void>;
  getWaybill: () => Promise<void>;
  calculateShipping: (governorate: string, city: string) => Promise<void>;
  bostaShipment?: { trackingNumber?: string };
  printBostaAWB?: () => void;
}

export interface UseOrderShippingActionsReturn {
  showCancelShipmentModal: boolean;
  setShowCancelShipmentModal: (show: boolean) => void;
  showUnlinkShipmentModal: boolean;
  setShowUnlinkShipmentModal: (show: boolean) => void;
  showRecreateShipmentModal: boolean;
  setShowRecreateShipmentModal: (show: boolean) => void;
  handleCreateShipment: () => Promise<void>;
  handleRecreateShipment: () => Promise<void>;
  handlePrintWaybill: () => Promise<void>;
  handleCalculateShipping: () => Promise<void>;
}

export function useOrderShippingActions({
  order,
  createShipment,
  getWaybill,
  calculateShipping,
  bostaShipment,
  printBostaAWB,
}: UseOrderShippingActionsParams): UseOrderShippingActionsReturn {
  const [showCancelShipmentModal, setShowCancelShipmentModal] = useState(false);
  const [showUnlinkShipmentModal, setShowUnlinkShipmentModal] = useState(false);
  const [showRecreateShipmentModal, setShowRecreateShipmentModal] = useState(false);

  const handleCreateShipment = async () => {
    await createShipment();
  };

  const handleRecreateShipment = async () => {
    const result = await createShipment({ replaceExisting: true });
    if (result?.success) {
      setShowRecreateShipmentModal(false);
    }
  };

  const handlePrintWaybill = async () => {
    const isQp =
      order?.carrierType === "QP_EXPRESS" ||
      order?.shippingCompany?.providerKey === "QP_EXPRESS" ||
      Boolean(order?.qpTrackingNumber);
    const isBosta =
      order?.carrierType === "BOSTA" ||
      order?.shippingCompany?.providerKey === "BOSTA";
    const tracking = order?.trackingNumber || order?.turboTrackingNumber;

    if (isQp && tracking) {
      window.open(`/api/v1/qp-express/waybill/${tracking}`, "_blank");
      return;
    }

    if (isBosta && (bostaShipment?.trackingNumber || tracking)) {
      if (printBostaAWB) {
        printBostaAWB();
      } else {
        toast.info("جاري تجهيز بوليصة بوستا...");
      }
      return;
    }

    // Default Turbo or internal waybill
    await getWaybill();
  };

  const handleCalculateShipping = async () => {
    if (!order) return;
    let gov = "";
    let city = order.city || "";

    const addr = order.shippingAddress || order.customerAddress;
    if (typeof addr === "string" && addr.startsWith("{")) {
      try {
        const parsed = JSON.parse(addr);
        gov = parsed.governorate || parsed.government || "";
        if (!city) city = parsed.city || parsed.area || "";
      } catch (_e) {
        // Ignore malformed saved address payloads and fall back to flat fields.
      }
    } else if (typeof addr === "object") {
      const obj = addr as any;
      gov = obj.governorate || obj.government || "";
      if (!city) city = obj.city || obj.area || "";
    }

    await calculateShipping(gov, city);
  };

  return {
    showCancelShipmentModal,
    setShowCancelShipmentModal,
    showUnlinkShipmentModal,
    setShowUnlinkShipmentModal,
    showRecreateShipmentModal,
    setShowRecreateShipmentModal,
    handleCreateShipment,
    handleRecreateShipment,
    handlePrintWaybill,
    handleCalculateShipping,
  };
}
