import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import type { OrderDetailsType } from "../types";

export interface PostponeOrderData {
  scheduledDeliveryDate: string;
  scheduledNotes: string;
  autoTransitionEnabled: boolean;
}

export interface UseOrderFulfillmentActionsParams {
  order: OrderDetailsType | null;
  fetchOrderDetails: () => Promise<void>;
  updateStatus: (newStatus: string, notes?: string, isOverride?: boolean) => Promise<boolean>;
  t: (key: string, options?: any) => string;
}

export interface UseOrderFulfillmentActionsReturn {
  showPostponeModal: boolean;
  setShowPostponeModal: (show: boolean) => void;
  postponing: boolean;
  handlePostponeOrder: (data: PostponeOrderData) => Promise<void>;
  showPartialDeliveryModal: boolean;
  setShowPartialDeliveryModal: (show: boolean) => void;
  partialDeliveryLoading: boolean;
  handlePartialDelivery: (deliveredItems: any[], returnedItems: any[]) => Promise<void>;
}

export function useOrderFulfillmentActions({
  order,
  fetchOrderDetails,
  updateStatus,
  t,
}: UseOrderFulfillmentActionsParams): UseOrderFulfillmentActionsReturn {
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponing, setPostponing] = useState(false);

  const [showPartialDeliveryModal, setShowPartialDeliveryModal] = useState(false);
  const [partialDeliveryLoading, setPartialDeliveryLoading] = useState(false);

  const handlePostponeOrder = async (data: PostponeOrderData) => {
    if (!order) return;
    setPostponing(true);
    try {
      const response = await apiClient.post(
        `/orders-new/simple/${order.orderNumber}/schedule`,
        {
          scheduledDeliveryDate: data.scheduledDeliveryDate,
          scheduledNotes: data.scheduledNotes,
          autoTransitionEnabled: data.autoTransitionEnabled,
          changeStatusToScheduled: true,
        },
      );
      if (response.data.success) {
        setShowPostponeModal(false);
        await fetchOrderDetails();
        toast.success(t("orderDetails.orderPostponed"));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("orderDetails.postponeFailed"));
    } finally {
      setPostponing(false);
    }
  };

  const handlePartialDelivery = async (deliveredItems: any[], returnedItems: any[]) => {
    if (!order) return;
    setPartialDeliveryLoading(true);
    try {
      // Step 1: Update the current order with only delivered items and change status
      const deliveredSubtotal = deliveredItems.reduce(
        (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
        0,
      );
      await apiClient.put(`/orders-new/simple/${order.orderNumber}/items`, {
        items: deliveredItems,
        subtotal: deliveredSubtotal,
        tax: order.tax || 0,
        shipping: order.shipping || 0,
        total: deliveredSubtotal + parseFloat(String(order.tax || 0)) + parseFloat(String(order.shipping || 0)),
      });
      await updateStatus("PARTIALLY_DELIVERED", t("orderDetails.partialDeliveryNote"));

      // Step 2: If there are returned items, create a new order for them
      if (returnedItems.length > 0) {
        const returnedSubtotal = returnedItems.reduce(
          (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
          0,
        );
        await apiClient.post(`/orders-new/simple`, {
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          alternativePhone: order.alternativePhone,
          customerAddress: order.customerAddress,
          city: order.city,
          government: order.government,
          items: returnedItems,
          subtotal: returnedSubtotal,
          shipping: order.shipping || 0,
          tax: order.tax || 0,
          currency: order.currency,
          notes: t("orderDetails.returnedFromOrder", { orderNumber: order.orderNumber }),
          status: "PARTIALLY_RETURNED",
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
        });
        toast.success(t("orderDetails.partialDeliverySuccessWithReturn"));
      } else {
        toast.success(t("orderDetails.orderUpdated"));
      }

      setShowPartialDeliveryModal(false);
      await fetchOrderDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("orderDetails.partialDeliveryError"));
    } finally {
      setPartialDeliveryLoading(false);
    }
  };

  return {
    showPostponeModal,
    setShowPostponeModal,
    postponing,
    handlePostponeOrder,
    showPartialDeliveryModal,
    setShowPartialDeliveryModal,
    partialDeliveryLoading,
    handlePartialDelivery,
  };
}
