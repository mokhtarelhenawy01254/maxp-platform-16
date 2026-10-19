import React, { useState, useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { TFunction } from "i18next";
import { apiClient } from "../../../services/apiClient";
import {
  useOrdersBulkInvoices,
  type GeneratedInvoice,
} from "./useOrdersBulkInvoices";
import { useOrdersBulkShipments } from "./useOrdersBulkShipments";

export type { GeneratedInvoice };

export interface UseOrdersBulkOperationsParams {
  selectedOrders: string[];
  setSelectedOrders: React.Dispatch<React.SetStateAction<string[]>>;
  isTrashView: boolean;
  fetchOrders: () => Promise<void>;
  user: any;
  navigate: NavigateFunction;
  t: TFunction;
  getStatusDisplay: (status: string) => { label: string };
  normalizeStatusCode: (value: string | null | undefined) => string;
  isCancellationStatus: (value: string | null | undefined) => boolean;
  getApiErrorMessage: (error: unknown, fallbackMessage: string) => string;
}

export interface UseOrdersBulkOperationsReturn {
  bulkProcessing: boolean;
  printingInvoices: boolean;
  selectedInvoice: GeneratedInvoice | null;
  setSelectedInvoice: React.Dispatch<React.SetStateAction<GeneratedInvoice | null>>;
  handleBulkStatusUpdate: (newStatus: string) => Promise<void>;
  handleBulkDelete: () => Promise<void>;
  handleBulkPrintInvoices: () => Promise<void>;
  handleBulkCreateTurboShipments: () => Promise<void>;
  handleBulkCreateQpExpressShipments: () => Promise<void>;
  handleBulkCreateBostaShipments: () => Promise<void>;
}

export const useOrdersBulkOperations = ({
  selectedOrders,
  setSelectedOrders,
  isTrashView,
  fetchOrders,
  user,
  navigate,
  t,
  getStatusDisplay,
  normalizeStatusCode,
  isCancellationStatus,
  getApiErrorMessage,
}: UseOrdersBulkOperationsParams): UseOrdersBulkOperationsReturn => {
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const {
    printingInvoices,
    selectedInvoice,
    setSelectedInvoice,
    handleBulkPrintInvoices,
  } = useOrdersBulkInvoices({
    selectedOrders,
    setSelectedOrders,
    user,
    navigate,
    t,
  });

  const {
    handleBulkCreateTurboShipments,
    handleBulkCreateQpExpressShipments,
    handleBulkCreateBostaShipments,
  } = useOrdersBulkShipments({
    selectedOrders,
    setSelectedOrders,
    fetchOrders,
    setBulkProcessing,
    getApiErrorMessage,
    t,
  });

  const handleBulkStatusUpdate = useCallback(
    async (newStatus: string) => {
      if (!newStatus) return;
      const normalizedStatus = normalizeStatusCode(newStatus);
      let notes = "";

      if (isCancellationStatus(normalizedStatus)) {
        const cancellationReason = window.prompt(
          t("orders.cancellationReasonPrompt", { defaultValue: "سبب الإلغاء:" }),
        );
        if (cancellationReason === null) return;

        notes = cancellationReason.trim();
        if (!notes) {
          alert(t("orders.cancellationReasonRequired", { defaultValue: "سبب الإلغاء مطلوب" }));
          return;
        }
      }

      if (
        !window.confirm(
          t("orders.confirmBulkUpdate", {
            count: selectedOrders.length,
            status: getStatusDisplay(normalizedStatus).label,
            defaultValue: `هل أنت متأكد من تحديث ${selectedOrders.length} طلب إلى الحالة المختارة؟`,
          }),
        )
      ) {
        return;
      }

      try {
        setBulkProcessing(true);
        const response = await apiClient.post("/orders-new/bulk/status", {
          orderIds: selectedOrders,
          status: normalizedStatus,
          notes,
        });

        const data = response.data;
        const results = data.data?.results ?? [];
        const failedResults = results.filter((r: Record<string, unknown>) => !r.success);
        const failedCount = failedResults.length;
        const successCount = data.data?.successCount ?? 0;
        const totalRequested = data.data?.totalRequested ?? selectedOrders.length;

        if (successCount > 0) {
          if (failedCount === 0) {
            alert(t("orders.ordersUpdated", { defaultValue: "تم تحديث الطلبات بنجاح" }));
          } else {
            const errorSummary = failedResults
              .slice(0, 5)
              .map(
                (r: Record<string, unknown>) =>
                  `${t("orders.orderLabel", { defaultValue: "طلب" })} ${r.id}: ${r.error || t("orders.unknownError", { defaultValue: "خطأ غير معروف" })}`,
              )
              .join("\n");
            const moreText =
              failedCount > 5
                ? `\n${t("orders.moreErrors", { count: failedCount - 5, defaultValue: `و ${failedCount - 5} أخطاء أخرى` })}`
                : "";
            alert(
              `${t("orders.updatedOrdersSummary", {
                success: successCount,
                total: totalRequested,
                defaultValue: `تم تحديث ${successCount} من أصل ${totalRequested} بنجاح`,
              })}\n\n${t("orders.failedOrdersLabel", { defaultValue: "الطلبات المتعثرة:" })}:\n${errorSummary}${moreText}`,
            );
          }
          await fetchOrders();
          const failedIds: string[] = failedResults.map((r: Record<string, unknown>) => String(r.id));
          setSelectedOrders(failedIds.length > 0 ? failedIds : []);
        } else {
          const errors: string[] = failedResults.map((r: Record<string, unknown>) => String(r.error ?? ""));
          alert(errors.length > 0 ? errors.join("\n") : data.message || t("orders.updateFailed", { defaultValue: "فشل التحديث" }));
        }
      } catch (error: unknown) {
        console.error("Error bulk updating:", error);
        const errorMessage = getApiErrorMessage(
          error,
          t("orders.bulkUpdateError", { defaultValue: "خطأ أثناء التحديث الجماعي" }),
        );
        alert(t("orders.updateFailedMsg", { error: errorMessage, defaultValue: `فشل التحديث: ${errorMessage}` }));
      } finally {
        setBulkProcessing(false);
      }
    },
    [
      normalizeStatusCode,
      isCancellationStatus,
      selectedOrders,
      getStatusDisplay,
      t,
      fetchOrders,
      setSelectedOrders,
      getApiErrorMessage,
    ],
  );

  const handleBulkDelete = useCallback(async () => {
    const confirmKey = isTrashView
      ? "orders.confirmBulkPermanentDelete"
      : "orders.confirmBulkDelete";
    const successKey = isTrashView
      ? "orders.ordersPermanentlyDeleted"
      : "orders.ordersDeleted";
    const failedKey = isTrashView
      ? "orders.permanentDeleteFailed"
      : "orders.deleteFailed";
    const errorKey = isTrashView
      ? "orders.bulkPermanentDeleteError"
      : "orders.bulkDeleteError";
    const failedMessageKey = isTrashView
      ? "orders.permanentDeleteFailedMsg"
      : "orders.deleteFailedMsg";

    if (
      !window.confirm(
        t(confirmKey, {
          count: selectedOrders.length,
          defaultValue: `هل أنت متأكد من حذف ${selectedOrders.length} طلب؟`,
        }),
      )
    ) {
      return;
    }

    try {
      setBulkProcessing(true);
      const response = await apiClient.post("/orders-new/bulk/delete", {
        orderIds: selectedOrders,
        permanent: isTrashView,
      });

      const data = response.data;
      const results = data.data?.results ?? [];
      const failedResults = results.filter((r: Record<string, unknown>) => !r.success);
      const failedCount = failedResults.length;
      const successCount = data.data?.successCount ?? 0;
      const totalRequested = data.data?.totalRequested ?? selectedOrders.length;

      if (successCount > 0) {
        if (failedCount === 0) {
          alert(t(successKey, { defaultValue: "تم الحذف بنجاح" }));
        } else {
          const errorSummary = failedResults
            .slice(0, 5)
            .map(
              (r: Record<string, unknown>) =>
                `${t("orders.orderLabel", { defaultValue: "طلب" })} ${r.id}: ${r.error || t("orders.unknownError", { defaultValue: "خطأ غير معروف" })}`,
            )
            .join("\n");
          const moreText =
            failedCount > 5
              ? `\n${t("orders.moreErrors", { count: failedCount - 5, defaultValue: `و ${failedCount - 5} أخطاء أخرى` })}`
              : "";
          alert(
            `${t(isTrashView ? "orders.permanentDeletedOrdersSummary" : "orders.deletedOrdersSummary", {
              success: successCount,
              total: totalRequested,
              defaultValue: `تمت معالجة ${successCount} من ${totalRequested} بنجاح`,
            })}\n\n${t("orders.failedOrdersLabel", { defaultValue: "الطلبات التي تعذر حذفها:" })}:\n${errorSummary}${moreText}`,
          );
        }
        await fetchOrders();
        const failedIds: string[] = failedResults.map((r: Record<string, unknown>) => String(r.id));
        setSelectedOrders(failedIds.length > 0 ? failedIds : []);
      } else {
        const errors: string[] = failedResults.map((r: Record<string, unknown>) => String(r.error ?? ""));
        alert(errors.length > 0 ? errors.join("\n") : data.message || t(failedKey, { defaultValue: "تعذر الحذف" }));
      }
    } catch (error: unknown) {
      console.error("Error bulk deleting:", error);
      const errorMessage = getApiErrorMessage(
        error,
        t(errorKey, { defaultValue: "خطأ أثناء الحذف" }),
      );
      alert(t(failedMessageKey, { error: errorMessage, defaultValue: `تعذر الحذف: ${errorMessage}` }));
    } finally {
      setBulkProcessing(false);
    }
  }, [
    isTrashView,
    selectedOrders,
    t,
    fetchOrders,
    setSelectedOrders,
    getApiErrorMessage,
  ]);

  return {
    bulkProcessing,
    printingInvoices,
    selectedInvoice,
    setSelectedInvoice,
    handleBulkStatusUpdate,
    handleBulkDelete,
    handleBulkPrintInvoices,
    handleBulkCreateTurboShipments,
    handleBulkCreateQpExpressShipments,
    handleBulkCreateBostaShipments,
  };
};

export default useOrdersBulkOperations;
