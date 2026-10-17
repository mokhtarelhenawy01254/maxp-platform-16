import { memo, useState } from "react";
import type {
  ItemInsight,
  PreparationOrder,
  PreparationQueueSettings,
  PreparationStatusOption,
  ProblemHoldDetails,
  QcCheckKey,
  ShortageHoldDetails,
} from "../types";
import type { PreparationTableColumn } from "../constants";
import { PreparationOrdersTableHeader } from "./table/PreparationOrdersTableHeader";
import { PreparationOrdersTableRow } from "./table/PreparationOrdersTableRow";

interface PreparationOrdersTableProps {
  orders: PreparationOrder[];
  statusSelections: Record<string, string>;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
  selectedSet: Set<string>;
  rowUpdatingId: string | null;
  shortageSavingOrderId: string | null;
  problemHoldSavingOrderId: string | null;
  selectedWarehouseId: string;
  enabledQcChecks: QcCheckKey[];
  qcChecklistState: Record<string, Partial<Record<QcCheckKey, boolean>>>;
  shortageHoldDrafts: Record<string, ShortageHoldDetails>;
  problemHoldDrafts: Record<string, ProblemHoldDetails>;
  transferingItemKey: string | null;
  printingOrderNumber: string | null;
  preparationSettings: PreparationQueueSettings;
  visibleColumns: PreparationTableColumn[];
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

const PreparationOrdersTable = ({
  orders,
  statusSelections,
  statusOptions,
  statusLabelMap,
  selectedSet,
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
  visibleColumns,
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
}: PreparationOrdersTableProps) => {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleExpanded = (orderNumber: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderNumber)) {
        next.delete(orderNumber);
      } else {
        next.add(orderNumber);
      }
      return next;
    });
  };

  if (orders.length === 0) return null;

  const totalCols = visibleColumns.length + 3;

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto text-right text-sm">
        <PreparationOrdersTableHeader visibleColumns={visibleColumns} />
        <tbody>
          {orders.map((order, index) => (
            <PreparationOrdersTableRow
              key={order.orderNumber}
              order={order}
              index={index}
              totalCols={totalCols}
              isExpanded={expandedOrders.has(order.orderNumber)}
              onToggleExpanded={toggleExpanded}
              selectedSet={selectedSet}
              onToggleSelection={onToggleSelection}
              visibleColumns={visibleColumns}
              statusSelections={statusSelections}
              statusOptions={statusOptions}
              statusLabelMap={statusLabelMap}
              rowUpdatingId={rowUpdatingId}
              shortageSavingOrderId={shortageSavingOrderId}
              problemHoldSavingOrderId={problemHoldSavingOrderId}
              selectedWarehouseId={selectedWarehouseId}
              enabledQcChecks={enabledQcChecks}
              qcChecklistState={qcChecklistState}
              shortageHoldDrafts={shortageHoldDrafts}
              problemHoldDrafts={problemHoldDrafts}
              transferingItemKey={transferingItemKey}
              printingOrderNumber={printingOrderNumber}
              preparationSettings={preparationSettings}
              formatPrice={formatPrice}
              formatDate={formatDate}
              onQuickTransfer={onQuickTransfer}
              onShortageFieldChange={onShortageFieldChange}
              onSaveShortageHoldDetails={onSaveShortageHoldDetails}
              onQcCheckToggle={onQcCheckToggle}
              onStatusSelectionChange={onStatusSelectionChange}
              onSingleStatusUpdate={onSingleStatusUpdate}
              onMarkAsShortageHold={onMarkAsShortageHold}
              onReleaseShortageHold={onReleaseShortageHold}
              onMarkAsShortageFailed={onMarkAsShortageFailed}
              onHoldAsProblem={onHoldAsProblem}
              onReleaseProblemHold={onReleaseProblemHold}
              onEditProblemReason={onEditProblemReason}
              onPrintPreparationSlip={onPrintPreparationSlip}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MemoizedPreparationOrdersTable = memo(PreparationOrdersTable);
export default MemoizedPreparationOrdersTable;
