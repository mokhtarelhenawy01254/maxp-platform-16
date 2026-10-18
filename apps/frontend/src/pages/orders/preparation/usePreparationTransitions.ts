import { useCallback } from "react";
import { toUpper } from "./helpers";
import type { PreparationOrder, QcCheckKey } from "./types";

export interface PreparationTransitionValidationResult {
  valid: boolean;
  message: string;
}

export interface UsePreparationTransitionsParams {
  preparationSettings: {
    enabled: boolean;
    requireStockBeforePreparing: boolean;
    allowPartialPreparation: boolean;
    allowCrossWarehouseTransfer: boolean;
    handoffStatus: string;
    enableQcChecklist: boolean;
  };
  enabledQcChecks: QcCheckKey[];
  qcChecklistState: Record<string, Partial<Record<QcCheckKey, boolean>>>;
  setQcChecklistState: React.Dispatch<
    React.SetStateAction<Record<string, Partial<Record<QcCheckKey, boolean>>>>
  >;
  userRole?: string;
  t: (key: string, options?: any) => string;
}

export interface UsePreparationTransitionsReturn {
  isQcComplete: (orderNumber: string) => boolean;
  validateTransition: (order: PreparationOrder, nextStatus: string) => PreparationTransitionValidationResult;
  handleQcCheckToggle: (orderNumber: string, key: QcCheckKey, checked: boolean) => void;
}

export function usePreparationTransitions({
  preparationSettings,
  enabledQcChecks,
  qcChecklistState,
  setQcChecklistState,
  userRole,
  t,
}: UsePreparationTransitionsParams): UsePreparationTransitionsReturn {
  const isQcComplete = useCallback(
    (orderNumber: string) => {
      if (!preparationSettings.enableQcChecklist || enabledQcChecks.length === 0) {
        return true;
      }

      return enabledQcChecks.every(
        (key) => qcChecklistState[orderNumber]?.[key] === true,
      );
    },
    [enabledQcChecks, preparationSettings.enableQcChecklist, qcChecklistState],
  );

  const validateTransition = useCallback(
    (order: PreparationOrder, nextStatus: string): PreparationTransitionValidationResult => {
      const normalizedNextStatus = toUpper(nextStatus);

      if (!preparationSettings.enabled) {
        return {
          valid: false,
          message: t("preparation.page.disabled"),
        };
      }

      if (
        preparationSettings.requireStockBeforePreparing &&
        !preparationSettings.allowPartialPreparation &&
        !order.isReady &&
        order.stage !== "WAITING" &&
        [
          "QUALITY_CHECK",
          "PACKAGED",
          preparationSettings.handoffStatus,
        ].includes(normalizedNextStatus)
      ) {
        return {
          valid: false,
          message: preparationSettings.allowCrossWarehouseTransfer
            ? t("preparation.page.transferNoSource")
            : t("preparation.page.stockMustBeComplete"),
        };
      }

      if (
        order.stage === "QUALITY_CHECK" &&
        ["PACKAGED", preparationSettings.handoffStatus].includes(normalizedNextStatus) &&
        !isQcComplete(order.orderNumber)
      ) {
        return {
          valid: false,
          message: t("preparation.page.qcChecklistRequired"),
        };
      }

      // A held-for-problem order (ON_HOLD_PREP) cannot move directly to a
      // forward preparation stage — it must be released first.
      const forwardStages = new Set([
        "PREPARING",
        "PROCESSING",
        "QUALITY_CHECK",
        "PACKAGED",
        "PACKED",
        "READY",
        "READY_TO_SHIP",
        toUpper(preparationSettings.handoffStatus),
      ]);
      if (
        order.stage === "ON_HOLD_PREP" &&
        forwardStages.has(normalizedNextStatus) &&
        !["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER"].includes(
          userRole || "",
        )
      ) {
        return {
          valid: false,
          message: t("preparation.page.holdBlocksForward"),
        };
      }

      return { valid: true, message: "" };
    },
    [
      isQcComplete,
      preparationSettings.allowCrossWarehouseTransfer,
      preparationSettings.allowPartialPreparation,
      preparationSettings.enabled,
      preparationSettings.handoffStatus,
      preparationSettings.requireStockBeforePreparing,
      userRole,
      t,
    ],
  );

  const handleQcCheckToggle = useCallback(
    (orderNumber: string, key: QcCheckKey, checked: boolean) => {
      setQcChecklistState((previous) => ({
        ...previous,
        [orderNumber]: {
          ...previous[orderNumber],
          [key]: checked,
        },
      }));
    },
    [setQcChecklistState],
  );

  return {
    isQcComplete,
    validateTransition,
    handleQcCheckToggle,
  };
}
