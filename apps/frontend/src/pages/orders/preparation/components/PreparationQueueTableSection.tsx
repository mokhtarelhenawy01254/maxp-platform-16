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
    <section className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-xs overflow-hidden">
      <PreparationSelectionBar {...selectionBarProps} />
      <PreparationOrdersContainer {...ordersContainerProps} />
    </section>
  );
};

export default PreparationQueueTableSection;
