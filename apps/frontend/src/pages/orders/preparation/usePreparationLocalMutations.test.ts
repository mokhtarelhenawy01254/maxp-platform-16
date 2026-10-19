import { renderHook, act } from "@testing-library/react";
import { usePreparationLocalMutations } from "./usePreparationLocalMutations";
import type { PreparationOrder } from "./types";

describe("usePreparationLocalMutations", () => {
  it("updates local status for matching orders", () => {
    let orders: PreparationOrder[] = [
      { orderNumber: "ORD-1", status: "PENDING" } as PreparationOrder,
      { orderNumber: "ORD-2", status: "PENDING" } as PreparationOrder,
    ];
    const setOrders = jest.fn((updater) => {
      orders = updater(orders);
    });

    const { result } = renderHook(() =>
      usePreparationLocalMutations({
        setOrders,
        preparationOrders: orders,
      }),
    );

    act(() => {
      result.current.updateLocalStatuses(["ORD-1"], "PROCESSING");
    });

    expect(setOrders).toHaveBeenCalled();
    expect(orders[0].status).toBe("PROCESSING");
    expect(orders[1].status).toBe("PENDING");
  });

  it("updates local metadata for matching order without mutating others", () => {
    let orders: PreparationOrder[] = [
      {
        orderNumber: "ORD-1",
        metadata: JSON.stringify({ note: "first", count: 1 }),
      } as unknown as PreparationOrder,
      {
        orderNumber: "ORD-2",
        metadata: null,
      } as unknown as PreparationOrder,
    ];
    const setOrders = jest.fn((updater) => {
      orders = updater(orders);
    });

    const { result } = renderHook(() =>
      usePreparationLocalMutations({
        setOrders,
        preparationOrders: orders,
      }),
    );

    act(() => {
      result.current.updateLocalMetadata("ORD-1", { note: "updated", isVip: true });
    });

    expect(setOrders).toHaveBeenCalled();
    const updatedMeta = orders[0].metadata as any;
    expect(updatedMeta.note).toBe("updated");
    expect(updatedMeta.count).toBe(1);
    expect(updatedMeta.isVip).toBe(true);
  });

  it("finds order by orderNumber accurately", () => {
    const orders: PreparationOrder[] = [
      { orderNumber: "ORD-1", id: "1" } as PreparationOrder,
      { orderNumber: "ORD-2", id: "2" } as PreparationOrder,
    ];
    const setOrders = jest.fn();

    const { result } = renderHook(() =>
      usePreparationLocalMutations({
        setOrders,
        preparationOrders: orders,
      }),
    );

    expect(result.current.getOrderByNumber("ORD-2")?.id).toBe("2");
    expect(result.current.getOrderByNumber("ORD-999")).toBeNull();
  });
});
