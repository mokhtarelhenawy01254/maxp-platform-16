import { useMemo } from "react";
import {
  getEffectivePreparationStatus,
  buildShortageHoldDetails,
  toNumber,
} from "./helpers";
import type {
  InventoryProductSummary,
  ItemInsight,
  PreparationOrder,
} from "./types";

export interface UsePreparationEnrichedOrdersParams {
  orders: any[];
  inventory: any[];
  selectedWarehouseId: string;
  t: (key: string, options?: any) => string;
}

export interface UsePreparationEnrichedOrdersReturn {
  inventorySummaryByProduct: Map<string, InventoryProductSummary>;
  preparationOrders: PreparationOrder[];
}

export function usePreparationEnrichedOrders({
  orders,
  inventory,
  selectedWarehouseId,
  t,
}: UsePreparationEnrichedOrdersParams): UsePreparationEnrichedOrdersReturn {
  const inventorySummaryByProduct = useMemo(() => {
    const map = new Map<string, InventoryProductSummary>();

    inventory.forEach((record) => {
      const productId = String(record.productId || "");
      if (!productId) return;

      if (!map.has(productId)) {
        map.set(productId, {
          productId,
          productName:
            record.products?.name ||
            record.products?.sku ||
            t("preparation.page.unnamedProduct"),
          sku: record.products?.sku || null,
          totalQuantity: 0,
          totalAvailable: 0,
          totalReserved: 0,
          warehouses: [],
        });
      }

      const entry = map.get(productId)!;
      entry.totalQuantity += toNumber(record.quantity);
      entry.totalAvailable += toNumber(record.available);
      entry.totalReserved += toNumber(record.reserved);
      entry.warehouses.push({
        warehouseId: String(record.warehouseId || ""),
        warehouseName:
          record.warehouses?.name || t("preparation.page.unnamedWarehouse"),
        quantity: toNumber(record.quantity),
        available: toNumber(record.available),
        reserved: toNumber(record.reserved),
      });
    });

    map.forEach((entry) => {
      entry.warehouses.sort((a, b) => b.available - a.available);
    });

    return map;
  }, [inventory, t]);

  const preparationOrders = useMemo(() => {
    const dedupeWarehouseName = (names: Array<string | null>) => {
      const counter = new Map<string, number>();
      names
        .filter((name): name is string => Boolean(name))
        .forEach((name) => {
          counter.set(name, (counter.get(name) || 0) + 1);
        });

      const winner = [...counter.entries()].sort((a, b) => b[1] - a[1])[0];
      return winner?.[0] || null;
    };

    return orders.reduce<PreparationOrder[]>((result, order) => {
      const normalizedStatus = getEffectivePreparationStatus(
        order.status,
        order.metadata,
      );
      const stage = normalizedStatus;
      const totalValue = toNumber(order.total);
      const shortageHoldDetails = buildShortageHoldDetails(order.metadata);

      if (!stage) {
        return result;
      }

      const itemInsights: ItemInsight[] = (order.items || []).map((item: any) => {
        const summary = inventorySummaryByProduct.get(
          String(item.productId || ""),
        );
        let availableInScope = 0;
        let reservedInScope = 0;
        let bestWarehouseName: string | null = null;
        let warehouseCount = 0;

        if (summary?.warehouses) {
          for (const w of summary.warehouses) {
            if (!selectedWarehouseId || w.warehouseId === selectedWarehouseId) {
              availableInScope += w.available;
              reservedInScope += w.reserved;
              if (!bestWarehouseName) bestWarehouseName = w.warehouseName;
              warehouseCount++;
            }
          }
        }

        const quantityNumber = Math.max(1, toNumber(item.quantity));
        const metadataProductName =
          typeof item.metadata === "object" &&
          item.metadata &&
          !Array.isArray(item.metadata) &&
          typeof item.metadata["productName"] === "string"
            ? item.metadata["productName"]
            : "";

        return {
          ...item,
          displayName:
            item.productName ||
            item.name ||
            metadataProductName ||
            t("preparation.page.unnamedProduct"),
          quantityNumber,
          availableInScope,
          reservedInScope,
          shortage: Math.max(0, quantityNumber - availableInScope),
          bestWarehouseName,
          warehouseCount,
        };
      });

      const missingItemsCount = itemInsights.filter(
        (item) => item.shortage > 0,
      ).length;
      const warehouseMatch = selectedWarehouseId
        ? itemInsights.length > 0
        : true;

      result.push({
        ...order,
        normalizedStatus,
        stage,
        totalValue,
        totalUnits: itemInsights.reduce(
          (sum, item) => sum + item.quantityNumber,
          0,
        ),
        itemInsights,
        missingItemsCount,
        isReady: itemInsights.length > 0 && missingItemsCount === 0,
        warehouseMatch,
        recommendedWarehouseName: dedupeWarehouseName(
          itemInsights.map((item) => item.bestWarehouseName),
        ),
        shortageHoldDetails,
      });

      return result;
    }, []);
  }, [inventorySummaryByProduct, orders, selectedWarehouseId, t]);

  return {
    inventorySummaryByProduct,
    preparationOrders,
  };
}
