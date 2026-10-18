import { useMemo, useCallback } from "react";
import { printSingleShippingLabel } from "../../../utils/printShippingLabel";
import tokenManager from "../../../utils/tokenManager";
import type { OrderDetailsType } from "../types";

export interface UseOrderHeaderActionsParams {
  order: OrderDetailsType | null;
  user?: {
    company?: {
      name?: string;
      logo?: string | null;
    };
  } | null;
  invoiceSettings?: any;
  t: (key: string, options?: any) => string;
}

export interface UseOrderHeaderActionsReturn {
  handlePrintInvoice: () => Promise<void>;
  handlePrintPreparationSlip: () => Promise<void>;
  whatsappChatUrl: string | null;
}

export function useOrderHeaderActions({
  order,
  user,
  invoiceSettings,
  t,
}: UseOrderHeaderActionsParams): UseOrderHeaderActionsReturn {
  const whatsappChatUrl = useMemo(() => {
    const rawPhone = order?.customerPhone || order?.alternativePhone;
    if (!rawPhone) return null;
    let cleanPhone = String(rawPhone).replace(/\D/g, "");
    if (cleanPhone.startsWith("01") && cleanPhone.length === 11) {
      cleanPhone = "2" + cleanPhone;
    }
    const params = new URLSearchParams();
    params.set("phone", cleanPhone);
    if (order?.customerName) {
      params.set("name", order.customerName);
    }
    if (order?.orderNumber) {
      params.set("orderNumber", order.orderNumber);
    }
    if (order?.conversationId) {
      params.set("conversationId", order.conversationId);
    }
    return `/whatsapp?${params.toString()}`;
  }, [
    order?.customerPhone,
    order?.alternativePhone,
    order?.customerName,
    order?.orderNumber,
    order?.conversationId,
  ]);

  const handlePrintInvoice = useCallback(async () => {
    if (!order) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert(t("orderDetails.printWindowError"));
      return;
    }

    const printDirectInvoice = async () => {
      await printSingleShippingLabel({
        order,
        companyName: user?.company?.name,
        companyLogoUrl: user?.company?.logo || null,
        printWindow,
        settings: invoiceSettings,
      });
    };

    if (order.metadata?.isGuestOrder) {
      try {
        await printDirectInvoice();
      } catch (error: any) {
        console.error("Error printing guest order invoice:", error);
        alert(t("orderDetails.invoicePrintError", { error: error.message }));
      }
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/order-invoices/generate/${order.id}`,
        {
          method: "POST",
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (response.ok && result?.success && result?.data?.id) {
        printWindow.location.href = `/orders/invoice/${result.data.id}?print=true`;
        return;
      }

      console.warn("Falling back to direct invoice print:", result);
      await printDirectInvoice();
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      try {
        await printDirectInvoice();
      } catch (fallbackError: any) {
        console.error("Direct invoice print fallback failed:", fallbackError);
        alert(
          t("orderDetails.invoicePrintError", {
            error:
              fallbackError?.message ||
              error?.message ||
              t("orderDetails.invoicePrintFallbackError"),
          }),
        );
      }
    }
  }, [order, user?.company?.name, user?.company?.logo, invoiceSettings, t]);

  const handlePrintPreparationSlip = useCallback(async () => {
    if (!order) return;

    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error("فشل في فتح نافذة جديدة للطباعة");
      }
      await printSingleShippingLabel({
        order,
        companyName: user?.company?.name,
        companyLogoUrl: user?.company?.logo || null,
        printWindow,
        settings: invoiceSettings,
      });
    } catch (error: any) {
      console.error("Error generating preparation slip HTML:", error);
      alert(t("orderDetails.preparationSlipError", { error: error.message }));
    }
  }, [order, user?.company?.name, user?.company?.logo, invoiceSettings, t]);

  return {
    handlePrintInvoice,
    handlePrintPreparationSlip,
    whatsappChatUrl,
  };
}
