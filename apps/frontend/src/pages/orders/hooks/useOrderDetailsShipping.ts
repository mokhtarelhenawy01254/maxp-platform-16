import { useEffect } from "react";
import { useTurboShipping } from "./useTurboShipping";
import { useBostaShipping } from "./useBostaShipping";
import { useOrderShippingActions, type UseOrderShippingActionsReturn } from "./useOrderShippingActions";
import type { OrderDetailsType } from "../types";

export interface UseOrderDetailsShippingReturn {
  turboLoading: boolean;
  bostaLoading: boolean;
  cancelShipment: () => Promise<void>;
  unlinkShipment: () => Promise<void>;
  shippingActions: UseOrderShippingActionsReturn;
}

export function useOrderDetailsShipping(
  order: OrderDetailsType | null,
  setOrder: React.Dispatch<React.SetStateAction<OrderDetailsType | null>>,
): UseOrderDetailsShippingReturn {
  const {
    turboLoading,
    createShipment,
    getWaybill,
    cancelShipment,
    unlinkShipment,
    calculateShipping,
  } = useTurboShipping(order, setOrder);

  const {
    bostaLoading,
    bostaShipment,
    fetchShipment: fetchBostaShipment,
    printAWB: printBostaAWB,
  } = useBostaShipping(order, setOrder);

  useEffect(() => {
    if (order?.id) {
      void fetchBostaShipment();
    }
  }, [order?.id, fetchBostaShipment]);

  const shippingActions = useOrderShippingActions({
    order,
    createShipment,
    getWaybill,
    calculateShipping,
    bostaShipment,
    printBostaAWB,
  });

  return {
    turboLoading,
    bostaLoading,
    cancelShipment,
    unlinkShipment,
    shippingActions,
  };
}
