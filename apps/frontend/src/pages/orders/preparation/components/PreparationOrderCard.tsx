import { formatDate } from '@/utils/formatters';
import PreparationOrderActions from "./PreparationOrderActions";
import PreparationOrderCardHeader from "./PreparationOrderCardHeader";
import PreparationOrderItemsList from "./PreparationOrderItemsList";
import PreparationOrderNotices from "./PreparationOrderNotices";
import PreparationOrderQcChecklist from "./PreparationOrderQcChecklist";
import PreparationOrderShortagePanel from "./PreparationOrderShortagePanel";
import type {
  ItemInsight,
  PreparationOrder,
  PreparationQueueSettings,
  PreparationStatusOption,
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
  onPrintPreparationSlip,
}: PreparationOrderCardProps) => {
  const canPrepare = order.merchantFulfillment?.canPrepare !== false;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md hover:border-gray-300 ${
        shortageFollowUpVisual?.cardClass || "border-gray-200"
      }`}
    >
      <PreparationOrderCardHeader
        order={order}
        selected={selected}
        statusLabelMap={statusLabelMap}
        shortageFollowUpVisual={shortageFollowUpVisual}
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
          shortageFollowUpVisual={shortageFollowUpVisual}
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
          onPrintPreparationSlip={onPrintPreparationSlip}
        />
      </div>
    </article>
  );
};

export default PreparationOrderCard;
