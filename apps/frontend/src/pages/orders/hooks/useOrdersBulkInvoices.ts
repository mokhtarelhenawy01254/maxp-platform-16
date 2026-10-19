import React, { useState, useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { TFunction } from "i18next";
import { apiClient } from "../../../services/apiClient";
import type { OrderDetailsType } from "../types";

export type GeneratedInvoice = {
  id: string;
  [key: string]: unknown;
};

export interface UseOrdersBulkInvoicesParams {
  selectedOrders: string[];
  setSelectedOrders: React.Dispatch<React.SetStateAction<string[]>>;
  user: any;
  navigate: NavigateFunction;
  t: TFunction;
}

export interface UseOrdersBulkInvoicesReturn {
  printingInvoices: boolean;
  selectedInvoice: GeneratedInvoice | null;
  setSelectedInvoice: React.Dispatch<React.SetStateAction<GeneratedInvoice | null>>;
  handleBulkPrintInvoices: () => Promise<void>;
}

export const useOrdersBulkInvoices = ({
  selectedOrders,
  setSelectedOrders,
  user,
  navigate,
  t,
}: UseOrdersBulkInvoicesParams): UseOrdersBulkInvoicesReturn => {
  const [printingInvoices, setPrintingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<GeneratedInvoice | null>(null);

  const handleBulkPrintInvoices = useCallback(async () => {
    if (selectedOrders.length === 0) {
      alert(t("orders.pleaseSelectOrders", { defaultValue: "يرجى اختيار الطلبات أولاً" }));
      return;
    }

    if (selectedOrders.length > 1) {
      if (
        !window.confirm(
          t("orders.confirmPrintInvoices", {
            count: selectedOrders.length,
            defaultValue: `هل تريد طباعة فواتير ${selectedOrders.length} طلب؟`,
          }),
        )
      ) {
        return;
      }

      try {
        setPrintingInvoices(true);
        const response = await apiClient.post("/order-invoices/bulk-generate", {
          orderIds: selectedOrders,
        });

        if (response.data.success) {
          const { success, existing, failed, invoices, guestOrders } = response.data.data;
          const invoiceList = (invoices as GeneratedInvoice[]) || [];
          const guestList = (guestOrders as Array<{ orderId: string; order: OrderDetailsType }>) || [];

          if (invoiceList.length === 0 && guestList.length === 0) {
            alert(t("orders.invoicePrintError", { defaultValue: "تعذر توليد الفواتير" }));
          } else {
            const params = new URLSearchParams();
            if (invoiceList.length > 0) {
              params.set("ids", invoiceList.map((inv) => inv.id).join(","));
            }
            if (guestList.length > 0) {
              const { storeGuestPrintPayload } = await import("../PrintMultipleInvoices");
              const guestKey = storeGuestPrintPayload({
                company: {
                  companyName: user?.company?.name || "",
                  companyPhone: user?.company?.phone || null,
                  companyLogo: user?.company?.logo || null,
                },
                orders: guestList.map((entry) => entry.order as unknown as Parameters<typeof storeGuestPrintPayload>[0]["orders"][number]),
              });
              params.set("guestKey", guestKey);
            }
            window.open(`/orders/invoices/print-multiple${params.toString() ? `?${params.toString()}` : ""}`, "_blank");
          }

          alert(
            t("orders.invoicesGenerated", {
              success: success.length,
              existing: existing.length,
              failed: failed.length,
              defaultValue: `تم توليد ${success.length} فاتورة جديدة`,
            }),
          );
          setSelectedOrders([]);
        }
      } catch (error: unknown) {
        console.error("Error bulk printing invoices:", error);
        alert(t("orders.invoicePrintError", { defaultValue: "تعذر طباعة الفواتير" }));
      } finally {
        setPrintingInvoices(false);
      }
    } else {
      try {
        setPrintingInvoices(true);
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          alert(t("orders.invoiceGenerationError", { defaultValue: "تعذر فتح نافذة الطباعة" }));
          return;
        }
        const response = await apiClient.post("/order-invoices/bulk-generate", {
          orderIds: selectedOrders,
        });

        if (response.data.success) {
          const data = response.data.data as {
            invoices?: GeneratedInvoice[];
            guestOrders?: Array<{ orderId: string; order: OrderDetailsType }>;
          };
          const { invoices, guestOrders } = data;

          if (invoices && invoices.length > 0) {
            printWindow.close();
            setSelectedInvoice(invoices[0]);
          } else if (guestOrders && guestOrders.length > 0) {
            printWindow.close();
            const { storeGuestPrintPayload } = await import("../PrintMultipleInvoices");
            const guestKey = storeGuestPrintPayload({
              company: {
                companyName: user?.company?.name || "",
                companyPhone: user?.company?.phone || null,
                companyLogo: user?.company?.logo || null,
              },
              orders: guestOrders.map((entry) => entry.order as unknown as Parameters<typeof storeGuestPrintPayload>[0]["orders"][number]),
            });
            navigate(`/orders/invoices/print-multiple?guestKey=${encodeURIComponent(guestKey)}`);
          } else {
            printWindow.close();
          }
        } else {
          printWindow.close();
        }
      } catch (error: unknown) {
        console.error("Error generating invoice:", error);
        alert(t("orders.invoiceGenerationError", { defaultValue: "تعذر توليد الفاتورة" }));
      } finally {
        setPrintingInvoices(false);
      }
    }
  }, [selectedOrders, t, user, navigate, setSelectedOrders]);

  return {
    printingInvoices,
    selectedInvoice,
    setSelectedInvoice,
    handleBulkPrintInvoices,
  };
};
