import { useMemo } from "react";
import type { PreparationQueueDialogsContainerProps } from "./components/PreparationQueueDialogsContainer";

export interface UsePreparationDialogOperationsOptions {
  statusChangeDialog: { targetStatus: string; isHold?: boolean } | null;
  setStatusChangeDialog: (val: any) => void;
  dialogOrder: any;
  statusLabelMap: Map<string, string>;
  dialogHoldReason: string;
  rowUpdatingId: string | null;
  problemHoldSavingOrderId: string | null;
  handleConfirmStatusChange: (payload: any) => void;

  bulkHoldDialog: { count: number; mode: "selected" | "all"; validOrders: any[] } | null;
  setBulkHoldDialog: (val: any) => void;
  bulkUpdating: boolean;
  executeBulkUpdateSelected: (orders: any[], reason: string) => void;
  executeBulkUpdateAll: (reason: string) => void;

  editReasonOrder: { reason: string } | null;
  setEditReasonOrder: (val: any) => void;
  editReasonOrderOrder: any;
  handleConfirmEditReason: (reason: string) => void;

  showDispatchModal: boolean;
  setShowDispatchModal: (val: boolean) => void;
  selectedOrdersCount: number;
  activeCarriers: any[];
  handleDispatchToCarrier: (carrier: any) => void;
  sendingToTurbo: boolean;

  showInternalCourierModal: boolean;
  setShowInternalCourierModal: (val: boolean) => void;
  internalCourierOrderIds: string[];
  onInternalCourierSuccess: (runId: string, runNumber: string) => void;
}

export function usePreparationDialogOperations(
  options: UsePreparationDialogOperationsOptions,
): PreparationQueueDialogsContainerProps {
  return useMemo<PreparationQueueDialogsContainerProps>(
    () => ({
      statusChangeDialog: options.statusChangeDialog,
      setStatusChangeDialog: options.setStatusChangeDialog,
      dialogOrder: options.dialogOrder,
      statusLabelMap: options.statusLabelMap,
      dialogHoldReason: options.dialogHoldReason,
      rowUpdatingId: options.rowUpdatingId,
      problemHoldSavingOrderId: options.problemHoldSavingOrderId,
      handleConfirmStatusChange: options.handleConfirmStatusChange,

      bulkHoldDialog: options.bulkHoldDialog,
      setBulkHoldDialog: options.setBulkHoldDialog,
      bulkUpdating: options.bulkUpdating,
      executeBulkUpdateSelected: options.executeBulkUpdateSelected,
      executeBulkUpdateAll: options.executeBulkUpdateAll,

      editReasonOrder: options.editReasonOrder,
      setEditReasonOrder: options.setEditReasonOrder,
      editReasonOrderOrder: options.editReasonOrderOrder,
      handleConfirmEditReason: options.handleConfirmEditReason,

      showDispatchModal: options.showDispatchModal,
      setShowDispatchModal: options.setShowDispatchModal,
      selectedOrdersCount: options.selectedOrdersCount,
      activeCarriers: options.activeCarriers,
      handleDispatchToCarrier: options.handleDispatchToCarrier,
      sendingToTurbo: options.sendingToTurbo,

      showInternalCourierModal: options.showInternalCourierModal,
      setShowInternalCourierModal: options.setShowInternalCourierModal,
      internalCourierOrderIds: options.internalCourierOrderIds,
      onInternalCourierSuccess: options.onInternalCourierSuccess,
    }),
    [
      options.statusChangeDialog,
      options.setStatusChangeDialog,
      options.dialogOrder,
      options.statusLabelMap,
      options.dialogHoldReason,
      options.rowUpdatingId,
      options.problemHoldSavingOrderId,
      options.handleConfirmStatusChange,
      options.bulkHoldDialog,
      options.setBulkHoldDialog,
      options.bulkUpdating,
      options.executeBulkUpdateSelected,
      options.executeBulkUpdateAll,
      options.editReasonOrder,
      options.setEditReasonOrder,
      options.editReasonOrderOrder,
      options.handleConfirmEditReason,
      options.showDispatchModal,
      options.setShowDispatchModal,
      options.selectedOrdersCount,
      options.activeCarriers,
      options.handleDispatchToCarrier,
      options.sendingToTurbo,
      options.showInternalCourierModal,
      options.setShowInternalCourierModal,
      options.internalCourierOrderIds,
      options.onInternalCourierSuccess,
    ],
  );
}
