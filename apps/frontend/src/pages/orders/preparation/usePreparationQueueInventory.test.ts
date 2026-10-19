import { renderHook, act } from "@testing-library/react";
import { usePreparationQueueInventory } from "./usePreparationQueueInventory";
import { useQueryClient } from "@tanstack/react-query";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

describe("usePreparationQueueInventory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches inventory when ensureInventory is called with productIds", async () => {
    const fetchQueryMock = jest.fn().mockResolvedValue([
      { productId: "p1", quantity: 10, availableQuantity: 8 },
    ]);
    (useQueryClient as jest.Mock).mockReturnValue({
      fetchQuery: fetchQueryMock,
    });

    const { result } = renderHook(() =>
      usePreparationQueueInventory({ companyId: "c1", productIds: ["p1"] }),
    );

    await act(async () => {
      await result.current.ensureInventory();
    });

    expect(result.current.inventory).toEqual([
      { productId: "p1", quantity: 10, availableQuantity: 8 },
    ]);
  });

  it("skips duplicate fetch if productIds key has not changed", async () => {
    const fetchQueryMock = jest.fn().mockResolvedValue([]);
    (useQueryClient as jest.Mock).mockReturnValue({
      fetchQuery: fetchQueryMock,
    });

    const { result } = renderHook(() =>
      usePreparationQueueInventory({ companyId: "c1", productIds: ["p1"] }),
    );

    await act(async () => {
      await result.current.ensureInventory();
    });
    expect(fetchQueryMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.ensureInventory();
    });
    expect(fetchQueryMock).toHaveBeenCalledTimes(1);
  });
});
