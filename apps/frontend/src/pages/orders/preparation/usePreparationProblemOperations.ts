import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import {
  DEFAULT_PROBLEM_HOLD_DETAILS,
  PROBLEM_HOLD_METADATA_KEY,
  PROBLEM_HOLD_STATUS,
} from "./constants";
import { buildProblemHoldDetails } from "./helpers";
import type { PreparationOrder, ProblemHoldDetails, SimpleOrder } from "./types";

export interface UsePreparationProblemOperationsParams {
  orders: SimpleOrder[];
  user: any;
  startingStatus: string;
  getOrderByNumber: (orderNumber: string) => PreparationOrder | null;
  updateLocalMetadata: (orderNumber: string, patch: Record<string, unknown>) => void;
  updateLocalStatuses: (orderNumbers: string[], status: string) => void;
  fetchAll: () => Promise<void> | void;
  setStatusChangeDialog: React.Dispatch<
    React.SetStateAction<{
      orderNumber: string;
      targetStatus: string;
      isHold?: boolean;
    } | null>
  >;
  getApiErrorMessage: (error: unknown) => string;
  t: (key: string) => string;
}

export interface UsePreparationProblemOperationsReturn {
  problemHoldDrafts: Record<string, ProblemHoldDetails>;
  setProblemHoldDrafts: React.Dispatch<React.SetStateAction<Record<string, ProblemHoldDetails>>>;
  problemHoldSavingOrderId: string | null;
  setProblemHoldSavingOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  editReasonOrder: { orderNumber: string; reason: string } | null;
  setEditReasonOrder: React.Dispatch<
    React.SetStateAction<{ orderNumber: string; reason: string } | null>
  >;
  editReasonOrderOrder: PreparationOrder | null;
  saveProblemHoldDetails: (
    orderNumber: string,
    overrides?: Partial<ProblemHoldDetails>,
    options?: { successMessage?: string | null; skipRefresh?: boolean },
  ) => Promise<boolean>;
  handleHoldAsProblem: (orderNumber: string) => Promise<void>;
  handleEditProblemReason: (orderNumber: string) => void;
  handleConfirmEditReason: (reason: string) => Promise<void>;
  handleReleaseProblemHold: (orderNumber: string) => Promise<void>;
}

export const usePreparationProblemOperations = ({
  orders,
  user,
  startingStatus,
  getOrderByNumber,
  updateLocalMetadata,
  updateLocalStatuses,
  fetchAll,
  setStatusChangeDialog,
  getApiErrorMessage,
  t,
}: UsePreparationProblemOperationsParams): UsePreparationProblemOperationsReturn => {
  const [problemHoldDrafts, setProblemHoldDrafts] = useState<
    Record<string, ProblemHoldDetails>
  >({});
  const [problemHoldSavingOrderId, setProblemHoldSavingOrderId] = useState<
    string | null
  >(null);
  const [editReasonOrder, setEditReasonOrder] = useState<{
    orderNumber: string;
    reason: string;
  } | null>(null);

  const saveProblemHoldDetails = useCallback(
    async (
      orderNumber: string,
      overrides: Partial<ProblemHoldDetails> = {},
      options?: { successMessage?: string | null; skipRefresh?: boolean },
    ) => {
      const order = orders.find((item) => item.orderNumber === orderNumber);
      if (!order) {
        toast.error(t("preparation.page.orderNotFound"));
        return false;
      }

      const currentDraft =
        problemHoldDrafts[orderNumber] || buildProblemHoldDetails(order.metadata);
      const nextDraft: ProblemHoldDetails = {
        ...DEFAULT_PROBLEM_HOLD_DETAILS,
        ...currentDraft,
        ...overrides,
      };
      const metadataPatch = {
        [PROBLEM_HOLD_METADATA_KEY]: nextDraft,
      };

      try {
        setProblemHoldSavingOrderId(orderNumber);
        await apiClient.put(`/orders-new/simple/${encodeURIComponent(orderNumber)}`, {
          metadataPatch,
        });
        updateLocalMetadata(orderNumber, metadataPatch);
        setProblemHoldDrafts((previous) => ({
          ...previous,
          [orderNumber]: nextDraft,
        }));

        if (options?.successMessage !== null) {
          toast.success(options?.successMessage || t("preparation.page.problemHoldSaved"));
        }

        if (!options?.skipRefresh) {
          void fetchAll();
        }

        return true;
      } catch (error: unknown) {
        console.error("Failed to save problem hold details:", error);
        toast.error(
          getApiErrorMessage(error) || t("preparation.page.problemHoldFailed"),
        );
        return false;
      } finally {
        setProblemHoldSavingOrderId(null);
      }
    },
    [fetchAll, getApiErrorMessage, orders, problemHoldDrafts, t, updateLocalMetadata],
  );

  const handleHoldAsProblem = useCallback(
    async (orderNumber: string) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) return;
      setStatusChangeDialog({
        orderNumber,
        targetStatus: PROBLEM_HOLD_STATUS,
        isHold: true,
      });
    },
    [getOrderByNumber, setStatusChangeDialog],
  );

  const handleEditProblemReason = useCallback(
    (orderNumber: string) => {
      const order = getOrderByNumber(orderNumber);
      if (!order) return;
      const details =
        problemHoldDrafts[orderNumber] ||
        buildProblemHoldDetails(order.metadata);
      setEditReasonOrder({ orderNumber, reason: details.reason });
    },
    [getOrderByNumber, problemHoldDrafts],
  );

  const editReasonOrderOrder = useMemo(
    () =>
      editReasonOrder ? getOrderByNumber(editReasonOrder.orderNumber) : null,
    [editReasonOrder, getOrderByNumber],
  );

  const handleConfirmEditReason = useCallback(
    async (reason: string) => {
      if (!editReasonOrder) return;
      const ok = await saveProblemHoldDetails(editReasonOrder.orderNumber, {
        reason,
      });
      if (ok) setEditReasonOrder(null);
    },
    [editReasonOrder, saveProblemHoldDetails],
  );

  const handleReleaseProblemHold = useCallback(
    async (orderNumber: string) => {
      const order = getOrderByNumber(orderNumber);
      const currentDraft =
        problemHoldDrafts[orderNumber] || buildProblemHoldDetails(order?.metadata);
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

        await apiClient.post(
          `/orders-new/simple/${encodeURIComponent(orderNumber)}/status`,
          {
            status: startingStatus,
            notes: t("preparation.problemPanel.releasedNote"),
            isOverride: ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"].includes(
              user?.role || "",
            ),
          },
        );

        updateLocalStatuses([orderNumber], startingStatus);
        toast.success(t("preparation.problemPanel.releasedSuccess"));
        void fetchAll();
      } catch (error: unknown) {
        console.error("Failed to release problem hold:", error);
        toast.error(
          getApiErrorMessage(error) || t("preparation.problemPanel.releasedError"),
        );
      } finally {
        setProblemHoldSavingOrderId(null);
      }
    },
    [
      fetchAll,
      getApiErrorMessage,
      getOrderByNumber,
      problemHoldDrafts,
      startingStatus,
      t,
      updateLocalMetadata,
      updateLocalStatuses,
      user,
    ],
  );

  return {
    problemHoldDrafts,
    setProblemHoldDrafts,
    problemHoldSavingOrderId,
    setProblemHoldSavingOrderId,
    editReasonOrder,
    setEditReasonOrder,
    editReasonOrderOrder,
    saveProblemHoldDetails,
    handleHoldAsProblem,
    handleEditProblemReason,
    handleConfirmEditReason,
    handleReleaseProblemHold,
  };
};

export default usePreparationProblemOperations;
