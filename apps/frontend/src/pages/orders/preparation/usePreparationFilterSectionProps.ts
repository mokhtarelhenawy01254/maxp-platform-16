import { useMemo } from "react";
import type { PreparationAlertBannersProps } from "./components/PreparationAlertBanners";
import type { PreparationQueueFiltersContainerProps } from "./components/PreparationQueueFiltersContainer";

export interface UsePreparationFilterSectionPropsOptions {
  preparationSettingsEnabled: boolean;
  allOverdueShortageFollowUpCount: number;
  allOverdueProblemFollowUpCount: number;

  showFilters: boolean;
  uiState: any;
  uiActions: any;
  statusCounts: any;
  stageCounts: any;
  filterTabs: any;
  visibleOrdersCount: number;
  warehouseOptions: any[];
  shortageOwnerOptions: any[];
  productSuggestions: any[];
}

export function usePreparationFilterSectionProps(options: UsePreparationFilterSectionPropsOptions) {
  const alertBannersProps = useMemo<PreparationAlertBannersProps>(
    () => ({
      preparationSettingsEnabled: options.preparationSettingsEnabled,
      allOverdueShortageFollowUpCount: options.allOverdueShortageFollowUpCount,
      allOverdueProblemFollowUpCount: options.allOverdueProblemFollowUpCount,
    }),
    [
      options.preparationSettingsEnabled,
      options.allOverdueShortageFollowUpCount,
      options.allOverdueProblemFollowUpCount,
    ],
  );

  const filtersContainerProps = useMemo<PreparationQueueFiltersContainerProps>(
    () => ({
      showFilters: options.showFilters,
      uiState: options.uiState,
      uiActions: options.uiActions,
      statusCounts: options.statusCounts,
      stageCounts: options.stageCounts,
      filterTabs: options.filterTabs,
      visibleOrdersCount: options.visibleOrdersCount,
      warehouseOptions: options.warehouseOptions,
      shortageOwnerOptions: options.shortageOwnerOptions,
      productSuggestions: options.productSuggestions,
    }),
    [
      options.showFilters,
      options.uiState,
      options.uiActions,
      options.statusCounts,
      options.stageCounts,
      options.filterTabs,
      options.visibleOrdersCount,
      options.warehouseOptions,
      options.shortageOwnerOptions,
      options.productSuggestions,
    ],
  );

  return { alertBannersProps, filtersContainerProps };
}
