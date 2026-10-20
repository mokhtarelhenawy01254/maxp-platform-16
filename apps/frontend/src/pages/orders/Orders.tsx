import React from "react";
import { OrdersToolbarSection } from "./components/OrdersToolbarSection";
import { OrdersTableSection } from "./components/OrdersTableSection";
import { OrdersModalsContainer } from "./components/OrdersModalsContainer";
import { useOrdersPageController } from "./hooks/useOrdersPageController";

/* eslint-disable react-refresh/only-export-components */
export * from "./ordersCompat";

const Orders: React.FC = () => {
  const { toolbarSectionProps, tableSectionProps, modalsContainerProps } =
    useOrdersPageController();

  return (
    <div
      data-orders-page="true"
      className="orders-page-root flex-1 h-full min-h-0 overflow-y-auto bg-slate-50/60 dark:bg-zinc-950 px-2 py-2 sm:px-3 sm:py-2.5"
    >
      <div className="w-full max-w-none">
        <OrdersToolbarSection {...toolbarSectionProps} />
        <OrdersTableSection {...tableSectionProps} />
      </div>

      <OrdersModalsContainer {...modalsContainerProps} />
    </div>
  );
};

export default Orders;
