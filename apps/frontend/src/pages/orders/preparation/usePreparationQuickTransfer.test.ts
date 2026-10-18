import { renderHook, act } from "@testing-library/react";
import { usePreparationQuickTransfer } from "./usePreparationQuickTransfer";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import type { InventoryProductSummary, ItemInsight } from "./types";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockProductSummary: InventoryProductSummary = {
  productId: "prod-1",
  productName: "Air Filter Premium",
  totalQuantity: 20,
  totalAvailable: 15,
  totalReserved: 5,
  warehouses: [
    {
      warehouseId: "wh-main",
      warehouseName: "Main Cairo Hub",
      quantity: 2,
      available: 0,
      reserved: 2,
    },
    {
      warehouseId: "wh-alex",
      warehouseName: "Alexandria Branch",
      quantity: 18,
      available: 15,
      reserved: 3,
    },
  ],
};

const mockItemInsight: ItemInsight = {
  id: "item-1",
  productId: "prod-1",
  displayName: "Air Filter Premium",
  quantityNumber: 3,
  availableInScope: 0,
  reservedInScope: 2,
  shortage: 3,
  bestWarehouseName: "Alexandria Branch",
  warehouseCount: 2,
};

describe("usePreparationQuickTransfer", () => {
  const fetchInventory = jest.fn();
  const getApiErrorMessage = jest.fn((e: any) => e?.message || "Transfer error");
  const t = (k: string, opts?: any) => {
    if (opts) return `${k}:${JSON.stringify(opts)}`;
    return k;
  };

  const inventorySummaryByProduct = new Map<string, InventoryProductSummary>([
    ["prod-1", mockProductSummary],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fails if no warehouse is selected", async () => {
    const { result } = renderHook(() =>
      usePreparationQuickTransfer({
        selectedWarehouseId: "",
        inventorySummaryByProduct,
        fetchInventory,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleQuickTransfer("ORD-101", mockItemInsight);
    });

    expect(toast.error).toHaveBeenCalledWith("preparation.page.selectWarehouseFirst");
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("fails if shortage is zero or missing productId", async () => {
    const { result } = renderHook(() =>
      usePreparationQuickTransfer({
        selectedWarehouseId: "wh-main",
        inventorySummaryByProduct,
        fetchInventory,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleQuickTransfer("ORD-101", {
        ...mockItemInsight,
        shortage: 0,
      });
    });

    expect(toast.error).toHaveBeenCalledWith("preparation.page.transferNoShortage");
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("fails if no alternative warehouse has sufficient available stock", async () => {
    const { result } = renderHook(() =>
      usePreparationQuickTransfer({
        selectedWarehouseId: "wh-main",
        inventorySummaryByProduct,
        fetchInventory,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleQuickTransfer("ORD-101", {
        ...mockItemInsight,
        shortage: 50, // Available in Alexandria is only 15
      });
    });

    expect(toast.error).toHaveBeenCalledWith("preparation.page.transferNoSource");
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("executes transfer successfully from alternative warehouse", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() =>
      usePreparationQuickTransfer({
        selectedWarehouseId: "wh-main",
        inventorySummaryByProduct,
        fetchInventory,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleQuickTransfer("ORD-101", mockItemInsight);
    });

    expect(apiClient.post).toHaveBeenCalledWith("/inventory/transfer", {
      productId: "prod-1",
      fromWarehouseId: "wh-alex",
      toWarehouseId: "wh-main",
      quantity: 3,
      notes: "Preparation transfer for order ORD-101",
    });
    expect(toast.success).toHaveBeenCalled();
    expect(fetchInventory).toHaveBeenCalled();
    expect(result.current.transferingItemKey).toBeNull();
  });

  it("handles transfer API errors and clears loading state", async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error("Transfer network timeout"));

    const { result } = renderHook(() =>
      usePreparationQuickTransfer({
        selectedWarehouseId: "wh-main",
        inventorySummaryByProduct,
        fetchInventory,
        getApiErrorMessage,
        t,
      }),
    );

    await act(async () => {
      await result.current.handleQuickTransfer("ORD-101", mockItemInsight);
    });

    expect(toast.error).toHaveBeenCalledWith("Transfer network timeout");
    expect(result.current.transferingItemKey).toBeNull();
  });
});
