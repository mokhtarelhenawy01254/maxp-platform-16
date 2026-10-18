import React, { useState, useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { TFunction } from "i18next";
import { apiClient } from "../../../services/apiClient";
import type { OrderDetailsType } from "../types";

export type GeneratedInvoice = {
  id: string;
  [key: string]: unknown;
};

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
  const [printingInvoices, setPrintingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<GeneratedInvoice | null>(null);

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

  const handleBulkCreateTurboShipments = useCallback(async () => {
    if (
      !window.confirm(
        t("orders.confirmTurboShipments", {
          count: selectedOrders.length,
          defaultValue: `هل تريد إرسال ${selectedOrders.length} طلب إلى تيربو؟`,
        }),
      )
    ) {
      return;
    }

    try {
      setBulkProcessing(true);
      const response = await apiClient.post("/turbo/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data.success) {
        const { success, failed, skipped } = response.data.data;
        let message = t("orders.shipmentsCreated", { success, defaultValue: `تم إنشاء ${success} شحنة بنجاح` });
        if (failed > 0) {
          message += `\n${t("orders.shipmentsFailed", { failed, defaultValue: `فشل: ${failed}` })}`;
        }
        if (skipped > 0) {
          message += `\n${t("orders.shipmentsSkipped", { skipped, defaultValue: `تم تخطيها: ${skipped}` })}`;
        }
        alert(message);
        setSelectedOrders([]);
        await fetchOrders();
      }
    } catch (error: unknown) {
      console.error("Error bulk creating shipments:", error);
      alert(getApiErrorMessage(error, t("orders.createShipmentsFailed", { defaultValue: "فشل إنشاء الشحنات لدى تيربو" })));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrders, t, fetchOrders, setSelectedOrders, getApiErrorMessage]);

  const handleBulkCreateQpExpressShipments = useCallback(async () => {
    if (
      !window.confirm(
        `هل تريد تأكيد إرسال ${selectedOrders.length} طلب إلى شركة كيو بي إكسبريس (QP Express) وتوليد البوالص آلياً؟`,
      )
    ) {
      return;
    }

    try {
      setBulkProcessing(true);
      const response: any = await apiClient.post("/qp-express/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const { success, failed, skipped } = response.data.data;
        let message = `تم إنشاء ${success} بوليصة شحن لدى QP Express بنجاح`;
        if (failed > 0) message += `\nفشل: ${failed}`;
        if (skipped > 0) message += `\nتم تخطيها (مشحونة مسبقاً): ${skipped}`;
        alert(message);
        setSelectedOrders([]);
        await fetchOrders();
      } else {
        alert(response.data?.error || "تعذر الشحن الجماعي لدى QP Express");
      }
    } catch (error: unknown) {
      console.error("Error bulk creating QP Express shipments:", error);
      alert(getApiErrorMessage(error, "فشل إنشاء شحنات QP Express المجمعة"));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrders, fetchOrders, setSelectedOrders, getApiErrorMessage]);

  const handleBulkCreateBostaShipments = useCallback(async () => {
    if (
      !window.confirm(
        `هل تريد تأكيد إرسال ${selectedOrders.length} طلب إلى شركة بوستا (Bosta) وتوليد البوالص آلياً؟`,
      )
    ) {
      return;
    }

    try {
      setBulkProcessing(true);
      const response: any = await apiClient.post("/bosta/bulk/create-shipments", {
        orderIds: selectedOrders,
      });

      if (response.data?.success) {
        const { success, failed, skipped } = response.data.data;
        let message = `تم إنشاء ${success} بوليصة شحن لدى بوستا بنجاح`;
        if (failed > 0) message += `\nفشل: ${failed}`;
        if (skipped > 0) message += `\nتم تخطيها (مشحونة مسبقاً): ${skipped}`;
        alert(message);
        setSelectedOrders([]);
        await fetchOrders();
      } else {
        alert(response.data?.error || "تعذر الشحن الجماعي لدى بوستا");
      }
    } catch (error: unknown) {
      console.error("Error bulk creating Bosta shipments:", error);
      alert(getApiErrorMessage(error, "فشل إنشاء شحنات بوستا المجمعة"));
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedOrders, fetchOrders, setSelectedOrders, getApiErrorMessage]);

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
