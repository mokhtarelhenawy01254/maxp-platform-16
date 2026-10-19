import { useCallback } from "react";
import type { PreparationOrder } from "./types";
import { mergePlainObjects, parseMaybeJsonObject, toUpper } from "./helpers";

export interface UsePreparationLocalMutationsParams {
  setOrders: React.Dispatch<React.SetStateAction<PreparationOrder[]>>;
  preparationOrders: PreparationOrder[];
}

export function usePreparationLocalMutations({
  setOrders,
  preparationOrders,
}: UsePreparationLocalMutationsParams) {
  const updateLocalStatuses = useCallback(
    (orderNumbers: string[], nextStatus: string) => {
      const normalized = toUpper(nextStatus);
      setOrders((previous) =>
        previous.map((order) =>
          orderNumbers.includes(order.orderNumber)
            ? {
                ...order,
                status: normalized,
                updatedAt: new Date().toISOString(),
              }
            : order,
        ),
      );
    },
    [setOrders],
  );

  const updateLocalMetadata = useCallback(
    (orderNumber: string, metadataPatch: Record<string, unknown>) => {
      setOrders((previous) =>
        previous.map((order) => {
          if (order.orderNumber !== orderNumber) return order;

          const currentMetadata = parseMaybeJsonObject(order.metadata);
          return {
            ...order,
            metadata: mergePlainObjects(currentMetadata, metadataPatch),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [setOrders],
  );

  const getOrderByNumber = useCallback(
    (orderNumber: string) =>
      preparationOrders.find((order) => order.orderNumber === orderNumber) ||
      null,
    [preparationOrders],
  );

  return {
    updateLocalStatuses,
    updateLocalMetadata,
    getOrderByNumber,
  };
}
