import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import type { InventoryProductSummary, ItemInsight } from "./types";

export interface UsePreparationQuickTransferParams {
  selectedWarehouseId: string;
  inventorySummaryByProduct: Map<string, InventoryProductSummary>;
  fetchInventory: () => Promise<void> | void;
  getApiErrorMessage: (error: unknown) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export interface UsePreparationQuickTransferReturn {
  transferingItemKey: string | null;
  handleQuickTransfer: (orderNumber: string, item: ItemInsight) => Promise<void>;
}

export const usePreparationQuickTransfer = ({
  selectedWarehouseId,
  inventorySummaryByProduct,
  fetchInventory,
  getApiErrorMessage,
  t,
}: UsePreparationQuickTransferParams): UsePreparationQuickTransferReturn => {
  const [transferingItemKey, setTransferingItemKey] = useState<string | null>(null);

  const handleQuickTransfer = useCallback(
    async (orderNumber: string, item: ItemInsight) => {
      if (!selectedWarehouseId) {
        toast.error(t("preparation.page.selectWarehouseFirst"));
        return;
      }

      if (!item.productId || item.shortage <= 0) {
        toast.error(t("preparation.page.transferNoShortage"));
        return;
      }

      const productSummary = inventorySummaryByProduct.get(String(item.productId));
      const sourceWarehouse = productSummary?.warehouses.find(
        (warehouse) =>
          warehouse.warehouseId !== selectedWarehouseId &&
          warehouse.available >= item.shortage,
      );

      if (!sourceWarehouse) {
        toast.error(t("preparation.page.transferNoSource"));
        return;
      }

      const transferKey = `${orderNumber}-${item.productId}`;

      try {
        setTransferingItemKey(transferKey);
        await apiClient.post("/inventory/transfer", {
          productId: item.productId,
          fromWarehouseId: sourceWarehouse.warehouseId,
          toWarehouseId: selectedWarehouseId,
          quantity: item.shortage,
          notes: `Preparation transfer for order ${orderNumber}`,
        });

        toast.success(
          t("preparation.toasts.transferSuccess", {
            qty: item.shortage,
            source: sourceWarehouse.warehouseName,
          }),
        );
        await fetchInventory();
      } catch (error: unknown) {
        console.error("Failed quick transfer:", error);
        toast.error(
          getApiErrorMessage(error) || t("preparation.page.transferFailed"),
        );
      } finally {
        setTransferingItemKey(null);
      }
    },
    [fetchInventory, getApiErrorMessage, inventorySummaryByProduct, selectedWarehouseId, t],
  );

  return {
    transferingItemKey,
    handleQuickTransfer,
  };
};

export default usePreparationQuickTransfer;
