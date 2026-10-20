import { useTranslation } from "react-i18next";
import {
  SHORTAGE_HOLD_STATUS,
} from "../../constants";
import {
  buildProblemHoldDetails,
  buildShortageHoldDetails,
  getNextStatus,
  getQuickActionLabel,
  getShortageFollowUpState,
  getShortageFollowUpVisual,
} from "../../helpers";
import type {
  PreparationOrder,
  PreparationQueueSettings,
  ProblemHoldDetails,
  QcCheckKey,
  ShortageHoldDetails,
} from "../../types";

export interface UsePreparationTableRowDerivedStateProps {
  order: PreparationOrder;
  preparationSettings: PreparationQueueSettings;
  shortageHoldDrafts: Record<string, ShortageHoldDetails>;
  problemHoldDrafts: Record<string, ProblemHoldDetails>;
  statusSelections: Record<string, string>;
  enabledQcChecks: QcCheckKey[];
  qcChecklistState: Record<string, Partial<Record<QcCheckKey, boolean>>>;
  rowUpdatingId: string | null;
  shortageSavingOrderId: string | null;
  problemHoldSavingOrderId: string | null;
}

export const usePreparationTableRowDerivedState = ({
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
}: UsePreparationTableRowDerivedStateProps) => {
  const { t } = useTranslation();
  const canPrepare = order.merchantFulfillment?.canPrepare !== false;

  const shortageHoldDetails =
    shortageHoldDrafts[order.orderNumber] ||
    buildShortageHoldDetails(order.metadata);
  const shortageFollowUpVisual = getShortageFollowUpVisual(
    getShortageFollowUpState(
      shortageHoldDetails.followUpDate,
      order.stage,
    ),
  );
  const problemHoldDetails =
    problemHoldDrafts[order.orderNumber] ||
    buildProblemHoldDetails(order.metadata);
  const activeFollowUpVisual =
    order.stage === "STOCK_SHORTAGE" ? shortageFollowUpVisual : null;
  const nextStatus = getNextStatus(
    order.stage,
    preparationSettings.handoffStatus,
    preparationSettings.startingStatus,
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
      ? t("preparation.table.applySelectedStage")
      : getQuickActionLabel(order.stage);
  const qcCompleted = enabledQcChecks.every(
    (key) => qcChecklistState[order.orderNumber]?.[key] === true,
  );
  const rowBusy =
    rowUpdatingId === order.orderNumber ||
    shortageSavingOrderId === order.orderNumber ||
    problemHoldSavingOrderId === order.orderNumber;
  const hasShortageContext =
    order.missingItemsCount > 0 || order.stage === "STOCK_SHORTAGE";
  const isProblemHeld = order.stage === "ON_HOLD_PREP";

  return {
    canPrepare,
    shortageHoldDetails,
    shortageFollowUpVisual,
    problemHoldDetails,
    activeFollowUpVisual,
    nextStatus,
    currentStageStatus,
    defaultTargetStatus,
    currentSelection,
    actionLabel,
    qcCompleted,
    rowBusy,
    hasShortageContext,
    isProblemHeld,
  };
};
