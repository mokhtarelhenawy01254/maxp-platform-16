import type {
  ItemInsight,
  PreparationOrder,
  PreparationQueueSettings,
  PreparationStatusOption,
  ProblemHoldDetails,
  QcCheckKey,
  ShortageHoldDetails,
} from "../../types";
import type { PreparationTableColumn } from "../../constants";

export interface PreparationOrdersTableRowProps {
  order: PreparationOrder;
  index: number;
  totalCols: number;
  isExpanded: boolean;
  onToggleExpanded: (orderNumber: string) => void;
  selectedSet: Set<string>;
  onToggleSelection: (orderNumber: string) => void;
  visibleColumns: PreparationTableColumn[];
  statusSelections: Record<string, string>;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
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
  formatPrice: (value: number) => string;
  formatDate: (value: string) => string;
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
