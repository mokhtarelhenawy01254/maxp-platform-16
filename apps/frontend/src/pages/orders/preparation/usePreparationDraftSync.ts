import { useEffect } from "react";
import { buildShortageHoldDetails, buildProblemHoldDetails } from "./helpers";
import type { PreparationOrder, ShortageHoldDetails, ProblemHoldDetails } from "./types";
import type { PreparationQueueUiActions } from "./usePreparationQueueUiState";

export interface UsePreparationDraftSyncParams {
  orders: PreparationOrder[];
  setShortageHoldDrafts: React.Dispatch<React.SetStateAction<Record<string, ShortageHoldDetails>>>;
  setProblemHoldDrafts: React.Dispatch<React.SetStateAction<Record<string, ProblemHoldDetails>>>;
  defaultWarehouseId?: string;
  uiActions: PreparationQueueUiActions;
  inventoryLength: number;
  inventoryLoading: boolean;
  ensureInventory: () => void;
}

export function usePreparationDraftSync({
  orders,
  setShortageHoldDrafts,
  setProblemHoldDrafts,
  defaultWarehouseId,
  uiActions,
  inventoryLength,
  inventoryLoading,
  ensureInventory,
}: UsePreparationDraftSyncParams) {
  useEffect(() => {
    if (defaultWarehouseId) {
      uiActions.applyDefaultWarehouse(defaultWarehouseId);
    }
  }, [defaultWarehouseId, uiActions]);

  useEffect(() => {
    if (orders.length > 0 && inventoryLength === 0 && !inventoryLoading) {
      ensureInventory();
    }
  }, [orders.length, inventoryLength, inventoryLoading, ensureInventory]);

  useEffect(() => {
    setShortageHoldDrafts((previous) => {
      const nextDrafts = { ...previous };

      orders.forEach((order) => {
        if (!nextDrafts[order.orderNumber]) {
          nextDrafts[order.orderNumber] = buildShortageHoldDetails(order.metadata);
        }
      });

      return nextDrafts;
    });
  }, [orders, setShortageHoldDrafts]);

  useEffect(() => {
    setProblemHoldDrafts((previous) => {
      const nextDrafts = { ...previous };

      orders.forEach((order) => {
        if (!nextDrafts[order.orderNumber]) {
          nextDrafts[order.orderNumber] = buildProblemHoldDetails(order.metadata);
        }
      });

      return nextDrafts;
    });
  }, [orders, setProblemHoldDrafts]);
}
