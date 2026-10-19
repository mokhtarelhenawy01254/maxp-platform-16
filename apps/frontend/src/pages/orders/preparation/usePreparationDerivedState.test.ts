import { renderHook } from "@testing-library/react";
import { usePreparationDerivedState } from "./usePreparationDerivedState";
import type { PreparationOrder, PreparationQueuePagination, PreparationQueueSummary } from "./types";

describe("usePreparationDerivedState", () => {
  it("computes derived counts, totalPages, and triggers clampPage", () => {
    const clampPageMock = jest.fn();

    const mockSummary: PreparationQueueSummary = {
      filteredTotal: 42,
      visibleTotal: 42,
      stageCounts: { ALL: 42, NEW: 20, PREPARING: 22 },
      readyCount: 30,
      shortageCount: 12,
      shortageHoldCount: 5,
      onHoldPrepCount: 2,
      overdueShortageFollowUpCount: 3,
      overdueProblemFollowUpCount: 1,
      readyToShipCount: 10,
      allOverdueShortageFollowUpCount: 7,
      allOverdueProblemFollowUpCount: 4,
    };

    const mockPagination: PreparationQueuePagination = {
      total: 42,
      page: 1,
      limit: 25,
      pages: 2,
    };

    const mockOrders = [
      { id: "ord-1", orderNumber: "1001" },
      { id: "ord-2", orderNumber: "1002" },
    ] as unknown as PreparationOrder[];

    const { result, rerender } = renderHook(
      ({ summary, pagination, preparationOrders }) =>
        usePreparationDerivedState({
          summary,
          pagination,
          preparationOrders,
          clampPage: clampPageMock,
        }),
      {
        initialProps: {
          summary: mockSummary,
          pagination: mockPagination,
          preparationOrders: mockOrders,
        },
      }
    );

    expect(result.current.stageCounts).toEqual(mockSummary.stageCounts);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.enrichedOrders).toBe(mockOrders);
    expect(result.current.visibleOrdersCount).toBe(42);
    expect(result.current.currentPageCount).toBe(2);
    expect(result.current.allOverdueShortageFollowUpCount).toBe(7);
    expect(result.current.allOverdueProblemFollowUpCount).toBe(4);
    expect(clampPageMock).toHaveBeenCalledWith(2);

    // Test minimum 1 page
    rerender({
      summary: mockSummary,
      pagination: { ...mockPagination, pages: 0 },
      preparationOrders: [],
    });

    expect(result.current.totalPages).toBe(1);
    expect(result.current.currentPageCount).toBe(0);
    expect(clampPageMock).toHaveBeenCalledWith(1);
  });
});
