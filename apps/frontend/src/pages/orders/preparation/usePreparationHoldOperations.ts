import type { PreparationOrder } from "./types";
import { usePreparationShortageOperations } from "./usePreparationShortageOperations";
import { usePreparationProblemOperations } from "./usePreparationProblemOperations";

export interface UsePreparationHoldOperationsOptions {
  orders: PreparationOrder[];
  user: any;
  startingStatus?: string;
  updateLocalMetadata: (orderNumber: string, patch: Record<string, unknown>) => void;
  updateLocalStatuses: (orderNumbers: string[], status: string) => void;
  getOrderByNumber: (orderNumber: string) => PreparationOrder | null;
  fetchAll: () => Promise<void> | void;
  handleSingleStatusUpdate: (orderNumber: string, status: string) => Promise<boolean | void>;
  setStatusChangeDialog: (dialog: any) => void;
  getApiErrorMessage: (err: any, fallback: string) => string;
  t: any;
}

export function usePreparationHoldOperations({
  orders,
  user,
  startingStatus,
  updateLocalMetadata,
  updateLocalStatuses,
  getOrderByNumber,
  fetchAll,
  handleSingleStatusUpdate,
  setStatusChangeDialog,
  getApiErrorMessage,
  t,
}: UsePreparationHoldOperationsOptions) {
  const shortageOps = usePreparationShortageOperations({
    orders,
    startingStatus,
    updateLocalMetadata,
    fetchAll,
    handleSingleStatusUpdate,
    getApiErrorMessage,
    t,
  });

  const problemOps = usePreparationProblemOperations({
    orders,
    user,
    startingStatus,
    getOrderByNumber,
    updateLocalMetadata,
    updateLocalStatuses,
    fetchAll,
    setStatusChangeDialog,
    getApiErrorMessage,
    t,
  });

  return {
    ...shortageOps,
    ...problemOps,
  };
}
