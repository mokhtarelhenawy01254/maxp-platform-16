import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import type { IncompleteConvertResponse, IncompleteOrder } from "../incompleteUtils";
import { getCustomerContact } from "../incompleteUtils";
import { exportIncompleteOrdersCsv } from "./exportIncompleteOrdersCsv";

export interface UseIncompleteOrdersActionsProps {
  orders: IncompleteOrder[];
  setOrders: React.Dispatch<React.SetStateAction<IncompleteOrder[]>>;
  buildParams: (overrides?: Record<string, string | number>) => URLSearchParams;
  handleRetry: () => void;
}

export function useIncompleteOrdersActions({
  orders,
  setOrders,
  buildParams,
  handleRetry,
}: UseIncompleteOrdersActionsProps) {
  const { t } = useTranslation();

  const [confirmConvertCartId, setConfirmConvertCartId] = useState<string | null>(null);
  const [convertingCartId, setConvertingCartId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [contactCartId, setContactCartId] = useState<string | null>(null);
  const [contactMethod, setContactMethod] = useState("call");
  const [contactResult, setContactResult] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState<IncompleteOrder | null>(null);

  const handleCopyCartId = async (cartId: string) => {
    if (!cartId) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cartId);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = cartId;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      toast.success(t("orders.incompleteCopied"));
    } catch {
      toast.error(t("orders.incompleteCopyFailed"));
    }
  };

  const handleConvert = async (cartId: string) => {
    if (!cartId) return;
    setConvertingCartId(cartId);
    try {
      const response = await apiClient.post<IncompleteConvertResponse>(
        `/orders-new/incomplete/${encodeURIComponent(cartId)}/convert`
      );
      const data = response.data;
      if (data?.success) {
        toast.success(t("orders.incompleteConvertSuccess"));
        if (data?.conversionLogFailed) {
          toast.warning(t("orders.incompleteConvertLogFailed"), { duration: 8000 });
        }
        setConfirmConvertCartId(null);
        handleRetry();
      } else {
        toast.error(data?.message || t("orders.incompleteConvertFailed"));
      }
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData?.code === "EXISTING_CUSTOMER_ORDER") {
        const proceed = window.confirm(
          `${respData.message}\n\nهل تريد بالتأكيد إنشاء طلب إضافي لهذا العميل؟`
        );
        if (proceed) {
          try {
            const forceRes = await apiClient.post<IncompleteConvertResponse>(
              `/orders-new/incomplete/${encodeURIComponent(cartId)}/convert`,
              { force: true }
            );
            if (forceRes.data?.success) {
              toast.success(t("orders.incompleteConvertSuccess"));
              if (forceRes.data?.conversionLogFailed) {
                toast.warning(t("orders.incompleteConvertLogFailed"), {
                  duration: 8000,
                });
              }
              setConfirmConvertCartId(null);
              handleRetry();
              return;
            }
          } catch (forceErr: any) {
            toast.error(
              forceErr?.response?.data?.message ||
                forceErr?.message ||
                t("orders.incompleteConvertFailed")
            );
            return;
          }
        } else {
          return;
        }
      }
      const apiError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        apiError.response?.data?.message ||
          apiError.message ||
          t("orders.incompleteConvertFailed")
      );
    } finally {
      setConvertingCartId(null);
    }
  };

  const openContactModal = (cartId: string) => {
    setContactCartId(cartId);
    setContactMethod("call");
    setContactResult("");
    setContactNote("");
  };

  const handleSaveContact = async () => {
    if (!contactCartId) return;
    setSavingContact(true);
    try {
      const isCancelled = contactResult === "cancelled";
      const response = await apiClient.post<{
        success: boolean;
        message?: string;
      }>(
        `/orders-new/incomplete/${encodeURIComponent(contactCartId)}/contact`,
        {
          method: contactMethod,
          result: contactResult,
          note: contactNote,
          dismissCart: isCancelled,
        }
      );
      if (response.data?.success) {
        toast.success(
          isCancelled
            ? t("orders.incompleteCancelSuccess")
            : t("orders.incompleteContactLogged")
        );
        const savedCartId = contactCartId;
        setContactCartId(null);
        if (isCancelled) {
          setOrders((prev) => prev.filter((o) => o.cartId !== savedCartId));
          handleRetry();
        }
      } else {
        toast.error(
          response.data?.message || t("orders.incompleteContactFailed")
        );
      }
    } catch (err: any) {
      const apiError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        apiError.response?.data?.message ||
          apiError.message ||
          t("orders.incompleteContactFailed")
      );
    } finally {
      setSavingContact(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportIncompleteOrdersCsv(buildParams, t);
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmConvert = (cartId: string) => {
    const targetOrder = orders.find((o) => o.cartId === cartId);
    const phone = targetOrder
      ? getCustomerContact(targetOrder.checkoutData)?.phone
      : null;
    if (phone) {
      setConfirmConvertCartId(cartId);
    } else {
      toast.error(t("orders.incompleteConvertNoPhone"));
    }
  };

  return {
    confirmConvertCartId,
    setConfirmConvertCartId,
    convertingCartId,
    exporting,
    contactCartId,
    setContactCartId,
    contactMethod,
    setContactMethod,
    contactResult,
    setContactResult,
    contactNote,
    setContactNote,
    savingContact,
    cancelModalOpen,
    setCancelModalOpen,
    selectedCancelOrder,
    setSelectedCancelOrder,
    handleCopyCartId,
    handleConvert,
    openContactModal,
    handleSaveContact,
    handleExport,
    handleConfirmConvert,
  };
}
