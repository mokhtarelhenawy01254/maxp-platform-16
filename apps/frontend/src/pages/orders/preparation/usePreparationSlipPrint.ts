import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  printSingleShippingLabel,
  toOrderDetailsType,
} from "../../../utils/printShippingLabel";
import { getApiErrorMessage } from "./helpers";
import type { PreparationOrder } from "./types";

export interface UsePreparationSlipPrintParams {
  orders: PreparationOrder[];
  user?: {
    company?: {
      name?: string;
      logo?: string | null;
    };
  } | null;
  invoiceSettings?: any;
  t: (key: string, options?: any) => string;
}

export interface UsePreparationSlipPrintReturn {
  printingOrderNumber: string | null;
  setPrintingOrderNumber: React.Dispatch<React.SetStateAction<string | null>>;
  handlePrintPreparationSlip: (orderNumber: string) => Promise<void>;
}

export function usePreparationSlipPrint({
  orders,
  user,
  invoiceSettings,
  t,
}: UsePreparationSlipPrintParams): UsePreparationSlipPrintReturn {
  const [printingOrderNumber, setPrintingOrderNumber] = useState<string | null>(null);

  const handlePrintPreparationSlip = useCallback(
    async (orderNumber: string) => {
      try {
        setPrintingOrderNumber(orderNumber);
        const order = orders.find((item) => item.orderNumber === orderNumber);
        if (!order) {
          toast.error(t("preparation.page.orderNotFound"));
          return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          toast.error(t("preparation.page.printWindowBlocked"));
          return;
        }

        await printSingleShippingLabel({
          order: toOrderDetailsType(order as any),
          companyName: user?.company?.name,
          companyLogoUrl: user?.company?.logo || null,
          printWindow,
          settings: invoiceSettings,
        });

        toast.success(t("preparation.page.slipOpened"));
      } catch (error: unknown) {
        console.error("Failed to print preparation slip:", error);
        toast.error(getApiErrorMessage(error) || t("preparation.page.slipFailed"));
      } finally {
        setPrintingOrderNumber(null);
      }
    },
    [orders, user?.company?.name, user?.company?.logo, invoiceSettings, t],
  );

  return {
    printingOrderNumber,
    setPrintingOrderNumber,
    handlePrintPreparationSlip,
  };
}
