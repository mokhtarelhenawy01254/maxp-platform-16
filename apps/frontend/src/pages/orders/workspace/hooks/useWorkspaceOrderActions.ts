import React, { useState, useCallback } from "react";
import type { TFunction } from "i18next";
import { apiClient } from "../../../../services/apiClient";
import { toast } from "sonner";
import { extractApiErrorMessage } from "../apiError";
import type {
  OrderAction,
  WorkspaceOrder,
  WorkspaceOrderItem,
} from "../types";
import { useWorkspaceOrderMutations } from "./useWorkspaceOrderMutations";

export interface UseWorkspaceOrderActionsParams {
  ordersRef: React.MutableRefObject<WorkspaceOrder[]>;
  selectedOrderIdRef: React.MutableRefObject<string | null>;
  isManager: boolean;
  isArabic: boolean;
  t: TFunction;
  setOrders: React.Dispatch<React.SetStateAction<WorkspaceOrder[]>>;
  setSelectedOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  fetchOrders: (options?: { silent?: boolean }) => Promise<void>;
  fetchTeamWorkload: () => Promise<void>;
}

export interface UseWorkspaceOrderActionsReturn {
  busyOrders: Record<string, OrderAction>;
  cancellingOrder: WorkspaceOrder | null;
  setCancellingOrder: React.Dispatch<React.SetStateAction<WorkspaceOrder | null>>;
  cancelReasonText: string;
  setCancelReasonText: React.Dispatch<React.SetStateAction<string>>;
  followUpOrder: WorkspaceOrder | null;
  setFollowUpOrder: React.Dispatch<React.SetStateAction<WorkspaceOrder | null>>;
  followUpDateValue: string;
  setFollowUpDateValue: React.Dispatch<React.SetStateAction<string>>;
  advanceToNextOrder: (currentId: string) => void;
  confirmCancelOrder: () => Promise<void>;
  handleSaveFollowUp: () => Promise<void>;
  handleQuickAction: (
    order: WorkspaceOrder,
    action: Extract<OrderAction, "confirm" | "cancel">,
    explicitNotes?: string,
  ) => Promise<void>;
  handleLogCall: (
    order: WorkspaceOrder,
    result?: string,
    explicitNotes?: string,
  ) => Promise<void>;
  handleConvertIncomplete: (cartId: string) => Promise<void>;
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

export const useWorkspaceOrderActions = ({
  ordersRef,
  selectedOrderIdRef,
  isManager,
  isArabic,
  t,
  setOrders,
  setSelectedOrderId,
  fetchOrders,
  fetchTeamWorkload,
}: UseWorkspaceOrderActionsParams): UseWorkspaceOrderActionsReturn => {
  const [busyOrders, setBusyOrders] = useState<Record<string, OrderAction>>({});
  const [cancellingOrder, setCancellingOrder] = useState<WorkspaceOrder | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [followUpOrder, setFollowUpOrder] = useState<WorkspaceOrder | null>(null);
  const [followUpDateValue, setFollowUpDateValue] = useState("");

  const {
    handleUpdateOrderItems,
    handleUpdateCustomer,
    handleUpdateRating,
  } = useWorkspaceOrderMutations({
    isArabic,
    setOrders,
  });

  const setOrderBusyState = useCallback((orderId: string, action: OrderAction | null) => {
    setBusyOrders((current) => {
      const next = { ...current };
      if (action) {
        next[orderId] = action;
      } else {
        delete next[orderId];
      }
      return next;
    });
  }, []);

  const advanceToNextOrder = useCallback(
    (currentId: string) => {
      setOrders((current) => {
        const remaining = current.filter((o) => o.id !== currentId);
        if (remaining.length > 0) {
          setSelectedOrderId(remaining[0].id);
        } else {
          setSelectedOrderId(null);
        }
        return remaining;
      });
    },
    [setOrders, setSelectedOrderId],
  );

  const handleConvertIncomplete = useCallback(
    async (cartId: string) => {
      const prevOrders = [...ordersRef.current];
      const prevSelectedId = selectedOrderIdRef.current;
      advanceToNextOrder(cartId);
      try {
        setOrderBusyState(cartId, "confirm");
        const response = await apiClient.post(`/orders-new/incomplete/${cartId}/convert`);
        if (response.data?.success) {
          toast.success(
            isArabic
              ? "تم استرجاع وتحويل السلة بنجاح إلى طلب مؤكد!"
              : "Cart recovered and converted to order!",
          );
          await Promise.all([
            fetchOrders({ silent: true }),
            isManager ? fetchTeamWorkload() : Promise.resolve(),
          ]);
        } else {
          setOrders(prevOrders);
          setSelectedOrderId(prevSelectedId);
          toast.error(
            extractApiErrorMessage(response.data) ||
              (isArabic ? "فشل تحويل السلة المتروكة" : "Failed to convert cart"),
          );
        }
      } catch (err) {
        setOrders(prevOrders);
        setSelectedOrderId(prevSelectedId);
        toast.error(
          extractApiErrorMessage(err) ||
            (isArabic ? "فشل تحويل السلة المتروكة" : "Failed to convert cart"),
        );
      } finally {
        setOrderBusyState(cartId, null);
      }
    },
    [ordersRef, selectedOrderIdRef, advanceToNextOrder, setOrderBusyState, isArabic, fetchOrders, isManager, fetchTeamWorkload, setOrders, setSelectedOrderId],
  );

  const handleQuickAction = useCallback(
    async (
      order: WorkspaceOrder,
      action: Extract<OrderAction, "confirm" | "cancel">,
      explicitNotes?: string,
    ) => {
      if (order.isIncomplete) {
        if (action === "confirm") {
          await handleConvertIncomplete(order.cartId || order.id);
          return;
        }
        if (action === "cancel") {
          const reason = (explicitNotes ?? "").trim();
          if (!reason) {
            toast.error(t("orders.cancellationReasonRequired"));
            return;
          }

          const prevOrders = [...ordersRef.current];
          const prevSelectedId = selectedOrderIdRef.current;
          advanceToNextOrder(order.id);
          setOrderBusyState(order.id, "cancel");
          try {
            const response = await apiClient.post(
              `/orders-new/incomplete/${order.cartId || order.id}/dismiss`,
              { reason },
            );
            if (response.data?.success) {
              toast.success(isArabic ? "تم استبعاد السلة المتروكة" : "Incomplete cart dismissed");
              await fetchOrders({ silent: true });
            } else {
              setOrders(prevOrders);
              setSelectedOrderId(prevSelectedId);
              toast.error(
                extractApiErrorMessage(response.data) ||
                  (isArabic ? "فشل استبعاد السلة المتروكة" : "Failed to dismiss cart"),
              );
            }
          } catch (error) {
            setOrders(prevOrders);
            setSelectedOrderId(prevSelectedId);
            toast.error(
              extractApiErrorMessage(error) ||
                (isArabic ? "فشل استبعاد السلة المتروكة" : "Failed to dismiss cart"),
            );
          } finally {
            setOrderBusyState(order.id, null);
          }
          return;
        }
      }

      let actionNotes = t("orders.confirmNote");

      if (action === "cancel") {
        const reason = (explicitNotes ?? "").trim();
        if (!reason) {
          toast.error(t("orders.cancellationReasonRequired"));
          return;
        }
        actionNotes = reason;
      }

      const prevOrders = [...ordersRef.current];
      const prevSelectedId = selectedOrderIdRef.current;
      advanceToNextOrder(order.id);
      setOrderBusyState(order.id, action);

      try {
        const response = await apiClient.post(
          `/agent-workspace/orders/${order.id}/quick-action`,
          {
            action,
            notes: actionNotes,
          },
        );

        if ((response.data as any)?.success) {
          const workflowPending =
            (response.data as any)?.data?.workflowStatus === "pending";
          if (workflowPending) {
            setOrders(prevOrders);
            setSelectedOrderId(prevSelectedId);
            toast.info(t("orders.workspacePendingApproval"));
            await fetchOrders({ silent: true });
          } else {
            const messages: Record<string, string> = {
              confirm: t("orders.orderConfirmed"),
              cancel: t("orders.orderCancelled"),
            };
            toast.success(messages[action] || t("orders.actionSuccess"));
            await Promise.all([
              fetchOrders({ silent: true }),
              isManager ? fetchTeamWorkload() : Promise.resolve(),
            ]);
          }
        } else {
          setOrders(prevOrders);
          setSelectedOrderId(prevSelectedId);
          toast.error(extractApiErrorMessage(response.data) || t("orders.actionFailed"));
        }
      } catch (error) {
        setOrders(prevOrders);
        setSelectedOrderId(prevSelectedId);
        toast.error(extractApiErrorMessage(error) || t("orders.actionFailed"));
      } finally {
        setOrderBusyState(order.id, null);
      }
    },
    [handleConvertIncomplete, t, ordersRef, selectedOrderIdRef, advanceToNextOrder, setOrderBusyState, isArabic, fetchOrders, setOrders, setSelectedOrderId, isManager, fetchTeamWorkload],
  );

  const handleLogCall = useCallback(
    async (
      order: WorkspaceOrder,
      result: string = "unreached",
      explicitNotes?: string,
    ) => {
      const prevOrders = [...ordersRef.current];
      const prevSelectedId = selectedOrderIdRef.current;
      advanceToNextOrder(order.id);
      setOrderBusyState(order.id, "log-call");

      try {
        const response = await apiClient.post(
          `/agent-workspace/orders/${order.id}/log-call`,
          {
            result,
            notes: explicitNotes || t("orders.callAttemptNote"),
          },
        );

        if ((response.data as any)?.success) {
          toast.success(t("orders.callLogged"));
          await fetchOrders({ silent: true });
        } else {
          setOrders(prevOrders);
          setSelectedOrderId(prevSelectedId);
          toast.error(extractApiErrorMessage(response.data) || t("orders.logCallFailed"));
        }
      } catch (error) {
        setOrders(prevOrders);
        setSelectedOrderId(prevSelectedId);
        toast.error(extractApiErrorMessage(error) || t("orders.logCallFailed"));
      } finally {
        setOrderBusyState(order.id, null);
      }
    },
    [ordersRef, selectedOrderIdRef, advanceToNextOrder, setOrderBusyState, t, fetchOrders, setOrders, setSelectedOrderId],
  );

  const confirmCancelOrder = useCallback(async () => {
    if (!cancellingOrder) return;
    const reason = cancelReasonText.trim();
    if (!reason) {
      toast.error(t("orders.cancellationReasonRequired"));
      return;
    }

    try {
      await handleQuickAction(cancellingOrder, "cancel", reason);
    } finally {
      setCancellingOrder(null);
      setCancelReasonText("");
    }
  }, [cancellingOrder, cancelReasonText, t, handleQuickAction]);

  const handleSaveFollowUp = useCallback(async () => {
    if (!followUpOrder) return;

    if (!followUpDateValue) {
      toast.error(t("orders.followUpDateLabel"));
      return;
    }

    const prevOrders = [...ordersRef.current];
    const prevSelectedId = selectedOrderIdRef.current;
    advanceToNextOrder(followUpOrder.id);
    setOrderBusyState(followUpOrder.id, "follow-up");

    try {
      const response = await apiClient.post(
        `/agent-workspace/orders/${followUpOrder.id}/follow-up`,
        {
          followUpDate: new Date(followUpDateValue).toISOString(),
        },
      );

      if ((response.data as any)?.success) {
        toast.success(t("orders.followUpScheduled"));
        setFollowUpOrder(null);
        setFollowUpDateValue("");
        await fetchOrders({ silent: true });
      } else {
        setOrders(prevOrders);
        setSelectedOrderId(prevSelectedId);
        toast.error(extractApiErrorMessage(response.data) || t("orders.actionFailed"));
      }
    } catch (error) {
      setOrders(prevOrders);
      setSelectedOrderId(prevSelectedId);
      toast.error(extractApiErrorMessage(error) || t("orders.actionFailed"));
    } finally {
      setOrderBusyState(followUpOrder.id, null);
    }
  }, [followUpOrder, followUpDateValue, t, ordersRef, selectedOrderIdRef, advanceToNextOrder, setOrderBusyState, fetchOrders, setOrders, setSelectedOrderId]);

  return {
    busyOrders,
    cancellingOrder,
    setCancellingOrder,
    cancelReasonText,
    setCancelReasonText,
    followUpOrder,
    setFollowUpOrder,
    followUpDateValue,
    setFollowUpDateValue,
    advanceToNextOrder,
    confirmCancelOrder,
    handleSaveFollowUp,
    handleQuickAction,
    handleLogCall,
    handleConvertIncomplete,
    handleUpdateOrderItems,
    handleUpdateCustomer,
    handleUpdateRating,
  };
};
