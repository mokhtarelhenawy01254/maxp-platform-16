import React from "react";
import PreparationQueueFiltersContainer from "./preparation/components/PreparationQueueFiltersContainer";
import PreparationQueueTableSection from "./preparation/components/PreparationQueueTableSection";
import MerchantOperationsSummary from "./preparation/components/MerchantOperationsSummary";
import PreparationAlertBanners from "./preparation/components/PreparationAlertBanners";
import PreparationQueueDialogsContainer from "./preparation/components/PreparationQueueDialogsContainer";
import { usePreparationQueueController } from "./preparation/usePreparationQueueController";

export const PreparationQueue: React.FC = () => {
  const {
    isMerchantUser,
    formatPrice,
    formatDate,
    alertBannersProps,
    filtersContainerProps,
    selectionBarProps,
    ordersContainerProps,
    dialogsProps,
  } = usePreparationQueueController();

  return (
    <div className="space-y-3">
      {isMerchantUser ? (
        <MerchantOperationsSummary
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
      ) : null}

      <PreparationAlertBanners {...alertBannersProps} />
      <PreparationQueueFiltersContainer {...filtersContainerProps} />
      <PreparationQueueTableSection
        selectionBarProps={selectionBarProps}
        ordersContainerProps={ordersContainerProps}
      />
      <PreparationQueueDialogsContainer {...dialogsProps} />
    </div>
  );
};

export default PreparationQueue;
