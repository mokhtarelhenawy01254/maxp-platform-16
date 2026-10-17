import React from "react";
import type {
  ItemInsight,
  PreparationOrder,
  PreparationQueueSettings,
  PreparationStatusOption,
  ProblemHoldDetails,
  QcCheckKey,
  ShortageHoldDetails,
} from "../../types";
import PreparationOrderItemsList from "../PreparationOrderItemsList";
import PreparationOrderNotices from "../PreparationOrderNotices";
import PreparationOrderShortagePanel from "../PreparationOrderShortagePanel";
import PreparationProblemHoldPanel from "../PreparationProblemHoldPanel";
import PreparationOrderQcChecklist from "../PreparationOrderQcChecklist";
import PreparationOrderActions from "../PreparationOrderActions";

export interface PreparationOrdersTableExpandedRowProps {
  order: PreparationOrder;
  totalCols: number;
  canPrepare: boolean;
  selectedWarehouseId: string;
  transferingItemKey: string | null;
  preparationSettings: PreparationQueueSettings;
  activeFollowUpVisual: { label: string; tone: string } | null;
  hasShortageContext: boolean;
  shortageHoldDetails: ShortageHoldDetails;
  shortageFollowUpVisual: { label: string; tone: string } | null;
  rowBusy: boolean;
  formatDate: (value: string) => string;
  onShortageFieldChange: (
    orderNumber: string,
    field: keyof ShortageHoldDetails,
    value: string | boolean,
  ) => void;
  onSaveShortageHoldDetails: (
    orderNumber: string,
    overrides?: Partial<ShortageHoldDetails>,
    options?: { successMessage?: string | null },
  ) => Promise<boolean>;
  isProblemHeld: boolean;
  problemHoldDetails: ProblemHoldDetails;
  onEditProblemReason: (orderNumber: string) => void;
  enabledQcChecks: QcCheckKey[];
  qcChecklistState: Record<string, Partial<Record<QcCheckKey, boolean>>>;
  qcCompleted: boolean;
  onQcCheckToggle: (
    orderNumber: string,
    key: QcCheckKey,
    checked: boolean,
  ) => void;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
  currentSelection: string;
  actionLabel: string;
  printingOrderNumber: string | null;
  onQuickTransfer: (orderNumber: string, item: ItemInsight) => void;
  onStatusSelectionChange: (orderNumber: string, nextStatus: string) => void;
  onSingleStatusUpdate: (orderNumber: string, nextStatus: string) => void;
  onMarkAsShortageHold: (orderNumber: string) => void;
  onReleaseShortageHold: (orderNumber: string) => void;
  onMarkAsShortageFailed: (orderNumber: string) => void;
  onHoldAsProblem: (orderNumber: string) => void;
  onReleaseProblemHold: (orderNumber: string) => void;
  onPrintPreparationSlip: (orderNumber: string) => void;
}

export const PreparationOrdersTableExpandedRow: React.FC<
  PreparationOrdersTableExpandedRowProps
> = ({
  order,
  totalCols,
  canPrepare,
  selectedWarehouseId,
  transferingItemKey,
  preparationSettings,
  activeFollowUpVisual,
  hasShortageContext,
  shortageHoldDetails,
  shortageFollowUpVisual,
  rowBusy,
  formatDate,
  onShortageFieldChange,
  onSaveShortageHoldDetails,
  isProblemHeld,
  problemHoldDetails,
  onEditProblemReason,
  enabledQcChecks,
  qcChecklistState,
  qcCompleted,
  onQcCheckToggle,
  statusOptions,
  statusLabelMap,
  currentSelection,
  actionLabel,
  printingOrderNumber,
  onQuickTransfer,
  onStatusSelectionChange,
  onSingleStatusUpdate,
  onMarkAsShortageHold,
  onReleaseShortageHold,
  onMarkAsShortageFailed,
  onHoldAsProblem,
  onReleaseProblemHold,
  onPrintPreparationSlip,
}) => {
  return (
    <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
      <td colSpan={totalCols} className="px-4 py-4">
        <div className="space-y-2.5">
          <PreparationOrderItemsList
            order={order}
            selectedWarehouseId={selectedWarehouseId}
            transferingItemKey={transferingItemKey}
            preparationSettings={preparationSettings}
            onQuickTransfer={onQuickTransfer}
          />

          <PreparationOrderNotices
            order={order}
            shortageFollowUpVisual={activeFollowUpVisual}
          />

          {canPrepare && hasShortageContext ? (
            <PreparationOrderShortagePanel
              order={order}
              shortageHoldDetails={shortageHoldDetails}
              shortageFollowUpVisual={shortageFollowUpVisual}
              rowBusy={rowBusy}
              formatDate={formatDate}
              onShortageFieldChange={onShortageFieldChange}
              onSaveShortageHoldDetails={onSaveShortageHoldDetails}
            />
          ) : null}

          {canPrepare && isProblemHeld ? (
            <PreparationProblemHoldPanel
              order={order}
              problemHoldDetails={problemHoldDetails}
              rowBusy={rowBusy}
              formatDate={formatDate}
              onEditProblemReason={onEditProblemReason}
            />
          ) : null}

          {canPrepare &&
          order.stage === "QUALITY_CHECK" &&
          preparationSettings.enableQcChecklist &&
          enabledQcChecks.length > 0 ? (
            <PreparationOrderQcChecklist
              orderNumber={order.orderNumber}
              enabledQcChecks={enabledQcChecks}
              qcChecklist={qcChecklistState[order.orderNumber]}
              qcCompleted={qcCompleted}
              onQcCheckToggle={onQcCheckToggle}
            />
          ) : null}

          <PreparationOrderActions
            order={order}
            statusOptions={statusOptions}
            statusLabelMap={statusLabelMap}
            currentSelection={currentSelection}
            actionLabel={actionLabel}
            rowBusy={rowBusy}
            printingOrderNumber={printingOrderNumber}
            preparationSettings={preparationSettings}
            onStatusSelectionChange={onStatusSelectionChange}
            onSingleStatusUpdate={onSingleStatusUpdate}
            onMarkAsShortageHold={onMarkAsShortageHold}
            onReleaseShortageHold={onReleaseShortageHold}
            onMarkAsShortageFailed={onMarkAsShortageFailed}
            onHoldAsProblem={onHoldAsProblem}
            onReleaseProblemHold={onReleaseProblemHold}
            onPrintPreparationSlip={onPrintPreparationSlip}
          />
        </div>
      </td>
    </tr>
  );
};

export default PreparationOrdersTableExpandedRow;
