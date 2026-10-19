import React, { useCallback } from "react";
import { apiClient } from "../../../../services/apiClient";
import { toast } from "sonner";
import { extractApiErrorMessage } from "../apiError";
import type { WorkspaceOrder, WorkspaceOrderItem } from "../types";

export interface UseWorkspaceOrderMutationsParams {
  isArabic: boolean;
  setOrders: React.Dispatch<React.SetStateAction<WorkspaceOrder[]>>;
}

export interface UseWorkspaceOrderMutationsReturn {
  handleUpdateOrderItems: (
    orderId: string,
    newItems: WorkspaceOrderItem[],
    financials: { shipping?: number; discount?: number; notes?: string },
  ) => Promise<void>;
  handleUpdateCustomer: (
    orderId: string,
    customerData: {
      customerName?: string;
      customerPhone?: string;
      secondaryPhone?: string;
      governorate?: string;
      city?: string;
      shippingAddress?: string;
      notes?: string;
    },
  ) => Promise<void>;
  handleUpdateRating: (
    orderId: string,
    newRating: string,
    customerPhone?: string,
    customerId?: string,
  ) => void;
}

export const useWorkspaceOrderMutations = ({
  isArabic,
  setOrders,
}: UseWorkspaceOrderMutationsParams): UseWorkspaceOrderMutationsReturn => {
  const handleUpdateOrderItems = useCallback(
    async (
      orderId: string,
      newItems: WorkspaceOrderItem[],
      financials: { shipping?: number; discount?: number; notes?: string },
    ) => {
      try {
        const response = await apiClient.put(`/agent-workspace/orders/${orderId}/items`, {
          items: newItems,
          shipping: financials.shipping,
          discount: financials.discount,
          notes: financials.notes,
        });

        if (response.data?.success) {
          toast.success(isArabic ? "تم تحديث منتجات الطلب بنجاح" : "Order items updated");
          const updatedData = response.data?.data;
          const resolvedItems = updatedData?.items || newItems;
          setOrders((prev) =>
            prev.map((o) => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                items: resolvedItems,
                notes: updatedData?.notes ?? o.notes,
                subtotal: updatedData?.subtotal ?? o.subtotal,
                shipping: updatedData?.shipping ?? o.shipping,
                discount: updatedData?.discount ?? o.discount,
                total: updatedData?.total ?? o.total,
              };
            }),
          );
        } else {
          throw new Error(
            extractApiErrorMessage(response.data) ||
              (isArabic ? "فشل تحديث منتجات الطلب" : "Failed to update items"),
          );
        }
      } catch (err) {
        toast.error(
          extractApiErrorMessage(err) ||
            (isArabic ? "فشل تحديث منتجات الطلب" : "Failed to update items"),
        );
        throw err;
      }
    },
    [isArabic, setOrders],
  );

  const handleUpdateCustomer = useCallback(
    async (
      orderId: string,
      customerData: {
        customerName?: string;
        customerPhone?: string;
        secondaryPhone?: string;
        governorate?: string;
        city?: string;
        shippingAddress?: string;
        notes?: string;
      },
    ) => {
      try {
        const response = await apiClient.put(
          `/agent-workspace/orders/${orderId}/customer`,
          customerData,
        );
        if (response.data?.success) {
          toast.success(isArabic ? "تم حفظ بيانات العميل والعنوان" : "Customer info updated");
          setOrders((prev) =>
            prev.map((o) => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                ...customerData,
              };
            }),
          );
        } else {
          throw new Error(
            extractApiErrorMessage(response.data) ||
              (isArabic ? "فشل تحديث بيانات العميل" : "Failed to update customer"),
          );
        }
      } catch (err) {
        toast.error(
          extractApiErrorMessage(err) ||
            (isArabic ? "فشل تحديث بيانات العميل" : "Failed to update customer"),
        );
        throw err;
      }
    },
    [isArabic, setOrders],
  );

  const handleUpdateRating = useCallback(
    (orderId: string, newRating: string, customerPhone?: string, customerId?: string) => {
      setOrders((prev) => {
        const targetOrder = prev.find((o) => o.id === orderId);
        const phone = customerPhone || targetOrder?.customerPhone;
        const cId = customerId || targetOrder?.customerId;

        return prev.map((o) => {
          const isMatch =
            o.id === orderId ||
            Boolean(cId && o.customerId && o.customerId === cId) ||
            Boolean(phone && o.customerPhone && o.customerPhone === phone);

          if (!isMatch) return o;

          return {
            ...o,
            customerRating: newRating,
            customerStats: {
              ...(o.customerStats || {
                deliveryRate: null,
                totalDelivered: 0,
                totalOrdersCount: 0,
                customerRating: newRating,
              }),
              customerRating: newRating,
            },
          };
        });
      });
    },
    [setOrders],
  );

  return {
    handleUpdateOrderItems,
    handleUpdateCustomer,
    handleUpdateRating,
  };
};
