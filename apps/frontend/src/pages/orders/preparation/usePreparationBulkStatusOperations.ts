import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { PROBLEM_HOLD_STATUS } from "./constants";
import type { BulkStatusResult, PreparationOrder } from "./types";

export interface PreparationBulkFiltersPayload {
  stage: string;
  warehouseId?: string;
  stockFilter?: string;
  shortageReason?: string;
  shortageFollowUp?: string;
  shortageOwner?: string;
  productFilter?: string;
  colorFilter?: string;
  sizeFilter?: string;
  productId?: string;
  variantId?: string;
  itemCountFilter?: string;
  notPrinted?: string;
  noShippingCode?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface UsePreparationBulkStatusOperationsParams {
  bulkStatus: string;
  selectedOrders: string[];
  enrichedOrders: PreparationOrder[];
  getOrderByNumber: (orderNumber: string) => PreparationOrder | null;
  validateTransition: (
    order: PreparationOrder,
    nextStatus: string,
  ) => { valid: boolean; message?: string };
  updateLocalStatuses: (orderNumbers: string[], status: string) => void;
  fetchAll: () => Promise<void> | void;
  clearBulkControls: () => void;
  statusLabelMap: Map<string, string>;
  paginationTotal: number;
  getFiltersPayload: () => PreparationBulkFiltersPayload;
  getApiErrorMessage: (error: unknown) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export interface UsePreparationBulkStatusOperationsReturn {
  bulkUpdating: boolean;
  setBulkUpdating: React.Dispatch<React.SetStateAction<boolean>>;
  bulkHoldDialog: {
    mode: "selected" | "all";
    validOrders: PreparationOrder[];
    count?: number;
  } | null;
  setBulkHoldDialog: React.Dispatch<
    React.SetStateAction<{
      mode: "selected" | "all";
      validOrders: PreparationOrder[];
      count?: number;
    } | null>
  >;
  executeBulkUpdateSelected: (
    validOrders: PreparationOrder[],
    reason?: string,
  ) => Promise<void>;
  handleBulkUpdate: () => Promise<void>;
  executeBulkUpdateAll: (reason?: string) => Promise<void>;
  handleBulkUpdateAll: () => Promise<void>;
}

export const usePreparationBulkStatusOperations = ({
  bulkStatus,
  selectedOrders,
  enrichedOrders,
  getOrderByNumber,
  validateTransition,
  updateLocalStatuses,
  fetchAll,
  clearBulkControls,
  statusLabelMap,
  paginationTotal,
  getFiltersPayload,
  getApiErrorMessage,
  t,
}: UsePreparationBulkStatusOperationsParams): UsePreparationBulkStatusOperationsReturn => {
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkHoldDialog, setBulkHoldDialog] = useState<{
    mode: "selected" | "all";
    validOrders: PreparationOrder[];
    count?: number;
  } | null>(null);

  const executeBulkUpdateSelected = useCallback(
    async (validOrders: PreparationOrder[], reason?: string) => {
      try {
        setBulkUpdating(true);
        const response = await apiClient.post("/orders-new/bulk/status", {
          orderIds: validOrders.map((order) => order.orderNumber),
          status: bulkStatus,
          notes: reason ? reason.trim() : undefined,
        });

        const results: BulkStatusResult[] = Array.isArray(
          response.data?.data?.results,
        )
          ? response.data.data.results
          : [];
        const pendingApprovalResults = results.filter(
          (result) => result.workflowStatus === "pending",
        );
        const directSuccessResults = results.filter(
          (result) => result.success && result.workflowStatus !== "pending",
        );
        const directSuccessIds = directSuccessResults.map((result) =>
          String(result.id),
        );
        const failedResults = results.filter((result) => !result.success);

        if (directSuccessIds.length > 0) {
          updateLocalStatuses(directSuccessIds, bulkStatus);
        }

        if (pendingApprovalResults.length > 0) {
          toast.info(
            t("preparation.toasts.workflowPendingApproval", {
              count: pendingApprovalResults.length,
            }) ||
              `تم تقديم ${pendingApprovalResults.length} طلب للاعتماد`,
          );
        }

        if (directSuccessIds.length > 0) {
          if (failedResults.length > 0) {
            toast.success(
              t("preparation.toasts.bulkUpdatePartial", {
                success: directSuccessIds.length,
                failed: failedResults.length,
              }),
            );
          } else {
            toast.success(
              t("preparation.toasts.bulkUpdateSuccess", {
                count: directSuccessIds.length,
              }),
            );
          }
        } else if (pendingApprovalResults.length === 0) {
          const firstError = failedResults.find((r) => r.error)?.error;
          toast.error(firstError || t("preparation.page.stageUpdateFailed"));
        }

        clearBulkControls();
        void fetchAll();
      } catch (error: unknown) {
        console.error("Failed bulk status update:", error);
        toast.error(
          getApiErrorMessage(error) || t("preparation.page.stageUpdateFailed"),
        );
      } finally {
        setBulkUpdating(false);
      }
    },
    [
      bulkStatus,
      clearBulkControls,
      fetchAll,
      getApiErrorMessage,
      t,
      updateLocalStatuses,
    ],
  );

  const handleBulkUpdate = useCallback(async () => {
    if (!bulkStatus || selectedOrders.length === 0) return;

    const selectedOrderObjects = selectedOrders
      .map((orderNumber) => getOrderByNumber(orderNumber))
      .filter((order): order is PreparationOrder => Boolean(order));
    const validOrders: PreparationOrder[] = [];
    const invalidOrders: PreparationOrder[] = [];

    selectedOrderObjects.forEach((order) => {
      const validation = validateTransition(order, bulkStatus);
      if (validation.valid) {
        validOrders.push(order);
      } else {
        invalidOrders.push(order);
      }
    });

    if (validOrders.length === 0) {
      toast.error(t("preparation.toasts.bulkNoValidOrders"));
      return;
    }

    if (bulkStatus === PROBLEM_HOLD_STATUS) {
      setBulkHoldDialog({
        mode: "selected",
        validOrders,
        count: validOrders.length,
      });
      return;
    }

    const confirmed = window.confirm(
      t("preparation.confirm.bulkUpdate", {
        count: validOrders.length,
        stage: statusLabelMap.get(bulkStatus) || bulkStatus,
        extra:
          invalidOrders.length > 0
            ? t("preparation.confirm.withExclusions", {
                count: invalidOrders.length,
              })
            : "",
      }),
    );

    if (!confirmed) return;

    void executeBulkUpdateSelected(validOrders);
  }, [
    bulkStatus,
    executeBulkUpdateSelected,
    getOrderByNumber,
    selectedOrders,
    statusLabelMap,
    t,
    validateTransition,
  ]);

  const executeBulkUpdateAll = useCallback(
    async (reason?: string) => {
      const filters = getFiltersPayload();

      try {
        setBulkUpdating(true);
        const response = await apiClient.post(
          "/orders-new/bulk/status/by-filters",
          {
            status: bulkStatus,
            notes: reason ? reason.trim() : undefined,
            filters,
          },
        );

        const result = response.data?.data;
        const successCount = result?.successCount ?? 0;
        const totalRequested = result?.totalRequested ?? 0;
        const results: BulkStatusResult[] = Array.isArray(result?.results)
          ? result.results
          : [];

        if (totalRequested === 0) {
          toast.error(t("preparation.k_26"));
          return;
        }

        if (successCount === 0) {
          const firstError = results.find((r) => !r.success && r.error)?.error;
          toast.error(firstError || t("preparation.page.stageUpdateFailed"));
        } else {
          toast.success(
            successCount < totalRequested
              ? t("preparation.toasts.bulkUpdatePartial", {
                  success: successCount,
                  failed: totalRequested - successCount,
                })
              : t("preparation.toasts.bulkUpdateSuccess", {
                  count: successCount,
                }),
          );
        }

        clearBulkControls();
        void fetchAll();
      } catch (error: unknown) {
        console.error("Failed bulk status update all:", error);
        toast.error(
          getApiErrorMessage(error) || t("preparation.page.stageUpdateFailed"),
        );
      } finally {
        setBulkUpdating(false);
      }
    },
    [
      bulkStatus,
      clearBulkControls,
      fetchAll,
      getApiErrorMessage,
      getFiltersPayload,
      t,
    ],
  );

  const handleBulkUpdateAll = useCallback(async () => {
    if (!bulkStatus) return;

    const validOrders: PreparationOrder[] = [];
    const invalidOrders: PreparationOrder[] = [];

    enrichedOrders.forEach((order) => {
      const validation = validateTransition(order, bulkStatus);
      if (validation.valid) {
        validOrders.push(order);
      } else {
        invalidOrders.push(order);
      }
    });

    if (validOrders.length === 0) {
      toast.error(t("preparation.toasts.bulkNoValidOrders"));
      return;
    }

    if (bulkStatus === PROBLEM_HOLD_STATUS) {
      setBulkHoldDialog({
        mode: "all",
        validOrders,
        count: paginationTotal,
      });
      return;
    }

    const confirmed = window.confirm(
      t("preparation.confirm.bulkUpdateAll", {
        count: paginationTotal,
        stage: statusLabelMap.get(bulkStatus) || bulkStatus,
      }),
    );

    if (!confirmed) return;

    void executeBulkUpdateAll();
  }, [
    bulkStatus,
    enrichedOrders,
    executeBulkUpdateAll,
    paginationTotal,
    statusLabelMap,
    t,
    validateTransition,
  ]);

  return {
    bulkUpdating,
    setBulkUpdating,
    bulkHoldDialog,
    setBulkHoldDialog,
    executeBulkUpdateSelected,
    handleBulkUpdate,
    executeBulkUpdateAll,
    handleBulkUpdateAll,
  };
};

export default usePreparationBulkStatusOperations;
