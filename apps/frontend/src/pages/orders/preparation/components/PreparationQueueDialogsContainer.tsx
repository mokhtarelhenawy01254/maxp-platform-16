import React from "react";
import { useTranslation } from "react-i18next";
import { PreparationStatusChangeDialog } from "./PreparationStatusChangeDialog";
import { ProblemHoldReasonDialog } from "./ProblemHoldReasonDialog";
import { DispatchCarrierModal } from "./DispatchCarrierModal";
import { DispatchInternalCourierModal } from "./DispatchInternalCourierModal";
import { PROBLEM_HOLD_STATUS } from "../constants";

export interface PreparationQueueDialogsContainerProps {
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

export const PreparationQueueDialogsContainer: React.FC<PreparationQueueDialogsContainerProps> = ({
  statusChangeDialog,
  setStatusChangeDialog,
  dialogOrder,
  statusLabelMap,
  dialogHoldReason,
  rowUpdatingId,
  problemHoldSavingOrderId,
  handleConfirmStatusChange,

  bulkHoldDialog,
  setBulkHoldDialog,
  bulkUpdating,
  executeBulkUpdateSelected,
  executeBulkUpdateAll,

  editReasonOrder,
  setEditReasonOrder,
  editReasonOrderOrder,
  handleConfirmEditReason,

  showDispatchModal,
  setShowDispatchModal,
  selectedOrdersCount,
  activeCarriers,
  handleDispatchToCarrier,
  sendingToTurbo,

  showInternalCourierModal,
  setShowInternalCourierModal,
  internalCourierOrderIds,
  onInternalCourierSuccess,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Single Status Change / Hold Dialog */}
      <PreparationStatusChangeDialog
        isOpen={Boolean(statusChangeDialog)}
        order={dialogOrder}
        targetStatus={statusChangeDialog?.targetStatus || ""}
        targetStatusLabel={
          statusChangeDialog
            ? statusLabelMap.get(statusChangeDialog.targetStatus) || statusChangeDialog.targetStatus
            : ""
        }
        isHold={statusChangeDialog?.isHold || false}
        initialHoldReason={dialogHoldReason}
        busy={Boolean(
          dialogOrder &&
            (rowUpdatingId === dialogOrder.orderNumber ||
              problemHoldSavingOrderId === dialogOrder.orderNumber),
        )}
        onClose={() => setStatusChangeDialog(null)}
        onConfirm={(payload) => void handleConfirmStatusChange(payload)}
      />

      {/* Bulk Hold Dialog */}
      <PreparationStatusChangeDialog
        isOpen={Boolean(bulkHoldDialog)}
        order={
          bulkHoldDialog
            ? ({
                orderNumber:
                  t("preparation.bulkHoldOrderLabel", {
                    count: bulkHoldDialog.count,
                  }) || `المحدد (${bulkHoldDialog.count} طلب)`,
              } as any)
            : null
        }
        targetStatus={PROBLEM_HOLD_STATUS}
        targetStatusLabel={
          statusLabelMap.get(PROBLEM_HOLD_STATUS) ||
          t("orders.onHoldPrep") ||
          "تجهيز معلق"
        }
        isHold={true}
        busy={bulkUpdating}
        onClose={() => setBulkHoldDialog(null)}
        onConfirm={(payload) => {
          const reason = (payload.holdReason || payload.note || "").trim();
          if (!reason) return;
          if (bulkHoldDialog?.mode === "selected") {
            void executeBulkUpdateSelected(bulkHoldDialog.validOrders, reason);
          } else if (bulkHoldDialog?.mode === "all") {
            void executeBulkUpdateAll(reason);
          }
          setBulkHoldDialog(null);
        }}
      />

      {/* Edit Problem Reason Dialog */}
      <ProblemHoldReasonDialog
        isOpen={Boolean(editReasonOrder)}
        order={editReasonOrderOrder}
        initialReason={editReasonOrder?.reason || ""}
        busy={Boolean(
          editReasonOrderOrder &&
            problemHoldSavingOrderId === editReasonOrderOrder.orderNumber,
        )}
        onClose={() => setEditReasonOrder(null)}
        onConfirm={(reason) => void handleConfirmEditReason(reason)}
      />

      {/* Dispatch to Carrier Modal */}
      <DispatchCarrierModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        ordersCount={selectedOrdersCount}
        carriers={activeCarriers}
        onConfirm={(carrier) => void handleDispatchToCarrier(carrier)}
        loading={sendingToTurbo}
      />

      {/* Dispatch to Internal Courier Modal */}
      <DispatchInternalCourierModal
        isOpen={showInternalCourierModal}
        onClose={() => setShowInternalCourierModal(false)}
        orderIds={internalCourierOrderIds}
        onSuccess={onInternalCourierSuccess}
      />
    </>
  );
};

export default PreparationQueueDialogsContainer;
