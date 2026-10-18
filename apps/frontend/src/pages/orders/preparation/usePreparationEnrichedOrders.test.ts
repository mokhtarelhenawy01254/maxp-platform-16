import { renderHook } from "@testing-library/react";
import { usePreparationEnrichedOrders } from "./usePreparationEnrichedOrders";

describe("usePreparationEnrichedOrders", () => {
  const mockT = jest.fn((key: string) => key);

  const mockInventory = [
    {
      productId: "prod-1",
      warehouseId: "wh-1",
      quantity: 10,
      available: 8,
      reserved: 2,
      warehouses: { name: "Main Warehouse" },
      products: { name: "T-Shirt Black", sku: "TSH-BLK-M" },
    },
    {
      productId: "prod-1",
      warehouseId: "wh-2",
      quantity: 5,
      available: 3,
      reserved: 2,
      warehouses: { name: "Branch Warehouse" },
      products: { name: "T-Shirt Black", sku: "TSH-BLK-M" },
    },
  ];

  const mockOrders = [
    {
      id: "ord-1",
      orderNumber: "ORD-001",
      status: "PREPARING",
      total: 300,
      items: [
        {
          productId: "prod-1",
          productName: "T-Shirt Black",
          quantity: 5,
        },
      ],
    },
    {
      id: "ord-2",
      orderNumber: "ORD-002",
      status: "PREPARING",
      total: 500,
      items: [
        {
          productId: "prod-1",
          productName: "T-Shirt Black",
          quantity: 20, // Shortage: 20 requested, only 11 available in total
        },
      ],
    },
  ];

  it("aggregates inventory records by productId correctly", () => {
    const { result } = renderHook(() =>
      usePreparationEnrichedOrders({
        orders: [],
        inventory: mockInventory,
        selectedWarehouseId: "",
        t: mockT,
      }),
    );

    const summary = result.current.inventorySummaryByProduct.get("prod-1");
    expect(summary).toBeDefined();
    expect(summary?.totalQuantity).toBe(15);
    expect(summary?.totalAvailable).toBe(11);
    expect(summary?.totalReserved).toBe(4);
    expect(summary?.warehouses.length).toBe(2);
    // Verified sorted by available descending
    expect(summary?.warehouses[0].available).toBe(8);
  });

  it("enriches orders with item insights, availability, and readiness flag", () => {
    const { result } = renderHook(() =>
      usePreparationEnrichedOrders({
        orders: mockOrders,
        inventory: mockInventory,
        selectedWarehouseId: "",
        t: mockT,
      }),
    );

    const orders = result.current.preparationOrders;
    expect(orders.length).toBe(2);

    // First order needs 5, available is 11 -> isReady = true, missingItemsCount = 0
    expect(orders[0].orderNumber).toBe("ORD-001");
    expect(orders[0].isReady).toBe(true);
    expect(orders[0].missingItemsCount).toBe(0);
    expect(orders[0].totalUnits).toBe(5);

    // Second order needs 20, available is 11 -> shortage = 9, isReady = false
    expect(orders[1].orderNumber).toBe("ORD-002");
    expect(orders[1].isReady).toBe(false);
    expect(orders[1].missingItemsCount).toBe(1);
    expect(orders[1].itemInsights[0].shortage).toBe(9);
  });

  it("restricts available stock to selectedWarehouseId when provided", () => {
    const { result } = renderHook(() =>
      usePreparationEnrichedOrders({
        orders: [mockOrders[0]],
        inventory: mockInventory,
        selectedWarehouseId: "wh-2", // Only 3 available in wh-2
        t: mockT,
      }),
    );

    const order = result.current.preparationOrders[0];
    expect(order.isReady).toBe(false); // needs 5, only 3 available in wh-2
    expect(order.itemInsights[0].availableInScope).toBe(3);
    expect(order.itemInsights[0].shortage).toBe(2);
  });
});
