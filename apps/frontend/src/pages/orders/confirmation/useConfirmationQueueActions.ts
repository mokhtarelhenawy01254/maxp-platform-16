import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useInvoiceSettings } from "../../../hooks/useInvoiceSettings";
import { printSingleShippingLabel } from "../../../utils/printShippingLabel";
import orderConfirmationService from "../../../services/orderConfirmationService";
import api from "../../../services/api";
import type { ConfirmationOrder } from "./types";

export interface UseConfirmationQueueActionsProps {
  orders: ConfirmationOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ConfirmationOrder[]>>;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

export function useConfirmationQueueActions({
  orders,
  setOrders,
  setRefreshKey,
}: UseConfirmationQueueActionsProps) {
  const { t } = useTranslation();
  const { settings: invoiceSettings } = useInvoiceSettings();

  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkUserId, setBulkUserId] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<ConfirmationOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [postponeTarget, setPostponeTarget] = useState<ConfirmationOrder | null>(null);
  const [postponeLoading, setPostponeLoading] = useState(false);

  const handleConfirm = useCallback(async (orderId: string) => {
    try {
      const res = await orderConfirmationService.confirmOrder(orderId);
      if (res?.data?.status === "pending") {
        toast(t("orders.orderSentForApproval", { defaultValue: "تم إرسال الطلب للموافقة" }));
      } else {
        toast.success(t("orders.orderConfirmed", { defaultValue: "تم تأكيد الطلب بنجاح" }));
      }
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t("orders.failedToConfirmOrder", { defaultValue: "فشل تأكيد الطلب" }));
    }
  }, [setRefreshKey, t]);

  const handlePrintSlip = useCallback(async (order: ConfirmationOrder) => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("تم حظر النافذة المنبثقة، يرجى السماح بالنوافذ المنبثقة للطباعة");
        return;
      }
      await printSingleShippingLabel({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          customerAddress: order.customerAddress || order.shippingAddress || "",
          city: order.city || "",
          governorate: order.governorate || "",
          status: order.status,
          paymentStatus: (order.paymentStatus as any) || "PENDING",
          paymentMethod: order.paymentMethod || "CASH",
          total: order.total,
          shipping: order.shipping || 0,
          subtotal: order.subtotal || order.total,
          discount: order.discount || 0,
          notes: order.notes || "",
          createdAt: order.createdAt,
          items: (order.items || []).map((it) => ({
            id: it.id,
            productId: it.productId,
            name: it.productName || it.name,
            productName: it.productName || it.name,
            quantity: it.quantity,
            price: it.price,
            total: it.total,
            color: it.color,
            size: it.size,
            sku: it.sku || undefined,
          })),
        },
        labelType: "preparation_slip",
        settings: invoiceSettings,
        printWindow,
      });
    } catch (err: any) {
      toast.error(err?.message || "فشلت الطباعة");
    }
  }, [invoiceSettings]);

  const handlePrintInvoice = useCallback(async (order: ConfirmationOrder) => {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("تم حظر النافذة المنبثقة، يرجى السماح بالنوافذ المنبثقة للطباعة");
        return;
      }
      await printSingleShippingLabel({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          customerAddress: order.customerAddress || order.shippingAddress || "",
          city: order.city || "",
          governorate: order.governorate || "",
          status: order.status,
          paymentStatus: (order.paymentStatus as any) || "PENDING",
          paymentMethod: order.paymentMethod || "CASH",
          total: order.total,
          shipping: order.shipping || 0,
          subtotal: order.subtotal || order.total,
          discount: order.discount || 0,
          notes: order.notes || "",
          createdAt: order.createdAt,
          items: (order.items || []).map((it) => ({
            id: it.id,
            productId: it.productId,
            name: it.productName || it.name,
            productName: it.productName || it.name,
            quantity: it.quantity,
            price: it.price,
            total: it.total,
            color: it.color,
            size: it.size,
            sku: it.sku || undefined,
          })),
        },
        labelType: "invoice",
        settings: invoiceSettings,
        printWindow,
      });
    } catch (err: any) {
      toast.error(err?.message || "فشلت الطباعة");
    }
  }, [invoiceSettings]);

  const handleCancel = useCallback(async (order: ConfirmationOrder) => {
    setCancelReason("");
    setCancelTarget(order);
  }, []);

  const submitCancel = useCallback(async () => {
    const order = cancelTarget;
    if (!order) return;

    const notes = cancelReason.trim();
    if (!notes) {
      toast.error(t("orders.cancellationReasonRequired", { defaultValue: "سبب الإلغاء مطلوب" }));
      return;
    }

    try {
      setCancellingId(order.id);
      await orderConfirmationService.cancelOrder(order.id, {
        type: order.isGuestOrder ? "GUEST" : "REGULAR",
        notes,
      });
      toast.success(t("orders.orderCancelled", { defaultValue: "تم إلغاء الطلب بنجاح" }));
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t("orders.cancelFailedToast", { defaultValue: "فشل إلغاء الطلب" }));
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
      setCancelReason("");
    }
  }, [cancelTarget, cancelReason, setRefreshKey, t]);

  const handleLogCall = useCallback(async (order: ConfirmationOrder, result = "unreached") => {
    try {
      setCallingId(order.id);
      const res = await orderConfirmationService.logCall(order.id, result, null);
      const attempts = res?.data?.callAttempts ?? order.callAttempts;
      toast.success(t("orders.callLogged", { defaultValue: "تم تسجيل محاولة الاتصال" }));
      setOrders((prev) => prev.map((o) =>
        o.id === order.id
          ? { ...o, callAttempts: attempts, lastCallAttemptAt: res?.data?.order?.lastCallAttemptAt || res?.data?.order?.lastCallAt || o.lastCallAttemptAt }
          : o,
      ));
    } catch (error: any) {
      toast.error(error?.message || t("orders.logCallFailed", { defaultValue: "تعذر تسجيل محاولة الاتصال" }));
      setRefreshKey((prev) => prev + 1);
    } finally {
      setCallingId(null);
    }
  }, [setOrders, setRefreshKey, t]);

  const handlePostpone = useCallback(async (data: { scheduledDeliveryDate: string; scheduledNotes: string; autoTransitionEnabled: boolean }) => {
    const order = postponeTarget;
    if (!order) return;
    try {
      setPostponeLoading(true);
      await api.post(`/orders-new/simple/${encodeURIComponent(order.orderNumber)}/schedule`, {
        scheduledDeliveryDate: data.scheduledDeliveryDate,
        scheduledNotes: data.scheduledNotes,
        autoTransitionEnabled: data.autoTransitionEnabled,
        changeStatusToScheduled: true,
      });
      toast.success(t("orders.orderPostponed", { defaultValue: "تم تأجيل الطلب" }));
      setPostponeTarget(null);
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t("orders.postponeFailed", { defaultValue: "تعذر تأجيل الطلب" }));
    } finally {
      setPostponeLoading(false);
    }
  }, [postponeTarget, setRefreshKey, t]);

  const handleAssign = useCallback(async (orderId: string, userId: string) => {
    if (!userId) {
      toast.error(t("orders.selectEmployeeFirst", { defaultValue: "يرجى اختيار الموظف أولاً" }));
      return;
    }
    try {
      setAssigningId(orderId);
      await orderConfirmationService.assignOrder(orderId, userId, null, "manual");
      toast.success(t("orders.orderAssigned", { defaultValue: "تم تخصيص الطلب بنجاح" }));
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t("orders.assignFailedToast", { defaultValue: "فشل تخصيص الطلب" }));
    } finally {
      setAssigningId(null);
    }
  }, [setRefreshKey, t]);

  const handleAssignChange = useCallback((orderId: string, value: string) => {
    setAssignSelections((prev) => ({
      ...prev,
      [orderId]: value,
    }));
  }, []);

  const handleToggleSelect = useCallback((orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedOrderIds((prev) => (prev.length === orders.length ? [] : orders.map((order) => order.id)));
  }, [orders]);

  const handleBulkConfirm = useCallback(async () => {
    if (!selectedOrderIds.length) {
      toast.error(t("orders.selectOrdersFirst", { defaultValue: "يرجى تحديد طلبات أولاً" }));
      return;
    }
    try {
      setBulkProcessing(true);
      const res = await orderConfirmationService.confirmOrders(selectedOrderIds);
      const summary = res?.data?.summary;
      if (summary) {
        const parts = [t("orders.confirmedOrders", { count: summary.confirmed, defaultValue: `تم تأكيد ${summary.confirmed} طلب` })];
        if (summary.pending) parts.push(t("orders.pendingApproval", { count: summary.pending, defaultValue: `قيد الموافقة: ${summary.pending}` }));
        if (summary.failed) parts.push(t("orders.confirmFailed", { count: summary.failed, defaultValue: `فشل: ${summary.failed}` }));
        toast.success(parts.join(", "));
      } else {
        toast.success(t("orders.ordersConfirmed", { defaultValue: "تم تأكيد الطلبات المحددة" }));
      }
      setSelectedOrderIds([]);
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t("orders.bulkConfirmFailed", { defaultValue: "فشل التأكيد الجماعي" }));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrderIds, setRefreshKey, t]);

  const handleBulkAssign = useCallback(async () => {
    if (!selectedOrderIds.length) {
      toast.error(t("orders.selectOrdersFirst", { defaultValue: "يرجى تحديد طلبات أولاً" }));
      return;
    }
    if (!bulkUserId) {
      toast.error(t("orders.selectEmployeeFirst", { defaultValue: "يرجى اختيار الموظف أولاً" }));
      return;
    }
    try {
      setBulkProcessing(true);
      const res = await orderConfirmationService.assignOrders(selectedOrderIds, bulkUserId, null, "manual");
      const summary = res?.data?.summary;
      if (summary) {
        const parts = [t("orders.assignedOrders", { count: summary.assigned, defaultValue: `تم تخصيص ${summary.assigned} طلب` })];
        if (summary.failed) parts.push(t("orders.assignFailed", { count: summary.failed, defaultValue: `فشل: ${summary.failed}` }));
        toast.success(parts.join(", "));
      } else {
        toast.success(t("orders.ordersAssigned", { defaultValue: "تم تخصيص الطلبات بنجاح" }));
      }
      setSelectedOrderIds([]);
      setBulkUserId("");
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || t("orders.bulkAssignFailed", { defaultValue: "فشل التخصيص الجماعي" }));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrderIds, bulkUserId, setRefreshKey, t]);

  return {
    assignSelections,
    assigningId,
    cancellingId,
    callingId,
    selectedOrderIds,
    setSelectedOrderIds,
    bulkUserId,
    setBulkUserId,
    bulkProcessing,
    cancelTarget,
    setCancelTarget,
    cancelReason,
    setCancelReason,
    postponeTarget,
    setPostponeTarget,
    postponeLoading,
    handleConfirm,
    handlePrintSlip,
    handlePrintInvoice,
    handleCancel,
    submitCancel,
    handleLogCall,
    handlePostpone,
    handleAssign,
    handleAssignChange,
    handleToggleSelect,
    handleToggleSelectAll,
    handleBulkConfirm,
    handleBulkAssign,
  };
}
