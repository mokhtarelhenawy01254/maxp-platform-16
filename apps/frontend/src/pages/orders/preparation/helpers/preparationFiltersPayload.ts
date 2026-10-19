import type { PreparationQueueUiState } from "../usePreparationQueueUiState";

export interface BuildPreparationFiltersPayloadParams {
  uiState: PreparationQueueUiState;
  deferredSearch: string;
}

export function buildPreparationFiltersPayload({
  uiState,
  deferredSearch,
}: BuildPreparationFiltersPayloadParams) {
  return {
    stage: uiState.activeStage,
    warehouseId: uiState.selectedWarehouseId,
    stockFilter: uiState.stockFilter,
    shortageReason: uiState.shortageReasonFilter,
    shortageFollowUp: uiState.shortageFollowUpFilter,
    shortageOwner: uiState.shortageOwnerFilter,
    productFilter: uiState.productFilter,
    colorFilter: uiState.productColorFilter || undefined,
    sizeFilter: uiState.productSizeFilter || undefined,
    productId: uiState.productIdFilter || undefined,
    variantId: uiState.variantIdFilter || undefined,
    itemCountFilter: uiState.itemCountFilter,
    notPrinted:
      uiState.notPrintedFilter === "not_printed" ? "true" : undefined,
    noShippingCode:
      uiState.noShippingCodeFilter === "no_shipping_code" ? "true" : undefined,
    search: deferredSearch,
    sortBy: uiState.sortBy,
    sortOrder: uiState.sortOrder,
  };
}
