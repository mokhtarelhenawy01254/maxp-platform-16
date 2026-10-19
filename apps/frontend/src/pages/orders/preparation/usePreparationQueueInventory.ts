import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { InventoryRecord } from "./types";
import { PREPARATION_QUERY_KEYS, fetchInventoryData } from "./preparationQueueQueries";

export interface UsePreparationQueueInventoryParams {
  companyId?: string;
  productIds: string[];
}

export const usePreparationQueueInventory = ({
  companyId = "",
  productIds,
}: UsePreparationQueueInventoryParams) => {
  const queryClient = useQueryClient();
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const fetchedProductIdsRef = useRef("");
  const inventoryLoadingRef = useRef(false);

  const fetchInventory = useCallback(async () => {
    const data = await queryClient.fetchQuery({
      queryKey: [...PREPARATION_QUERY_KEYS.inventory(companyId), ...productIds],
      queryFn: () => fetchInventoryData(productIds),
      staleTime: 2 * 60 * 1000,
    });
    return data;
  }, [companyId, productIds, queryClient]);

  const ensureInventory = useCallback(async () => {
    const key = [...productIds].sort().join(",");
    if (
      fetchedProductIdsRef.current === key ||
      inventoryLoadingRef.current ||
      productIds.length === 0
    ) {
      return;
    }
    fetchedProductIdsRef.current = key;
    inventoryLoadingRef.current = true;
    setInventoryLoading(true);
    try {
      const data = await fetchInventory();
      setInventory(data || []);
    } catch {
      fetchedProductIdsRef.current = "";
    } finally {
      inventoryLoadingRef.current = false;
      setInventoryLoading(false);
    }
  }, [productIds, fetchInventory]);

  const resetInventoryCache = useCallback(() => {
    fetchedProductIdsRef.current = "";
    setInventory([]);
  }, []);

  return {
    inventory,
    setInventory,
    inventoryLoading,
    ensureInventory,
    fetchInventory,
    fetchedProductIdsRef,
    resetInventoryCache,
  };
};
