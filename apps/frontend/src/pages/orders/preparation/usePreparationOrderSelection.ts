import { useCallback, useMemo } from "react";

export interface UsePreparationOrderSelectionParams {
  selectedOrders: string[];
  enrichedOrders: Array<{ orderNumber: string }>;
  uiActions: {
    toggleOrderSelection: (orderNumber: string) => void;
    clearVisibleSelection: (orderNumbers: string[]) => void;
    selectVisibleOrders: (orderNumbers: string[]) => void;
  };
}

export interface UsePreparationOrderSelectionReturn {
  selectedSet: Set<string>;
  allVisibleSelected: boolean;
  toggleOrderSelection: (orderNumber: string) => void;
  toggleSelectAllVisible: () => void;
}

export function usePreparationOrderSelection({
  selectedOrders,
  enrichedOrders,
  uiActions,
}: UsePreparationOrderSelectionParams): UsePreparationOrderSelectionReturn {
  const selectedSet = useMemo(() => new Set(selectedOrders), [selectedOrders]);

  const allVisibleSelected = useMemo(
    () =>
      enrichedOrders.length > 0 &&
      enrichedOrders.every((order) => selectedSet.has(order.orderNumber)),
    [enrichedOrders, selectedSet],
  );

  const toggleOrderSelection = useCallback(
    (orderNumber: string) => {
      uiActions.toggleOrderSelection(orderNumber);
    },
    [uiActions],
  );

  const toggleSelectAllVisible = useCallback(() => {
    if (allVisibleSelected) {
      uiActions.clearVisibleSelection(
        enrichedOrders.map((order) => order.orderNumber),
      );
      return;
    }

    const visibleIds = enrichedOrders.map((order) => order.orderNumber);
    uiActions.selectVisibleOrders(visibleIds);
  }, [allVisibleSelected, enrichedOrders, uiActions]);

  return {
    selectedSet,
    allVisibleSelected,
    toggleOrderSelection,
    toggleSelectAllVisible,
  };
}
