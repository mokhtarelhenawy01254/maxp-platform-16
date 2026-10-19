import React from "react";
import PreparationFilters from "./PreparationFilters";
import type { PreparationFiltersProps } from "./PreparationFilters";
import type {
  PreparationQueueUiState,
  PreparationQueueUiActions,
} from "../usePreparationQueueUiState";
import type {
  ProductSuggestion,
  StageCounts,
  WarehouseOption,
} from "../types";

export type PreparationQueueFiltersContainerProps =
  | (PreparationFiltersProps & {
      showFilters: boolean;
      uiState?: never;
      uiActions?: never;
    })
  | {
      showFilters: boolean;
      uiState: PreparationQueueUiState;
      uiActions: PreparationQueueUiActions;
      statusCounts: Record<string, number>;
      stageCounts: StageCounts;
      filterTabs: { statusCode: string; name: string }[];
      visibleOrdersCount: number;
      warehouseOptions: WarehouseOption[];
      shortageOwnerOptions: string[];
      productSuggestions: ProductSuggestion[];
    };

export const PreparationQueueFiltersContainer: React.FC<
  PreparationQueueFiltersContainerProps
> = (props) => {
  if (!props.showFilters) return null;

  if ("uiState" in props && props.uiState && props.uiActions) {
    const { uiState, uiActions } = props;
    return (
      <PreparationFilters
        activeFilter={uiState.activeStage}
        statusCounts={props.statusCounts}
        stageCounts={props.stageCounts}
        filterTabs={props.filterTabs}
        visibleOrdersCount={props.visibleOrdersCount}
        search={uiState.search}
        selectedWarehouseId={uiState.selectedWarehouseId}
        stockFilter={uiState.stockFilter}
        shortageReasonFilter={uiState.shortageReasonFilter}
        shortageOwnerFilter={uiState.shortageOwnerFilter}
        shortageFollowUpFilter={uiState.shortageFollowUpFilter}
        productFilter={uiState.productFilter}
        productColorFilter={uiState.productColorFilter}
        productSizeFilter={uiState.productSizeFilter}
        productIdFilter={uiState.productIdFilter}
        variantIdFilter={uiState.variantIdFilter}
        itemCountFilter={uiState.itemCountFilter}
        notPrintedFilter={uiState.notPrintedFilter}
        noShippingCodeFilter={uiState.noShippingCodeFilter}
        sortBy={uiState.sortBy}
        sortOrder={uiState.sortOrder}
        shortageOwnerOptions={props.shortageOwnerOptions}
        productSuggestions={props.productSuggestions}
        warehouses={props.warehouseOptions}
        products={[]}
        productsLoading={false}
        onFilterChange={uiActions.setActiveStage}
        onSearchChange={uiActions.setSearch}
        onSelectedWarehouseChange={uiActions.setSelectedWarehouse}
        onStockFilterChange={uiActions.setStockFilter}
        onShortageReasonFilterChange={uiActions.setShortageReasonFilter}
        onShortageOwnerFilterChange={uiActions.setShortageOwnerFilter}
        onShortageFollowUpFilterChange={uiActions.setShortageFollowUpFilter}
        onProductFilterChange={uiActions.setProductFilter}
        onProductColorFilterChange={uiActions.setProductColorFilter}
        onProductSizeFilterChange={uiActions.setProductSizeFilter}
        onProductIdFilterChange={uiActions.setProductIdFilter}
        onVariantIdFilterChange={uiActions.setVariantIdFilter}
        onItemCountFilterChange={uiActions.setItemCountFilter}
        onNotPrintedFilterChange={uiActions.setNotPrintedFilter}
        onNoShippingCodeFilterChange={uiActions.setNoShippingCodeFilter}
        onSortChange={(sortBy, sortOrder) =>
          uiActions.setSort({ sortBy, sortOrder })
        }
      />
    );
  }

  const { showFilters: _unused, ...filtersProps } = props as PreparationFiltersProps & {
    showFilters: boolean;
  };
  return <PreparationFilters {...filtersProps} />;
};

export default PreparationQueueFiltersContainer;
