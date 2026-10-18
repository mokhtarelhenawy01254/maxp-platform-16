import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { getApiErrorMessage } from "../../../utils/apiError";
import type { OrderDetailsType } from "../types";

export interface UsePreparationInvoicePrintingParams {
  selectedOrders: string[];
  navigate: (path: string) => void;
  user: any;
}

export function usePreparationInvoicePrinting({
  selectedOrders,
  navigate,
  user,
}: UsePreparationInvoicePrintingParams) {
  const { t } = useTranslation();
  const [printingInvoices, setPrintingInvoices] = useState(false);

  const handlePrintInvoices = useCallback(async () => {
    if (selectedOrders.length === 0) {
      toast.error(t("preparation.page.selectOrderFirst"));
      return;
    }

    try {
      setPrintingInvoices(true);
      const response = await apiClient.post("/order-invoices/bulk-generate", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const data = response.data.data || {};
        const invoices: Array<{ id: string }> = data.invoices || [];
        const guestOrders: Array<{ orderId: string; order: OrderDetailsType }> =
          data.guestOrders || [];
        const failed: Array<{ orderId: string; error?: string }> = data.failed || [];

        if (invoices.length === 0 && guestOrders.length === 0) {
          toast.error(t("preparation.page.invoiceNotFound"));
          return;
        }

        const params = new URLSearchParams();
        if (invoices.length > 0) {
          params.set("ids", invoices.map((inv) => inv.id).join(","));
        }
        if (guestOrders.length > 0) {
          const { storeGuestPrintPayload } = await import("../PrintMultipleInvoices");
          const guestKey = storeGuestPrintPayload({
            company: {
              companyName: user?.company?.name || "",
              companyPhone: user?.company?.phone || null,
              companyLogo: user?.company?.logo || null,
            },
            orders: guestOrders.map(
              (entry) =>
                entry.order as unknown as Parameters<
                  typeof storeGuestPrintPayload
                >[0]["orders"][number],
            ),
          });
          params.set("guestKey", guestKey);
        }
        const printUrl = `/orders/invoices/print-multiple${
          params.toString() ? `?${params.toString()}` : ""
        }`;
        navigate(printUrl);

        toast.success(
          t("preparation.page.bulkPrintSummary", {
            invoiceCount: invoices.length,
            guestCount: guestOrders.length,
          }),
        );
        if (failed.length > 0) {
          toast.warning(
            t("preparation.page.bulkPrintFailed", { failedCount: failed.length }),
          );
        }
      } else {
        toast.error(response.data?.message || t("preparation.page.invoicePrintFailed"));
      }
    } catch (error: unknown) {
      console.error("Failed to print invoices:", error);
      toast.error(getApiErrorMessage(error) || t("preparation.page.invoicePrintError"));
    } finally {
      setPrintingInvoices(false);
    }
  }, [navigate, selectedOrders, t, user]);

  return {
    printingInvoices,
    handlePrintInvoices,
  };
}
