import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
import { OrderDetailsType } from "../types";
import {
  isCancellationStatus,
  parseOrderDetailsResponse,
  buildInitialEditForm,
} from "./orderDetailsParser";
import { useOrderDetailsNotes } from "./useOrderDetailsNotes";
import { useOrderDetailsLookups } from "./useOrderDetailsLookups";
import { useOrderDetailsSave } from "./useOrderDetailsSave";

export const useOrderDetails = (orderNumber: string | undefined) => {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const encodedOrderNumber = orderNumber
    ? encodeURIComponent(String(orderNumber))
    : "";

  // Data State
  const [order, setOrder] = useState<OrderDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Notes Hook
  const {
    orderNotes,
    setOrderNotes,
    addingNote,
    updatingNote,
    deletingNote,
    addNote,
    updateNote,
    deleteNote,
  } = useOrderDetailsNotes({ encodedOrderNumber });

  // Save & Edit Form Hook
  const saveOps = useOrderDetailsSave({
    order,
    orderNumber,
    encodedOrderNumber,
    fetchOrderDetails: async () => {
      await fetchOrderDetails();
    },
    setUpdating,
  });

  const {
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    saveChanges,
    handleDiscountApproval,
  } = saveOps;

  // Lookups & Workflow Hook
  const lookupsOps = useOrderDetailsLookups({
    order,
    isEditing,
    authLoading,
    isAuthenticated,
    onGovernmentSelect: (govName: string) => {
      setEditForm((prev) => ({ ...prev, governorate: govName, city: "" }));
    },
  });

  const {
    allowedTransitions,
    workflowStatusDefs,
    orderStatuses,
    paymentStatuses,
    governments,
    areas,
    loadingGovernments,
    loadingAreas,
    selectedGovernmentId,
    setSelectedGovernmentId,
    fetchOrderStatuses,
    fetchPaymentStatuses,
    fetchAllowedTransitions,
    handleGovernmentChange,
  } = lookupsOps;

  // Fetch Order Details
  const fetchOrderDetails = useCallback(async () => {
    if (!orderNumber) return;
    try {
      setLoading(true);
      let response;
      let data;

      try {
        response = await apiClient.get(
          `/orders-new/simple/${encodedOrderNumber}`,
        );
        data = response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          try {
            response = await apiClient.get(
              `/orders-enhanced/${encodedOrderNumber}`,
            );
            data = response.data;
          } catch {
            throw error;
          }
        } else {
          throw error;
        }
      }

      if (data.success) {
        const simpleOrder = data.data;
        const wasViewed = Boolean(simpleOrder.isViewed);

        if (!wasViewed) {
          try {
            await apiClient.post(`/orders-new/simple/${encodedOrderNumber}/viewed`);
          } catch (e) {
            console.error("Failed to mark order as viewed:", e);
          }
        }

        const shippingAddr =
          typeof simpleOrder.shippingAddress === "string"
            ? (() => {
                try {
                  return JSON.parse(simpleOrder.shippingAddress);
                } catch {
                  return {};
                }
              })()
            : simpleOrder.shippingAddress || {};

        const enhancedOrder = parseOrderDetailsResponse(simpleOrder);

        setOrder(enhancedOrder);
        setOrderNotes(enhancedOrder.orderNotes || []);

        fetchAllowedTransitions(enhancedOrder.status);

        // Initialize Edit Form
        setEditForm(buildInitialEditForm(enhancedOrder, shippingAddr));
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      tToast.error("orderDetails.failed_load_1612");
    } finally {
      setLoading(false);
    }
  }, [orderNumber, encodedOrderNumber, fetchAllowedTransitions, setOrderNotes, setEditForm]);

  useEffect(() => {
    if (!orderNumber || authLoading || !isAuthenticated) return;
    fetchOrderDetails();
    fetchOrderStatuses();
    fetchPaymentStatuses();
  }, [orderNumber, authLoading, isAuthenticated, fetchOrderDetails]);

  // Actions
  const updateStatus = async (newStatus: string, notes: string, isOverride: boolean = false) => {
    const normalizedStatus = String(newStatus || "").trim().toUpperCase();
    const trimmedNotes = String(notes || "").trim();

    if (isCancellationStatus(normalizedStatus) && !trimmedNotes) {
      tToast.error("orderDetails.msg_2c62");
      return false;
    }

    try {
      setUpdating(true);
      const response = await apiClient.post(
        `/orders-new/simple/${encodedOrderNumber}/status`,
        {
          status: normalizedStatus,
          notes: trimmedNotes,
          isOverride,
        },
      );
      if (response.data.success) {
        if (response.data.data?.workflowStatus === "pending") {
          toast.success(
            response.data.message || i18n.t("orderDetails.msg_911a"),
          );
          return true;
        }

        await fetchOrderDetails();
        await fetchAllowedTransitions(normalizedStatus);
        toast.success(response.data.message || i18n.t("orderDetails.success_update_status_5c48"));
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل تحديث الحالة");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updatePaymentStatus = async (
    newPaymentStatus: string,
    notes: string,
  ) => {
    if (order?.metadata?.isGuestOrder) {
      tToast.error("orderDetails.msg_ce95");
      return false;
    }

    try {
      setUpdating(true);
      const response = await apiClient.post(
        `/orders-new/simple/${encodedOrderNumber}/payment-status`,
        {
          paymentStatus: newPaymentStatus.toUpperCase(),
          notes: notes,
        },
      );
      if (response.data.success) {
        setOrder((prev) =>
          prev
            ? { ...prev, paymentStatus: newPaymentStatus.toUpperCase() as any }
            : null,
        );
        tToast.success("orderDetails.success_update_status_4792");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل تحديث حالة الدفع");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const verifyWalletProof = async (action: "VERIFY" | "REJECT", rejectReason?: string) => {
    if (!order?.walletPaymentProof && !order?.metadata?.walletPaymentProof) return false;
    try {
      setUpdating(true);
      const response = await apiClient.post(
        `/orders-new/simple/${encodedOrderNumber}/wallet-proof/verify`,
        { action, ...(rejectReason ? { rejectReason } : {}) },
      );
      if (response.data.success) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                walletPaymentProof: response.data.data?.walletPaymentProof || prev.walletPaymentProof,
                paymentStatus:
                  action === "VERIFY"
                    ? ("COMPLETED" as any)
                    : prev.paymentStatus,
              }
            : null,
        );
        toast.success(response.data.message || "تم تحديث إثبات الدفع");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "فشل التحقق من إثبات الدفع");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    order,
    setOrder,
    loading,
    updating,
    addingNote,
    updatingNote,
    deletingNote,
    // Workflow
    allowedTransitions,
    workflowStatusDefs,
    // Lookups
    orderStatuses,
    paymentStatuses,
    governments,
    areas,
    loadingGovernments,
    loadingAreas,
    // Forms
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    selectedGovernmentId,
    setSelectedGovernmentId,
    orderNotes,
    // Actions
    fetchOrderDetails,
    handleGovernmentChange,
    updateStatus,
    updatePaymentStatus,
    verifyWalletProof,
    handleDiscountApproval,
    addNote,
    updateNote,
    deleteNote,
    saveChanges,
  };
};
