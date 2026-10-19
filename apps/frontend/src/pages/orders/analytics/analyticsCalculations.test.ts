import {
  deriveOrderCountsAndPieces,
  deriveFinancialsAndPayments,
  deriveShippingList,
  deriveBranchList,
  deriveGovernorateList,
} from "./analyticsCalculations";
import { OrderStats } from "./types";

describe("analyticsCalculations", () => {
  const mockStats: OrderStats = {
    totalOrders: 100,
    totalRevenue: 50000,
    totalPieces: 250,
    avgOrderValue: 500,
    avgPiecesPerOrder: 2.5,
    statusDistribution: {
      DELIVERED: 60,
      SHIPPED: 20,
      READY_FOR_SHIPPING: 10,
      CANCELLED: 5,
      RETURNED: 5,
    },
    statusPiecesDistribution: {
      DELIVERED: 150,
      SHIPPED: 50,
      READY_FOR_SHIPPING: 25,
      CANCELLED: 12,
      RETURNED: 13,
    },
    paymentStats: {
      COD: 80,
      VISA: 20,
    },
    governorateStats: {
      "القاهرة": 40,
      "الجيزة": 30,
      "الإسكندرية": 30,
    },
  };

  it("derives order counts and pieces correctly", () => {
    const counts = deriveOrderCountsAndPieces(mockStats, 10);

    expect(counts.totalOrders).toBe(100);
    expect(counts.totalRevenue).toBe(50000);
    expect(counts.deliveredOrders).toBe(60);
    expect(counts.inTransitOrders).toBe(20);
    expect(counts.warehouseOrders).toBe(10);
    expect(counts.cancelledOrders).toBe(5);
    expect(counts.returnedOrders).toBe(5);
    expect(counts.unprocessedOrders).toBe(0);

    expect(counts.deliveredPct).toBe(60);
    expect(counts.inTransitPct).toBe(20);
    expect(counts.warehousePct).toBe(10);
    expect(counts.cancelledPct).toBe(5);
    expect(counts.returnedPct).toBe(5);

    expect(counts.avgOrdersPerDay).toBe(10);
    expect(counts.avgPiecesPerOrder).toBe(2.5);
    expect(counts.avgPiecesPerDay).toBe(25);
  });

  it("derives financials and payments accurately", () => {
    const counts = deriveOrderCountsAndPieces(mockStats, 10);
    const financials = deriveFinancialsAndPayments(mockStats, counts);

    expect(financials.deliveryRate).toBe(60);
    expect(financials.cancellationRate).toBe(5);
    expect(financials.returnRate).toBe(5);
    expect(financials.netRevenue).toBe(30000);
    expect(financials.pendingRevenue).toBe(10000);
    expect(financials.lostRevenue).toBe(5000);
    expect(financials.netRealizationPct).toBe(60);

    expect(financials.codOrdersCount).toBe(80);
    expect(financials.prepaidOrdersCount).toBe(20);
  });

  it("derives shipping and branch lists with fallback when none provided", () => {
    const counts = deriveOrderCountsAndPieces(mockStats, 10);
    const financials = deriveFinancialsAndPayments(mockStats, counts);

    const shipping = deriveShippingList(mockStats, counts, financials);
    expect(shipping.length).toBeGreaterThan(0);
    expect(shipping[0].name).toContain("Turbo");
    expect(shipping[0].deliveredOrders).toBe(60);

    const branches = deriveBranchList(mockStats, counts, financials);
    expect(branches.length).toBe(1);
    expect(branches[0].totalOrders).toBe(100);
    expect(branches[0].deliveredOrders).toBe(60);
  });

  it("derives governorate list sorted by orders count", () => {
    const counts = deriveOrderCountsAndPieces(mockStats, 10);
    const financials = deriveFinancialsAndPayments(mockStats, counts);

    const govs = deriveGovernorateList(mockStats, counts, financials);
    expect(govs.length).toBe(3);
    expect(govs[0].name).toBe("القاهرة");
    expect(govs[0].ordersCount).toBe(40);
    expect(govs[0].deliveredCount).toBe(24);
  });

  it("handles null stats gracefully without throwing", () => {
    const counts = deriveOrderCountsAndPieces(null, 0);
    expect(counts.totalOrders).toBe(0);
    expect(counts.totalRevenue).toBe(0);
    expect(counts.deliveredOrders).toBe(0);

    const financials = deriveFinancialsAndPayments(null, counts);
    expect(financials.netRevenue).toBe(0);
    expect(financials.deliveryRate).toBe(0);

    const shipping = deriveShippingList(null, counts, financials);
    expect(shipping).toEqual([]);

    const branches = deriveBranchList(null, counts, financials);
    expect(branches.length).toBe(1);

    const govs = deriveGovernorateList(null, counts, financials);
    expect(govs).toEqual([]);
  });
});
