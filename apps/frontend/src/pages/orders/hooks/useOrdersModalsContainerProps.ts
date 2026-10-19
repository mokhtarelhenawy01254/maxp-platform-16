import { useCallback, useMemo } from "react";
import type { Order } from "../utils/orderTransformer";
import type { OrderStatusDefinition } from "../ordersConstants";
import type { OrdersModalsContainerProps } from "../components/OrdersModalsContainer";

export interface UseOrdersModalsContainerPropsOptions {
  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
  showOrderModal: boolean;
  setShowOrderModal: (val: boolean) => void;
  isMerchant: boolean;
  orderStatuses: OrderStatusDefinition[];
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  selectedInvoice: any | null;
  setSelectedInvoice: (invoice: any | null) => void;
}

export function useOrdersModalsContainerProps({
  selectedOrder,
  setSelectedOrder,
  showOrderModal,
  setShowOrderModal,
  isMerchant,
  orderStatuses,
  orders: _orders,
  setOrders,
  selectedInvoice,
  setSelectedInvoice,
}: UseOrdersModalsContainerPropsOptions): OrdersModalsContainerProps {
  const onOrderUpdate = useCallback(
    (updatedOrder: Order) => {
      setSelectedOrder(updatedOrder);
      setOrders((prev) =>
        prev.map((o) =>
          o.orderNumber === updatedOrder.orderNumber ? updatedOrder : o,
        ),
      );
    },
    [setSelectedOrder, setOrders],
  );

  return useMemo<OrdersModalsContainerProps>(
    () => ({
      selectedOrder,
      setSelectedOrder,
      showOrderModal,
      setShowOrderModal,
      isMerchant,
      orderStatuses,
      onOrderUpdate,
      selectedInvoice,
      setSelectedInvoice,
    }),
    [
      selectedOrder,
      setSelectedOrder,
      showOrderModal,
      setShowOrderModal,
      isMerchant,
      orderStatuses,
      onOrderUpdate,
      selectedInvoice,
      setSelectedInvoice,
    ],
  );
}
