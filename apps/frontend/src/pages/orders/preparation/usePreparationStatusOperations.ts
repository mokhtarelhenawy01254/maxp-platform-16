import type React from "react";
import type { PreparationOrder, PreparationQueueSettings } from "./types";
import { usePreparationSingleStatusOperations } from "./usePreparationSingleStatusOperations";
import { usePreparationBulkStatusOperations } from "./usePreparationBulkStatusOperations";

export interface UsePreparationStatusOperationsParams {
  getOrderByNumber: (orderNumber: string) => PreparationOrder | null;
  validateTransition: (fromStatus: string, toStatus: string) => { valid: boolean; error?: string };
  problemHoldDrafts: Record<string, any>;
  setProblemHoldDrafts: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setProblemHoldSavingOrderId: (id: string | null) => void;
  updateLocalMetadata: (orderNumber: string, patch: Record<string, unknown>) => void;
  updateLocalStatuses: (orderNumbers: string[], status: string) => void;
  statusLabelMap: Record<string, string>;
  preparationSettings: PreparationQueueSettings;
  user: any;
  fetchAll: (options?: any) => Promise<void>;
  statusChangeDialog: any;
  setStatusChangeDialog: (dialog: any) => void;
  getApiErrorMessage: (error: any, fallback: string) => string;
  t: (key: string, options?: any) => string;

  bulkStatus: string;
  selectedOrders: string[];
  enrichedOrders: PreparationOrder[];
  clearBulkControls: () => void;
  paginationTotal: number;
  getFiltersPayload: () => any;
}

export function usePreparationStatusOperations({
  getOrderByNumber,
  validateTransition,
  problemHoldDrafts,
  setProblemHoldDrafts,
  setProblemHoldSavingOrderId,
  updateLocalMetadata,
  updateLocalStatuses,
  statusLabelMap,
  preparationSettings,
  user,
  fetchAll,
  statusChangeDialog,
  setStatusChangeDialog,
  getApiErrorMessage,
  t,
  bulkStatus,
  selectedOrders,
  enrichedOrders,
  clearBulkControls,
  paginationTotal,
  getFiltersPayload,
}: UsePreparationStatusOperationsParams) {
  const singleOps = usePreparationSingleStatusOperations({
    getOrderByNumber,
    validateTransition,
    problemHoldDrafts,
    setProblemHoldDrafts,
    setProblemHoldSavingOrderId,
    updateLocalMetadata,
    updateLocalStatuses,
    statusLabelMap,
    preparationSettings,
    user,
    fetchAll,
    statusChangeDialog,
    setStatusChangeDialog,
    getApiErrorMessage,
    t,
  });

  const bulkOps = usePreparationBulkStatusOperations({
    bulkStatus,
    selectedOrders,
    enrichedOrders,
    getOrderByNumber,
    validateTransition,
    updateLocalStatuses,
    fetchAll,
    clearBulkControls,
    statusLabelMap,
    paginationTotal,
    getFiltersPayload,
    getApiErrorMessage,
    t,
  });

  return {
    ...singleOps,
    ...bulkOps,
  };
}

export type UsePreparationStatusOperationsReturn = ReturnType<typeof usePreparationStatusOperations>;
