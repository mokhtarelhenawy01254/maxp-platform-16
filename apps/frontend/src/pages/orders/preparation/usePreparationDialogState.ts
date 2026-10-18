import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { PreparationOrder, ProblemHoldDetails } from "./types";
import { DEFAULT_PROBLEM_HOLD_DETAILS } from "./constants";
import { buildProblemHoldDetails } from "./helpers";

export interface StatusChangeDialogState {
  orderNumber: string;
  targetStatus: string;
  isHold?: boolean;
}

export interface UsePreparationDialogStateParams {
  getOrderByNumber: (orderNumber: string) => PreparationOrder | null;
  problemHoldDrafts: Record<string, ProblemHoldDetails>;
  selectedOrders: string[];
  clearBulkControls: () => void;
  fetchAll: () => Promise<any> | void;
  navigate: (to: string) => void;
}

export function usePreparationDialogState({
  getOrderByNumber,
  problemHoldDrafts,
  selectedOrders,
  clearBulkControls,
  fetchAll,
  navigate,
}: UsePreparationDialogStateParams) {
  const [statusChangeDialog, setStatusChangeDialog] = useState<StatusChangeDialogState | null>(null);
  const [showInternalCourierModal, setShowInternalCourierModal] = useState(false);

  const dialogOrder = useMemo(
    () => (statusChangeDialog ? getOrderByNumber(statusChangeDialog.orderNumber) : null),
    [getOrderByNumber, statusChangeDialog],
  );

  const dialogHoldDetails = useMemo(
    () =>
      statusChangeDialog && dialogOrder
        ? problemHoldDrafts[statusChangeDialog.orderNumber] ||
          buildProblemHoldDetails(dialogOrder.metadata)
        : DEFAULT_PROBLEM_HOLD_DETAILS,
    [dialogOrder, problemHoldDrafts, statusChangeDialog],
  );

  const dialogHoldReason = dialogHoldDetails.reason || "";

  const internalCourierOrderIds = useMemo(
    () =>
      selectedOrders
        .map((orderNumber) => getOrderByNumber(orderNumber)?.id)
        .filter((id): id is string | number => id !== undefined && id !== null)
        .map(String),
    [selectedOrders, getOrderByNumber],
  );

  const handleInternalCourierSuccess = useCallback(
    (_runId: string | number, runNumber: string | number) => {
      setShowInternalCourierModal(false);
      toast.success(`تم إنشاء مأمورية التوزيع ${runNumber} وتكليف المندوب بنجاح`);
      clearBulkControls();
      void fetchAll();
      navigate("/shipping/delivery-runs");
    },
    [clearBulkControls, fetchAll, navigate],
  );

  return {
    statusChangeDialog,
    setStatusChangeDialog,
    showInternalCourierModal,
    setShowInternalCourierModal,
    dialogOrder,
    dialogHoldDetails,
    dialogHoldReason,
    internalCourierOrderIds,
    handleInternalCourierSuccess,
  };
}
