import PreparationOrderActions from "./PreparationOrderActions";
import PreparationOrderCardHeader from "./PreparationOrderCardHeader";
import PreparationOrderItemsList from "./PreparationOrderItemsList";
import PreparationOrderNotices from "./PreparationOrderNotices";
import PreparationOrderQcChecklist from "./PreparationOrderQcChecklist";
import PreparationOrderShortagePanel from "./PreparationOrderShortagePanel";
import PreparationProblemHoldPanel from "./PreparationProblemHoldPanel";
import type {
  ItemInsight,
  PreparationOrder,
  PreparationQueueSettings,
  PreparationStatusOption,
  ProblemHoldDetails,
  QcCheckKey,
  ShortageFollowUpVisual,
  ShortageHoldDetails,
} from "../types";

interface PreparationOrderCardProps {
  order: PreparationOrder;
  selected: boolean;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
  currentSelection: string;
  actionLabel: string;
  qcCompleted: boolean;
  rowBusy: boolean;
  hasShortageContext: boolean;
  selectedWarehouseId: string;
  enabledQcChecks: QcCheckKey[];
  qcChecklist: Partial<Record<QcCheckKey, boolean>> | undefined;
  shortageHoldDetails: ShortageHoldDetails;
  shortageFollowUpVisual: ShortageFollowUpVisual | null;
  problemHoldDetails: ProblemHoldDetails;
  transferingItemKey: string | null;
  printingOrderNumber: string | null;
  preparationSettings: PreparationQueueSettings;
  formatPrice: (value: number) => string;
  formatDate: (value: string) => string;
  onToggleSelection: (orderNumber: string) => void;
  onQuickTransfer: (orderNumber: string, item: ItemInsight) => void;
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
  onQcCheckToggle: (
    orderNumber: string,
    key: QcCheckKey,
    checked: boolean,
  ) => void;
  onStatusSelectionChange: (orderNumber: string, nextStatus: string) => void;
  onSingleStatusUpdate: (orderNumber: string, nextStatus: string) => void;
  onMarkAsShortageHold: (orderNumber: string) => void;
  onReleaseShortageHold: (orderNumber: string) => void;
  onMarkAsShortageFailed: (orderNumber: string) => void;
  onHoldAsProblem: (orderNumber: string) => void;
  onReleaseProblemHold: (orderNumber: string) => void;
  onEditProblemReason: (orderNumber: string) => void;
  onPrintPreparationSlip: (orderNumber: string) => void;
}

const PreparationOrderCard = ({
  order,
  selected,
  statusOptions,
  statusLabelMap,
  currentSelection,
  actionLabel,
  qcCompleted,
  rowBusy,
  hasShortageContext,
  selectedWarehouseId,
  enabledQcChecks,
  qcChecklist,
  shortageHoldDetails,
  shortageFollowUpVisual,
  problemHoldDetails,
  transferingItemKey,
  printingOrderNumber,
  preparationSettings,
  formatPrice,
  formatDate,
  onToggleSelection,
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
}: PreparationOrderCardProps) => {
  const canPrepare = order.merchantFulfillment?.canPrepare !== false;
  const isProblemHeld = order.stage === "ON_HOLD_PREP";
  const activeFollowUpVisual =
    isProblemHeld ? null : shortageFollowUpVisual;

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-card text-card-foreground transition-all duration-150 ${
        selected ? "ring-1 ring-primary/40 border-primary/50" : ""
      } ${
        activeFollowUpVisual?.cardClass || "border-border/70 hover:border-border"
      } ${isProblemHeld ? "border-amber-500/40 bg-amber-500/[0.02]" : ""}`}
    >
      <PreparationOrderCardHeader
        order={order}
        selected={selected}
        statusLabelMap={statusLabelMap}
        shortageFollowUpVisual={activeFollowUpVisual}
        problemHoldReason={isProblemHeld ? problemHoldDetails.reason : ""}
        onEditProblemReason={
          isProblemHeld ? onEditProblemReason : undefined
        }
          formatPrice={formatPrice}
          formatDate={formatDate}
          onToggleSelection={onToggleSelection}
        />

      <div className="space-y-2.5 p-3">
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
            qcChecklist={qcChecklist}
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
    </article>
  );
};

export { PreparationOrderCard };
export default PreparationOrderCard;
