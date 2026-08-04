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
  onSaveProblemHoldDetails: (
    orderNumber: string,
    overrides?: Partial<ProblemHoldDetails>,
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
  onHoldAsProblem: (orderNumber: string) => void;
  onReleaseProblemHold: (orderNumber: string) => void;
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
  onSaveProblemHoldDetails,
  onQcCheckToggle,
  onStatusSelectionChange,
  onSingleStatusUpdate,
  onMarkAsShortageHold,
  onReleaseShortageHold,
  onHoldAsProblem,
  onReleaseProblemHold,
  onPrintPreparationSlip,
}: PreparationOrderCardProps) => {
  const canPrepare = order.merchantFulfillment?.canPrepare !== false;
  const isProblemHeld = order.stage === "ON_HOLD_PREP";
  const activeFollowUpVisual =
    isProblemHeld ? null : shortageFollowUpVisual;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 active:scale-[0.99] hover:shadow-md hover:border-gray-300 dark:bg-gray-800 dark:shadow-gray-900/30 ${
        activeFollowUpVisual?.cardClass || "border-gray-200 dark:border-gray-700"
      } ${isProblemHeld ? "border-amber-300 dark:border-amber-700" : ""}`}
    >
      <PreparationOrderCardHeader
        order={order}
        selected={selected}
        statusLabelMap={statusLabelMap}
        shortageFollowUpVisual={activeFollowUpVisual}
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
            onSaveProblemHoldDetails={onSaveProblemHoldDetails}
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
          onHoldAsProblem={onHoldAsProblem}
          onReleaseProblemHold={onReleaseProblemHold}
          onPrintPreparationSlip={onPrintPreparationSlip}
        />
      </div>
    </article>
  );
};

export default PreparationOrderCard;
