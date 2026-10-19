import type { PreparationQueueUiState } from "./usePreparationQueueUiState";
import type { PreparationQueueSettings, StatusConfig, ShortageHoldDetails } from "./types";
import { usePreparationStatusOptions } from "./usePreparationStatusOptions";
import { usePreparationEnrichedOrders } from "./usePreparationEnrichedOrders";
import { usePreparationFilterDerived } from "./usePreparationFilterDerived";

export interface UsePreparationFilterMetadataParams {
  statusConfigs: StatusConfig[];
  preparationStatuses: any[];
  preparationSettings: PreparationQueueSettings;
  orders: any[];
  inventory: any[];
  selectedWarehouseId: string;
  serverShortageOwnerOptions: string[];
  shortageHoldDrafts: Record<string, ShortageHoldDetails>;
  uiState: PreparationQueueUiState;
  deferredSearch: string;
  currentCompanyId?: string;
  clearBulkControls: () => void;
  t: (key: string, options?: any) => string;
}

export function usePreparationFilterMetadata({
  statusConfigs,
  preparationStatuses,
  preparationSettings,
  orders,
  inventory,
  selectedWarehouseId,
  serverShortageOwnerOptions,
  shortageHoldDrafts,
  uiState,
  deferredSearch,
  currentCompanyId,
  clearBulkControls,
  t,
}: UsePreparationFilterMetadataParams) {
  const statusOptionsResult = usePreparationStatusOptions({
    statusConfigs,
    preparationStatuses,
    preparationSettings,
    t,
  });

  const enrichedOrdersResult = usePreparationEnrichedOrders({
    orders,
    inventory,
    selectedWarehouseId,
    t,
  });

  const filterDerivedResult = usePreparationFilterDerived({
    serverShortageOwnerOptions,
    preparationOrders: enrichedOrdersResult.preparationOrders,
    shortageHoldDrafts,
    activeStage: uiState.activeStage,
    selectedWarehouseId: uiState.selectedWarehouseId,
    stockFilter: uiState.stockFilter,
    shortageReasonFilter: uiState.shortageReasonFilter,
    shortageFollowUpFilter: uiState.shortageFollowUpFilter,
    shortageOwnerFilter: uiState.shortageOwnerFilter,
    deferredSearch,
    notPrintedFilter: uiState.notPrintedFilter,
    noShippingCodeFilter: uiState.noShippingCodeFilter,
    sortBy: uiState.sortBy,
    sortOrder: uiState.sortOrder,
    currentCompanyId,
    clearBulkControls,
  });

  return {
    ...statusOptionsResult,
    ...enrichedOrdersResult,
    ...filterDerivedResult,
  };
}

export type UsePreparationFilterMetadataReturn = ReturnType<typeof usePreparationFilterMetadata>;
