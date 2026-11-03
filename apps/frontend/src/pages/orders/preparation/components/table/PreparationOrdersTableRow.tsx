import React, { Fragment } from "react";
import PreparationOrdersTableExpandedRow from "./PreparationOrdersTableExpandedRow";
import { PreparationOrdersTableRowMainCells } from "./PreparationOrdersTableRowMainCells";
import { usePreparationTableRowDerivedState } from "./usePreparationTableRowDerivedState";
import type { PreparationOrdersTableRowProps } from "./tableTypes";

export const PreparationOrdersTableRow: React.FC<PreparationOrdersTableRowProps> = ({
  order,
  index,
  totalCols,
  isExpanded,
  onToggleExpanded,
  selectedSet,
  onToggleSelection,
  visibleColumns,
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
  onQuickTransfer,
  onShortageFieldChange,
  onSaveShortageHoldDetails,
  onQcCheckToggle,
  onStatusSelectionChange,
  onSingleStatusUpdate,
  onMarkAsShortageHold,
  onReleaseShortageHold,
  onMarkAsShortageFailed,
  onHoldAsProblem,
  onReleaseProblemHold,
  onEditProblemReason,
  onPrintPreparationSlip,
}) => {
  const {
    canPrepare,
    shortageHoldDetails,
    shortageFollowUpVisual,
    problemHoldDetails,
    activeFollowUpVisual,
    currentSelection,
    actionLabel,
    qcCompleted,
    rowBusy,
    hasShortageContext,
    isProblemHeld,
  } = usePreparationTableRowDerivedState({
    order,
    preparationSettings,
    shortageHoldDrafts,
    problemHoldDrafts,
    statusSelections,
    enabledQcChecks,
    qcChecklistState,
    rowUpdatingId,
    shortageSavingOrderId,
    problemHoldSavingOrderId,
  });

  const isEvenRow = index % 2 === 0;

  return (
    <Fragment key={order.orderNumber}>
      <tr
        className={`border-b border-border/40 transition-colors hover:bg-muted/40 ${
          isEvenRow ? "bg-card" : "bg-muted/15"
        } ${isExpanded ? "bg-muted/30 shadow-xs" : ""}`}
      >
        <PreparationOrdersTableRowMainCells
          order={order}
          canPrepare={canPrepare}
          selectedSet={selectedSet}
          onToggleSelection={onToggleSelection}
          visibleColumns={visibleColumns}
          shortageFollowUpVisual={shortageFollowUpVisual}
          isProblemHeld={isProblemHeld}
          problemHoldDetails={problemHoldDetails}
          rowBusy={rowBusy}
          onEditProblemReason={onEditProblemReason}
          formatPrice={formatPrice}
          formatDate={formatDate}
          isExpanded={isExpanded}
          onToggleExpanded={onToggleExpanded}
        />
      </tr>

      {/* Expanded details row */}
      {isExpanded && (
        <PreparationOrdersTableExpandedRow
          order={order}
          totalCols={totalCols}
          canPrepare={canPrepare}
          selectedWarehouseId={selectedWarehouseId}
          transferingItemKey={transferingItemKey}
          preparationSettings={preparationSettings}
          activeFollowUpVisual={activeFollowUpVisual}
          hasShortageContext={hasShortageContext}
          shortageHoldDetails={shortageHoldDetails}
          shortageFollowUpVisual={shortageFollowUpVisual}
          rowBusy={rowBusy}
          formatDate={formatDate}
          onShortageFieldChange={onShortageFieldChange}
          onSaveShortageHoldDetails={onSaveShortageHoldDetails}
          isProblemHeld={isProblemHeld}
          problemHoldDetails={problemHoldDetails}
          onEditProblemReason={onEditProblemReason}
          enabledQcChecks={enabledQcChecks}
          qcChecklistState={qcChecklistState}
          qcCompleted={qcCompleted}
          onQcCheckToggle={onQcCheckToggle}
          statusOptions={statusOptions}
          statusLabelMap={statusLabelMap}
          currentSelection={currentSelection}
          actionLabel={actionLabel}
          printingOrderNumber={printingOrderNumber}
          onQuickTransfer={onQuickTransfer}
          onStatusSelectionChange={onStatusSelectionChange}
          onSingleStatusUpdate={onSingleStatusUpdate}
          onMarkAsShortageHold={onMarkAsShortageHold}
          onReleaseShortageHold={onReleaseShortageHold}
          onMarkAsShortageFailed={onMarkAsShortageFailed}
          onHoldAsProblem={onHoldAsProblem}
          onReleaseProblemHold={onReleaseProblemHold}
          onPrintPreparationSlip={onPrintPreparationSlip}
        />
      )}
    </Fragment>
  );
};

export default PreparationOrdersTableRow;
