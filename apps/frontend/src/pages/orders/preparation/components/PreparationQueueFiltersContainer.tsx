import React from "react";
import PreparationFilters from "./PreparationFilters";
import type { PreparationFiltersProps } from "./PreparationFilters";

export interface PreparationQueueFiltersContainerProps
  extends PreparationFiltersProps {
  showFilters: boolean;
}

export const PreparationQueueFiltersContainer: React.FC<
  PreparationQueueFiltersContainerProps
> = ({ showFilters, ...filtersProps }) => {
  if (!showFilters) return null;

  return <PreparationFilters {...filtersProps} />;
};

export default PreparationQueueFiltersContainer;
