import {
  buildDataHealthStatus,
  buildAnalyticsNotes,
  buildFunnelMetrics,
  getTopProductPurchases,
  getTopProductImage,
  parseProductImages,
} from "../storeAnalyticsDashboard.utils";

describe("storeAnalyticsDashboard utils", () => {
  test("parseProductImages returns safe string arrays only", () => {
    expect(parseProductImages('["/a.jpg",null,"","/b.jpg"]')).toEqual([
      "/a.jpg",
      "/b.jpg",
    ]);
    expect(parseProductImages("not-json")).toEqual([]);
    expect(parseProductImages(["/hero.png", "", "/alt.png"])).toEqual([
      "/hero.png",
      "/alt.png",
    ]);
  });

  test("getTopProductImage prefers explicit image before parsed images", () => {
    expect(
      getTopProductImage({
        id: "1",
        name: "Product",
        price: 100,
        image: "/primary.webp",
        images: '["/fallback.webp"]',
        views: 10,
        addToCarts: 3,
        purchases: 1,
        conversionRate: 10,
      }),
    ).toBe("/primary.webp");

    expect(
      getTopProductImage({
        id: "2",
        name: "Product",
        price: 100,
        images: '["/fallback.webp"]',
        views: 10,
        addToCarts: 3,
        purchases: 1,
        conversionRate: 10,
      }),
    ).toBe("/fallback.webp");
  });

  test("getTopProductPurchases supports legacy sales payloads", () => {
    expect(
      getTopProductPurchases({
        id: "legacy-product",
        name: "Legacy Product",
        price: 100,
        views: 0,
        addToCarts: 0,
        sales: 3,
        conversionRate: 0,
      }),
    ).toBe(3);
  });

  test("buildFunnelMetrics keeps visual widths bounded while preserving high rates", () => {
    const metrics = buildFunnelMetrics({
      totalVisits: 3,
      uniqueVisitors: 3,
      totalProductViews: 9,
      addToCarts: 4,
      checkouts: 2,
      purchases: 5,
      totalRevenue: 1000,
      conversionRate: 166.6,
      productConversionRate: 55,
      avgOrderValue: 200,
      addToCartRate: 44,
      checkoutRate: 50,
      purchaseRate: 250,
    });

    expect(metrics[0].visualShare).toBeLessThanOrEqual(100);
    expect(metrics[1].visualShare).toBeLessThanOrEqual(100);
    expect(metrics[1].baselineRate).toBe(300);
    expect(metrics[1].exceedsVisits).toBe(false);
    expect(metrics[3].exceedsVisits).toBe(true);
    expect(metrics.map((metric) => metric.label)).toEqual([
      "زيارات المتجر",
      "مشاهدات المنتجات",
      "بدء الطلب",
      "إتمام الشراء",
    ]);
  });

  test("buildAnalyticsNotes highlights suspicious funnel math", () => {
    const notes = buildAnalyticsNotes(
      {
        totalVisits: 4,
        uniqueVisitors: 4,
        totalProductViews: 12,
        addToCarts: 3,
        checkouts: 2,
        purchases: 7,
        totalRevenue: 3500,
        conversionRate: 175,
        productConversionRate: 58,
        avgOrderValue: 500,
        addToCartRate: 25,
        checkoutRate: 50,
        purchaseRate: 350,
      },
      [],
    );

    expect(notes.some((note) => note.tone === "attention")).toBe(true);
    expect(notes.some((note) => note.title.includes("الفنل"))).toBe(true);
  });

  test("buildAnalyticsNotes explains when direct order bypasses the cart", () => {
    const notes = buildAnalyticsNotes(
      {
        totalVisits: 18,
        uniqueVisitors: 12,
        totalProductViews: 24,
        addToCarts: 3,
        checkouts: 7,
        purchases: 6,
        totalRevenue: 3429,
        conversionRate: 33.3,
        productConversionRate: 25,
        avgOrderValue: 571.5,
        addToCartRate: 12.5,
        checkoutRate: 233.3,
        purchaseRate: 85.7,
      },
      [],
    );

    expect(notes.some((note) => note.title.includes("السلة ليست المسار الوحيد"))).toBe(
      true,
    );
  });

  test("buildDataHealthStatus flags missing visits when downstream activity exists", () => {
    const status = buildDataHealthStatus(
      {
        totalVisits: 0,
        uniqueVisitors: 0,
        totalProductViews: 5,
        addToCarts: 0,
        checkouts: 0,
        purchases: 2,
        totalRevenue: 5820,
        conversionRate: 0,
        productConversionRate: 0,
        avgOrderValue: 2910,
        addToCartRate: 0,
        checkoutRate: 0,
        purchaseRate: 0,
      },
      Array.from({ length: 3 }, (_, index) => ({
        date: `2026-04-0${index + 1}`,
        totalVisits: 0,
        uniqueVisitors: 0,
        totalProductViews: 0,
        totalAddToCarts: 0,
        totalCheckouts: 0,
        totalPurchases: 1,
        totalRevenue: 1000,
      })),
    );

    expect(status.tone).toBe("critical");
    expect(status.issues.length).toBeGreaterThan(1);
  });

  test("buildAnalyticsNotes surfaces data-quality warnings before generic empty insights", () => {
    const notes = buildAnalyticsNotes(
      {
        totalVisits: 0,
        uniqueVisitors: 0,
        totalProductViews: 5,
        addToCarts: 0,
        checkouts: 0,
        purchases: 2,
        totalRevenue: 5820,
        conversionRate: 0,
        productConversionRate: 0,
        avgOrderValue: 2910,
        addToCartRate: 0,
        checkoutRate: 0,
        purchaseRate: 0,
      },
      [],
    );

    expect(notes[0]?.tone).toBe("attention");
    expect(notes[0]?.title).toContain("جودة البيانات");
  });
});
