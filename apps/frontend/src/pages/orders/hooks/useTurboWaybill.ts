import { useCallback } from "react";
import { toast } from "sonner";
import { config } from "../../../config";
import tokenManager from "../../../utils/tokenManager";
import i18n from "../../../i18n";

export interface UseTurboWaybillParams {
  order: any;
  setTurboLoading: (loading: boolean) => void;
}

export interface UseTurboWaybillReturn {
  getWaybill: (useLocalGeneration?: boolean) => Promise<boolean | null>;
  openPrintWindow: (htmlContent: string, title: string) => void;
}

export const useTurboWaybill = ({
  order,
  setTurboLoading,
}: UseTurboWaybillParams): UseTurboWaybillReturn => {
  const openPrintWindow = useCallback((htmlContent: string, title: string) => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      throw new Error(i18n.t("turbo.printWindowError"));
    }

    printWindow.document.write(htmlContent);
    printWindow.document.title = title;
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }, []);

  const getWaybill = useCallback(
    async (useLocalGeneration = false): Promise<boolean | null> => {
      if (!order?.id) return null;
      setTurboLoading(true);
      try {
        const orderIdentifier = order.orderNumber || order.id;
        const baseWaybillUrl = `${config.apiUrl}/turbo/orders/${orderIdentifier}/waybill`;
        const authToken = tokenManager.getAccessToken();
        const headers: Record<string, string> = {};

        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        toast.info(i18n.t("turbo.preparingWaybill"));

        if (!useLocalGeneration) {
          const pdfResponse = await fetch(baseWaybillUrl, {
            method: "GET",
            headers: {
              ...headers,
              Accept: "application/pdf",
            },
          });

          const contentType = pdfResponse.headers.get("content-type") || "";

          if (pdfResponse.ok && contentType.includes("application/pdf")) {
            const pdfBlob = await pdfResponse.blob();

            if (pdfBlob.size === 0) {
              throw new Error(i18n.t("turbo.waybillEmpty"));
            }

            const pdfUrl = window.URL.createObjectURL(pdfBlob);
            const pdfWindow = window.open(pdfUrl, "_blank");

            if (!pdfWindow) {
              const link = document.createElement("a");
              link.href = pdfUrl;
              link.download = `waybill-${orderIdentifier}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }

            setTimeout(() => {
              window.URL.revokeObjectURL(pdfUrl);
            }, 60_000);

            toast.success(i18n.t("turbo.waybillOpened"));
            return true;
          }
        }

        const htmlResponse = await fetch(`${baseWaybillUrl}?format=html`, {
          method: "GET",
          headers: {
            ...headers,
            Accept: "text/html",
          },
        });

        if (!htmlResponse.ok) {
          const errorText = await htmlResponse.text();

          try {
            const errorData = JSON.parse(errorText);
            throw new Error(
              errorData.error || errorData.message || i18n.t("turbo.waybillLoadFailed"),
            );
          } catch (_parseError) {
            throw new Error(errorText || i18n.t("turbo.waybillLoadFailed"));
          }
        }

        const htmlContent = await htmlResponse.text();
        openPrintWindow(htmlContent, `Turbo Waybill - ${orderIdentifier}`);
        toast.success(i18n.t("turbo.waybillPrintOpened"));
        return true;
      } catch (error: any) {
        console.error("❌ [WAYBILL] Error loading waybill:", error);
        toast.error(error.message || i18n.t("turbo.waybillFailed"));
        return null;
      } finally {
        setTurboLoading(false);
      }
    },
    [order?.id, order?.orderNumber, setTurboLoading, openPrintWindow],
  );

  return {
    getWaybill,
    openPrintWindow,
  };
};
