const mockPrisma = {
  storeVisit: { findMany: jest.fn() },
  productVisit: { findMany: jest.fn() },
  conversionEvent: { findMany: jest.fn() },
  order: { findMany: jest.fn() },
  guestOrder: { findMany: jest.fn() },
  dailyAnalytic: { findMany: jest.fn() },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const analyticsService = require("../../services/analyticsService");

describe("analyticsService daily valid/invalid split", () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.storeVisit.findMany.mockResolvedValue([]);
    mockPrisma.productVisit.findMany.mockResolvedValue([]);
    mockPrisma.conversionEvent.findMany.mockResolvedValue([]);
    mockPrisma.dailyAnalytic.findMany.mockResolvedValue([]);
  });

  test("splits daily purchases into valid vs invalid (cancelled + trash/deleted)", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { id: "o1", orderNumber: "SWN-1", createdAt: now, total: 100, status: "DELIVERED" },
      { id: "o2", orderNumber: "SWN-2", createdAt: now, total: 200, status: "CANCELLED" },
      { id: "o3", orderNumber: "SWN-3", createdAt: now, total: 300, status: "TRASH" },
      { id: "o4", orderNumber: "SWN-4", createdAt: now, total: 400, status: "PENDING" },
      { id: "o5", orderNumber: "SWN-5", createdAt: now, total: 500, status: "DELETED" },
    ]);
    mockPrisma.guestOrder.findMany.mockResolvedValue([
      { id: "g1", orderNumber: "G-1", createdAt: now, total: 50, finalTotal: 50, items: [], status: "confirmed" },
      { id: "g2", orderNumber: "G-2", createdAt: now, total: 60, finalTotal: 60, items: [], status: "trash" },
      { id: "g3", orderNumber: "G-3", createdAt: now, total: 70, finalTotal: 70, items: [], status: "deleted" },
    ]);

    const daily = await analyticsService.getDailyAnalyticsByDate(
      "company-1",
      start,
      end,
    );

    const today = daily.find((entry) => Number(entry.totalPurchases) > 0);

    expect(today).toBeDefined();
    expect(today.totalPurchases).toBe(8);
    expect(today.validPurchases).toBe(3);
    expect(today.invalidPurchases).toBe(5);
    expect(today.validPurchases + today.invalidPurchases).toBe(
      today.totalPurchases,
    );
  });

  test("treats lowercase guest trash/deleted and cancelled/canceled as invalid", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { id: "o1", orderNumber: "SWN-1", createdAt: now, total: 100, status: "CANCELED" },
      { id: "o2", orderNumber: "SWN-2", createdAt: now, total: 200, status: "CONFIRMED" },
    ]);
    mockPrisma.guestOrder.findMany.mockResolvedValue([
      { id: "g1", orderNumber: "G-1", createdAt: now, total: 50, finalTotal: 50, items: [], status: "TRASH_ORDER" },
    ]);

    const daily = await analyticsService.getDailyAnalyticsByDate(
      "company-1",
      start,
      end,
    );

    const today = daily.find((entry) => Number(entry.totalPurchases) > 0);

    expect(today).toBeDefined();
    expect(today.totalPurchases).toBe(3);
    expect(today.validPurchases).toBe(1);
    expect(today.invalidPurchases).toBe(2);
  });
});
