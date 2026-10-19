import React from "react";
import {
  PreparationSelectionBar,
  type PreparationSelectionBarProps,
} from "./PreparationSelectionBar";
import {
  PreparationOrdersContainer,
  type PreparationOrdersContainerProps,
} from "./PreparationOrdersContainer";

export interface PreparationQueueTableSectionProps {
  selectionBarProps: PreparationSelectionBarProps;
  ordersContainerProps: PreparationOrdersContainerProps;
}

export const PreparationQueueTableSection: React.FC<
  PreparationQueueTableSectionProps
> = ({ selectionBarProps, ordersContainerProps }) => {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
      <PreparationSelectionBar {...selectionBarProps} />
      <PreparationOrdersContainer {...ordersContainerProps} />
    </section>
  );
};

export default PreparationQueueTableSection;
