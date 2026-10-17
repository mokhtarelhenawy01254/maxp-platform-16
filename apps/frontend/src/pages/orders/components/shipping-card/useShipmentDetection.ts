/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { ShippingAutoError } from "./shippingCardTypes";

export function useShipmentDetection(order: any) {
  const shipment = order?.shipment || (Array.isArray(order?.shipments) && order.shipments[0]) || null;
  const existingTracking =
    shipment?.trackingNumber ||
    order?.trackingNumber ||
    order?.turboTrackingNumber ||
    order?.metadata?.trackingNumber ||
    null;

  const shipmentMeta = useMemo(() => {
    const meta = shipment?.metadata || order?.metadata;
    if (!meta) return {};
    if (typeof meta === "object") return meta;
    try {
      return JSON.parse(meta);
    } catch {
      return {};
    }
  }, [shipment?.metadata, order?.metadata]);

  const liveStatus = shipmentMeta?.liveStatus || shipmentMeta?.qpExpress || null;

  const shippingAutoError = useMemo<ShippingAutoError | null>(() => {
    if (shipmentMeta?.shippingAutoError) {
      return shipmentMeta.shippingAutoError;
    }
    const notesStr = String(order?.notes || "");
    if (
      notesStr.includes("فشل إنشاء شحنة تربو تلقائياً") ||
      notesStr.includes("تعذر إنشاء شحنة تربو تلقائياً") ||
      notesStr.includes("تم تخطي الشحن التلقائي لتربو")
    ) {
      const isDataErr = /بيانات العميل|بيانات الشحن|هاتف|phone|محافظة|governorate|عنوان/i.test(notesStr);
      const match = notesStr.match(/\[(فشل إنشاء شحنة تربو تلقائياً|تعذر إنشاء شحنة تربو تلقائياً|تم تخطي الشحن التلقائي لتربو)[^\]]*\]/);
      const rawText = match ? match[0].replace(/[\[\]]/g, "") : notesStr;
      return {
        category: isDataErr ? "DATA_ERROR" : "SYSTEM_ERROR",
        code: isDataErr ? "DATA_VALIDATION_ERROR" : "SYSTEM_INTEGRATION_ERROR",
        message: rawText,
        actionHint: isDataErr
          ? "يرجى مراجعة وتعديل بيانات العميل (الهاتف، العنوان، أو المحافظة) من تفاصيل الطلب ثم إعادة المحاولة"
          : "يرجى مراجعة إعدادات الربط ومفتاح الـ API لشركة الشحن",
        provider: "TURBO",
      };
    }
    return null;
  }, [shipmentMeta?.shippingAutoError, order?.notes]);

  const isQpExpress =
    shipment?.carrierType === "QP_EXPRESS" ||
    order?.shippingCarrier === "QP_EXPRESS" ||
    order?.carrierType === "QP_EXPRESS" ||
    shipmentMeta?.shippingCarrier === "QP_EXPRESS" ||
    shipmentMeta?.carrier === "QP_EXPRESS" ||
    Boolean(shipmentMeta?.qpExpress) ||
    Boolean(shipmentMeta?.orderSerial) ||
    Boolean(shipment?.shippingCompany?.providerKey === "QP_EXPRESS") ||
    shipment?.shippingCompany?.name?.toLowerCase().includes("qp") ||
    shipment?.shippingCompany?.name?.includes("كيو بي") ||
    order?.shippingCompany?.name?.toLowerCase().includes("qp") ||
    order?.shippingCompany?.name?.includes("كيو بي");

  const isBosta =
    shipment?.carrierType === "BOSTA" ||
    order?.shippingCarrier === "BOSTA" ||
    order?.carrierType === "BOSTA" ||
    shipmentMeta?.shippingCarrier === "BOSTA" ||
    shipmentMeta?.carrier === "BOSTA" ||
    Boolean(shipmentMeta?.bostaDeliveryId || (shipment?.carrierType === "BOSTA" && shipment?.externalShipmentId)) ||
    Boolean(shipment?.shippingCompany?.providerKey === "BOSTA") ||
    shipment?.shippingCompany?.name?.toLowerCase().includes("bosta") ||
    shipment?.shippingCompany?.name?.includes("بوستا") ||
    order?.shippingCompany?.name?.toLowerCase().includes("bosta") ||
    order?.shippingCompany?.name?.includes("بوستا");

  const isTurbo =
    order?.carrierType === "TURBO" ||
    shipment?.carrierType === "TURBO" ||
    shipmentMeta?.carrier === "TURBO" ||
    Boolean(order?.turboTrackingNumber || order?.turboShipmentId);

  const existingCarrierName =
    shipment?.shippingCompany?.name ||
    order?.shippingCompany?.name ||
    (isQpExpress ? "كيو بي إكسبريس (QP Express)" : null) ||
    (isBosta ? "بوسطة (Bosta)" : null) ||
    (isTurbo ? "تربو (Turbo)" : null) ||
    (order?.carrierType && order.carrierType !== "MANUAL" ? order.carrierType : null) ||
    (shipment?.carrierType && shipment.carrierType !== "MANUAL" ? shipment.carrierType : null) ||
    "شركة الشحن";

  const shipmentStatus =
    liveStatus?.statusLabel ||
    shipment?.status ||
    order?.shipmentStatus ||
    order?.turboShipmentStatus ||
    "PENDING";

  return {
    shipment,
    existingTracking,
    shipmentMeta,
    liveStatus,
    shippingAutoError,
    isQpExpress,
    isBosta,
    isTurbo,
    existingCarrierName,
    shipmentStatus,
  };
}
