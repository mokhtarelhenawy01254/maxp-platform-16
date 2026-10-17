/* eslint-disable @typescript-eslint/no-explicit-any */
import { useShipmentDetection } from "./useShipmentDetection";
import { useShippingCompanies } from "./useShippingCompanies";
import { useShippingActions } from "./useShippingActions";

interface UseShippingCardDataProps {
  order: any;
  onOrderUpdated?: () => void;
  canManageShipments?: boolean;
}

export function useShippingCardData({
  order,
  onOrderUpdated,
  canManageShipments = true,
}: UseShippingCardDataProps) {
  const detection = useShipmentDetection(order);
  const companiesData = useShippingCompanies();
  const actions = useShippingActions({
    order,
    onOrderUpdated,
    canManageShipments,
    existingTracking: detection.existingTracking,
    isTurbo: detection.isTurbo,
    isQpExpress: detection.isQpExpress,
    isBosta: detection.isBosta,
    existingCarrierName: detection.existingCarrierName,
    shipment: detection.shipment,
    shipmentMeta: detection.shipmentMeta,
    selectedCompanyId: companiesData.selectedCompanyId,
    isManualCourier: companiesData.isManualCourier,
  });

  return {
    ...detection,
    ...companiesData,
    ...actions,
  };
}
