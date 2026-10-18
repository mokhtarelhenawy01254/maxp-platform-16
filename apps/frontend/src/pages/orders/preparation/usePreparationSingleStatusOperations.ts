import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import {
  DEFAULT_PROBLEM_HOLD_DETAILS,
  PROBLEM_HOLD_METADATA_KEY,
  PROBLEM_HOLD_STATUS,
} from "./constants";
import { buildProblemHoldDetails, toUpper } from "./helpers";
import type {
  PreparationOrder,
  PreparationQueueSettings,
  ProblemHoldDetails,
} from "./types";

export interface UsePreparationSingleStatusOperationsParams {
  getOrderByNumber: (orderNumber: string) => PreparationOrder | null;
  validateTransition: (
    order: PreparationOrder,
    nextStatus: string,
  ) => { valid: boolean; message?: string };
  problemHoldDrafts: Record<string, ProblemHoldDetails>;
  setProblemHoldDrafts: React.Dispatch<
    React.SetStateAction<Record<string, ProblemHoldDetails>>
  >;
  setProblemHoldSavingOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  updateLocalMetadata: (
    orderNumber: string,
    patch: Record<string, unknown>,
  ) => void;
  updateLocalStatuses: (orderNumbers: string[], status: string) => void;
  statusLabelMap: Map<string, string>;
  preparationSettings: PreparationQueueSettings;
  user: any;
  fetchAll: () => Promise<void> | void;
  statusChangeDialog: {
    orderNumber: string;
    targetStatus: string;
    isHold?: boolean;
  } | null;
  setStatusChangeDialog: React.Dispatch<
    React.SetStateAction<{
      orderNumber: string;
      targetStatus: string;
      isHold?: boolean;
    } | null>
  >;
  getApiErrorMessage: (error: unknown) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export interface UsePreparationSingleStatusOperationsReturn {
  rowUpdatingId: string | null;
  performStatusUpdate: (
    orderNumber: string,
    nextStatus: string,
    note: string,
    holdDetails?: Partial<ProblemHoldDetails>,
  ) => Promise<boolean>;
  handleSingleStatusUpdate: (
    orderNumber: string,
    nextStatus: string,
  ) => Promise<boolean | void>;
  handleRequestStatusChange: (
    orderNumber: string,
    nextStatus: string,
  ) => Promise<void>;
  handleConfirmStatusChange: (payload: {
    note: string;
    holdReason?: string;
  }) => Promise<void>;
}

export const usePreparationSingleStatusOperations = ({
  getOrderByNumber,
  validateTransition,
  problemHoldDrafts,
  setProblemHoldDrafts,
  setProblemHoldSavingOrderId,
  updateLocalMetadata,
  updateLocalStatuses,
  statusLabelMap,
  preparationSettings,
  user,
  fetchAll,
  statusChangeDialog,
  setStatusChangeDialog,
  getApiErrorMessage,
  t,
}: UsePreparationSingleStatusOperationsParams): UsePreparationSingleStatusOperationsReturn => {
  const [rowUpdatingId, setRowUpdatingId] = useState<string | null>(null);

  const performStatusUpdate = useCallback(
    async (
      orderNumber: string,
      nextStatus: string,
      note: string,
      holdDetails?: Partial<ProblemHoldDetails>,
    ) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) {
        toast.error(t("preparation.k_20"));
        return false;
      }

      const normalizedNextStatus = toUpper(nextStatus);
      const isHoldTarget = normalizedNextStatus === PROBLEM_HOLD_STATUS;
      const isReleasingProblemHold =
        order.stage === "ON_HOLD_PREP" && !isHoldTarget;

      if (isHoldTarget) {
        const currentDraft =
          problemHoldDrafts[orderNumber] ||
          buildProblemHoldDetails(order.metadata);
        const nextDraft: ProblemHoldDetails = {
          ...DEFAULT_PROBLEM_HOLD_DETAILS,
          ...currentDraft,
          ...holdDetails,
          heldAt: currentDraft.heldAt || new Date().toISOString(),
          releasedAt: "",
          state: "held",
        };
        if (currentDraft.heldAt) {
          nextDraft.heldAt = currentDraft.heldAt;
        }
        if (user?.firstName || user?.lastName) {
          nextDraft.heldBy =
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            nextDraft.heldBy;
        }

        try {
          setProblemHoldSavingOrderId(orderNumber);
          await apiClient.put(
            `/orders-new/simple/${encodeURIComponent(orderNumber)}`,
            { metadataPatch: { [PROBLEM_HOLD_METADATA_KEY]: nextDraft } },
          );
          updateLocalMetadata(orderNumber, {
            [PROBLEM_HOLD_METADATA_KEY]: nextDraft,
          });
          setProblemHoldDrafts((previous) => ({
            ...previous,
            [orderNumber]: nextDraft,
          }));
        } catch (error: unknown) {
          console.error("Failed to save problem hold details:", error);
          toast.error(
            getApiErrorMessage(error) ||
              t("preparation.page.shortageHoldFailed"),
          );
          return false;
        } finally {
          setProblemHoldSavingOrderId(null);
        }
      } else if (isReleasingProblemHold) {
        const currentDraft =
          problemHoldDrafts[orderNumber] ||
          buildProblemHoldDetails(order.metadata);
        const nextDraft: ProblemHoldDetails = {
          ...currentDraft,
          releasedAt: new Date().toISOString(),
          state: "released",
        };
        if (user?.firstName || user?.lastName) {
          nextDraft.releasedBy =
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            nextDraft.releasedBy;
        }

        try {
          setProblemHoldSavingOrderId(orderNumber);
          await apiClient.put(
            `/orders-new/simple/${encodeURIComponent(orderNumber)}`,
            { metadataPatch: { [PROBLEM_HOLD_METADATA_KEY]: nextDraft } },
          );
          updateLocalMetadata(orderNumber, {
            [PROBLEM_HOLD_METADATA_KEY]: nextDraft,
          });
          setProblemHoldDrafts((previous) => ({
            ...previous,
            [orderNumber]: nextDraft,
          }));
        } catch (error: unknown) {
          console.error("Failed to release problem hold metadata:", error);
        } finally {
          setProblemHoldSavingOrderId(null);
        }
      }

      if (isHoldTarget && !(holdDetails?.reason || "").trim()) {
        toast.error(t("preparation.holdDialog.reasonRequired"));
        return false;
      }

      try {
        setRowUpdatingId(orderNumber);
        const canOverride = [
          "OWNER",
          "SUPER_ADMIN",
          "COMPANY_ADMIN",
          "MANAGER",
        ].includes(user?.role || "");
        await apiClient.post(
          `/orders-new/simple/${encodeURIComponent(orderNumber)}/status`,
          {
            status: normalizedNextStatus,
            notes:
              (isHoldTarget && (holdDetails?.reason || "").trim()) ||
              note ||
              (order.stage === "QUALITY_CHECK" &&
              ["PACKAGED", preparationSettings.handoffStatus].includes(
                normalizedNextStatus,
              )
                ? "QC completed from preparation queue"
                : "Updated from preparation queue"),
            isOverride: canOverride,
          },
        );

        updateLocalStatuses([orderNumber], normalizedNextStatus);
        toast.success(
          t("preparation.toasts.statusUpdated", {
            orderId: orderNumber,
            status:
              statusLabelMap.get(normalizedNextStatus) || normalizedNextStatus,
          }),
        );
        void fetchAll();
        return true;
      } catch (error: unknown) {
        console.error("Failed to update order status:", error);
        toast.error(
          getApiErrorMessage(error) || t("preparation.page.stageUpdateError"),
        );
        return false;
      } finally {
        setRowUpdatingId(null);
      }
    },
    [
      fetchAll,
      getApiErrorMessage,
      getOrderByNumber,
      preparationSettings.handoffStatus,
      problemHoldDrafts,
      setProblemHoldDrafts,
      setProblemHoldSavingOrderId,
      statusLabelMap,
      t,
      updateLocalMetadata,
      updateLocalStatuses,
      user,
    ],
  );

  const handleSingleStatusUpdate = useCallback(
    async (orderNumber: string, nextStatus: string) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) {
        toast.error(t("preparation.k_20"));
        return;
      }

      const validation = validateTransition(order, nextStatus);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }

      await performStatusUpdate(orderNumber, toUpper(nextStatus), "");
    },
    [getOrderByNumber, performStatusUpdate, t, validateTransition],
  );

  const handleRequestStatusChange = useCallback(
    async (orderNumber: string, nextStatus: string) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) {
        toast.error(t("preparation.k_20"));
        return;
      }

      const validation = validateTransition(order, nextStatus);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }

      setStatusChangeDialog({
        orderNumber,
        targetStatus: toUpper(nextStatus),
        isHold: toUpper(nextStatus) === PROBLEM_HOLD_STATUS,
      });
    },
    [getOrderByNumber, setStatusChangeDialog, t, validateTransition],
  );

  const handleConfirmStatusChange = useCallback(
    async (payload: { note: string; holdReason?: string }) => {
      if (!statusChangeDialog) return;
      const holdDetails = payload.holdReason
        ? { reason: payload.holdReason }
        : undefined;
      const ok = await performStatusUpdate(
        statusChangeDialog.orderNumber,
        statusChangeDialog.targetStatus,
        payload.note,
        holdDetails,
      );
      if (ok) {
        setStatusChangeDialog(null);
      }
    },
    [performStatusUpdate, setStatusChangeDialog, statusChangeDialog],
  );

  return {
    rowUpdatingId,
    performStatusUpdate,
    handleSingleStatusUpdate,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  };
};

export default usePreparationSingleStatusOperations;
