import React from "react";
import PreparationOrderCard from "./PreparationOrderCard";
import {
  buildProblemHoldDetails,
  buildShortageHoldDetails,
  getNextStatus,
  getQuickActionLabel,
  getShortageFollowUpState,
  getShortageFollowUpVisual,
} from "../helpers";
import { SHORTAGE_HOLD_STATUS } from "../constants";
import type {
  PreparationOrder,
  PreparationSettings,
  ProblemHoldDetails,
  QcCheckType,
  ShortageHoldDetails,
} from "../types";

export interface PreparationOrdersMobileListProps {
  enrichedOrders: PreparationOrder[];
  selectedSet: Set<string>;
  statusSelections: Record<string, string>;
  statusOptions: Array<{ value: string; label: string }>;
  statusLabelMap: Record<string, string>;
  rowUpdatingId: string | null;
  shortageSavingOrderId: string | null;
  problemHoldSavingOrderId: string | null;
  selectedWarehouseId: string;
  enabledQcChecks: QcCheckType[];
  qcChecklistState: Record<string, Record<string, boolean>>;
  shortageHoldDrafts: Record<string, ShortageHoldDetails>;
  problemHoldDrafts: Record<string, ProblemHoldDetails>;
  transferingItemKey: string | null;
  printingOrderNumber: string | null;
  preparationSettings: PreparationSettings;
  formatPrice: (amount: number) => string;
  formatDate: (date: string) => string;
  toggleOrderSelection: (orderNumber: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleQuickTransfer: (orderNumber: string, item: any) => Promise<void> | void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleShortageFieldChange: (orderNumber: string, field: string, value: any) => void;
  saveShortageHoldDetails: (orderNumber: string) => Promise<void> | void;
  handleQcCheckToggle: (orderNumber: string, checkKey: string) => void;
  onStatusSelectionChange: (orderNumber: string, status: string) => void;
  handleRequestStatusChange: (orderNumber: string, targetStatus: string) => Promise<void> | void;
  handleMarkAsShortageHold: (orderNumber: string) => Promise<void> | void;
  handleReleaseShortageHold: (orderNumber: string) => Promise<void> | void;
  handleMarkAsShortageFailed: (orderNumber: string) => Promise<void> | void;
  handleHoldAsProblem: (orderNumber: string) => Promise<void> | void;
  handleReleaseProblemHold: (orderNumber: string) => Promise<void> | void;
  handleEditProblemReason: (orderNumber: string) => void;
  handlePrintPreparationSlip: (orderNumber: string) => Promise<void> | void;
}

export const PreparationOrdersMobileList: React.FC<PreparationOrdersMobileListProps> = React.memo(
  ({
    enrichedOrders,
    selectedSet,
    statusSelections,
    statusOptions,
    statusLabelMap,
    rowUpdatingId,
    shortageSavingOrderId,
    problemHoldSavingOrderId,
    selectedWarehouseId,
    enabledQcChecks,
    qcChecklistState,
    shortageHoldDrafts,
    problemHoldDrafts,
    transferingItemKey,
    printingOrderNumber,
    preparationSettings,
    formatPrice,
    formatDate,
    toggleOrderSelection,
    handleQuickTransfer,
    handleShortageFieldChange,
    saveShortageHoldDetails,
    handleQcCheckToggle,
    onStatusSelectionChange,
    handleRequestStatusChange,
    handleMarkAsShortageHold,
    handleReleaseShortageHold,
    handleMarkAsShortageFailed,
    handleHoldAsProblem,
    handleReleaseProblemHold,
    handleEditProblemReason,
    handlePrintPreparationSlip,
  }) => {
    return (
      <div className="space-y-2.5 p-2.5 sm:p-3 md:hidden">
        {enrichedOrders.map((order) => {
          const shortageHoldDetails =
            shortageHoldDrafts[order.orderNumber] ||
            buildShortageHoldDetails(order.metadata);
          const shortageFollowUpState = getShortageFollowUpState(
            shortageHoldDetails.followUpDate,
            order.stage
          );
          const shortageFollowUpVisual = getShortageFollowUpVisual(
            shortageFollowUpState
          );
          const problemHoldDetails =
            problemHoldDrafts[order.orderNumber] ||
            buildProblemHoldDetails(order.metadata);
          const nextStatus = getNextStatus(
            order.stage,
            preparationSettings.handoffStatus,
            preparationSettings.startingStatus
          );
          const currentStageStatus =
            order.stage === "WAITING"
              ? preparationSettings.startingStatus
              : order.stage === "PREPARING"
              ? "PREPARING"
              : order.stage === "QUALITY_CHECK"
              ? "QUALITY_CHECK"
              : order.stage === "PACKAGED"
              ? "PACKAGED"
              : order.stage === "STOCK_SHORTAGE"
              ? SHORTAGE_HOLD_STATUS
              : order.stage === "ON_HOLD_PREP"
              ? preparationSettings.startingStatus
              : preparationSettings.handoffStatus;
          const defaultTargetStatus = nextStatus || currentStageStatus;
          const currentSelection =
            statusSelections[order.orderNumber] || defaultTargetStatus;
          const actionLabel =
            statusSelections[order.orderNumber] &&
            statusSelections[order.orderNumber] !== defaultTargetStatus
              ? "تطبيق المرحلة المختارة"
              : getQuickActionLabel(order.stage);
          const qcCompleted = enabledQcChecks.every(
            (key) => qcChecklistState[order.orderNumber]?.[key] === true
          );
          const rowBusy =
            rowUpdatingId === order.orderNumber ||
            shortageSavingOrderId === order.orderNumber ||
            problemHoldSavingOrderId === order.orderNumber;
          const hasShortageContext =
            order.missingItemsCount > 0 || order.stage === "STOCK_SHORTAGE";

          return (
            <PreparationOrderCard
              key={order.orderNumber}
              order={order}
              selected={selectedSet.has(order.orderNumber)}
              statusOptions={statusOptions}
              statusLabelMap={statusLabelMap}
              currentSelection={currentSelection}
              actionLabel={actionLabel}
              qcCompleted={qcCompleted}
              rowBusy={rowBusy}
              hasShortageContext={hasShortageContext}
              selectedWarehouseId={selectedWarehouseId}
              enabledQcChecks={enabledQcChecks}
              qcChecklist={qcChecklistState[order.orderNumber]}
              shortageHoldDetails={shortageHoldDetails}
              shortageFollowUpVisual={shortageFollowUpVisual}
              problemHoldDetails={problemHoldDetails}
              transferingItemKey={transferingItemKey}
              printingOrderNumber={printingOrderNumber}
              preparationSettings={preparationSettings}
              formatPrice={formatPrice}
              formatDate={formatDate}
              onToggleSelection={toggleOrderSelection}
              onQuickTransfer={(orderNumber, item) =>
                void handleQuickTransfer(orderNumber, item)
              }
              onShortageFieldChange={handleShortageFieldChange}
              onSaveShortageHoldDetails={saveShortageHoldDetails}
              onQcCheckToggle={handleQcCheckToggle}
              onStatusSelectionChange={onStatusSelectionChange}
              onSingleStatusUpdate={(orderNumber, targetStatus) =>
                void handleRequestStatusChange(orderNumber, targetStatus)
              }
              onMarkAsShortageHold={(orderNumber) =>
                void handleMarkAsShortageHold(orderNumber)
              }
              onReleaseShortageHold={(orderNumber) =>
                void handleReleaseShortageHold(orderNumber)
              }
              onMarkAsShortageFailed={(orderNumber) =>
                void handleMarkAsShortageFailed(orderNumber)
              }
              onHoldAsProblem={(orderNumber) =>
                void handleHoldAsProblem(orderNumber)
              }
              onReleaseProblemHold={(orderNumber) =>
                void handleReleaseProblemHold(orderNumber)
              }
              onEditProblemReason={handleEditProblemReason}
              onPrintPreparationSlip={(orderNumber) =>
                void handlePrintPreparationSlip(orderNumber)
              }
            />
          );
        })}
      </div>
    );
  }
);

PreparationOrdersMobileList.displayName = "PreparationOrdersMobileList";
