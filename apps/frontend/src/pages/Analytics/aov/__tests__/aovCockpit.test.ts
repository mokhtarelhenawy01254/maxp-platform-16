import {
  AOV_TOOLS_CATALOG,
  AOV_LIFECYCLE_LANES,
  formatToolsCountLabel,
} from "../aovToolsCatalog";
import { buildQuantityOfferInsights } from "../../../marketplace/quantityOfferInsights";
import {
  mapPostPurchaseAnalytics,
  isManagedAppActive,
  resolveToolActive,
  buildConversionUsageMap,
  getPeriodDateRange,
} from "../aovCockpitHelpers";

describe("AOV Cockpit Catalog & Calculation Engine", () => {
  test("contains exactly 34 tools across the 4 lifecycle lanes", () => {
    expect(AOV_TOOLS_CATALOG.length).toBe(34);
    expect(AOV_LIFECYCLE_LANES.length).toBe(4);

    const prePurchaseTools = AOV_TOOLS_CATALOG.filter((t) => t.lane === "pre-purchase");
    const inPurchaseTools = AOV_TOOLS_CATALOG.filter((t) => t.lane === "in-purchase");
    const postPurchaseTools = AOV_TOOLS_CATALOG.filter((t) => t.lane === "post-purchase");
    const intelligenceTools = AOV_TOOLS_CATALOG.filter((t) => t.lane === "intelligence");

    expect(prePurchaseTools.length).toBe(12);
    expect(inPurchaseTools.length).toBe(8);
    expect(postPurchaseTools.length).toBe(8);
    expect(intelligenceTools.length).toBe(6);
  });

  test("validates that every tool has an id, name, subtitle, and valid settingsPath", () => {
    AOV_TOOLS_CATALOG.forEach((tool) => {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.subtitle).toBeTruthy();
      expect(tool.settingsPath.startsWith("/")).toBe(true);
    });
  });

  test("toggleable tools always declare a real moduleKey (no dead toggles)", () => {
    AOV_TOOLS_CATALOG.forEach((tool) => {
      if (tool.canToggle) {
        expect(tool.moduleKey).toBeTruthy();
        expect(tool.appSlug).toBeTruthy();
      }
    });
  });

  test("computes quantity offer insights correctly when fed real featureMap", () => {
    const mockFeatureMap = {
      quantity_offer_panel_view: { actions: 100, quantity: 100, totalCost: 0 },
      quantity_offer_select: { actions: 35, quantity: 70, totalCost: 0 },
      quantity_offer_copy_first_selection: { actions: 5, quantity: 10, totalCost: 0 },
      quantity_offer_add_to_cart: { actions: 25, quantity: 50, totalCost: 12500 },
      quantity_offer_order_created: { actions: 20, quantity: 40, totalCost: 10000 },
    };

    const insights = buildQuantityOfferInsights(mockFeatureMap);

    expect(insights.panelViews).toBe(100);
    expect(insights.offerSelections).toBe(35);
    expect(insights.selectionRate).toBe(35);
    expect(insights.addToCartActions).toBe(25);
    expect(insights.addToCartRate).toBe(25);
    expect(insights.ordersCreated).toBe(20);
    expect(insights.orderCaptureRate).toBe(80);
    expect(insights.trackedOrderValue).toBe(10000);
    expect(insights.avgOrderValue).toBe(500);
  });
});

describe("AOV Cockpit real-contract mapping", () => {
  test("maps the real payload shape (data.kpis.*) of POST /post-purchase-offer/analytics", () => {
    // Shape captured live from production GET /post-purchase-offer/analytics?period=7
    const realPayload = {
      dateRange: { start: "2026-10-09T21:00:00.000Z", end: "2026-10-16T20:59:59.999Z" },
      kpis: {
        acceptanceRate: 1.2,
        aovLiftAmount: 4.61,
        baselineAOV: 638.61,
        currentAOV: 643.22,
        eligibleOrdersCount: 433,
        offerAcceptedOrders: 5,
        offerAcceptsCount: 5,
        offerRevenue: 1995,
        totalOrders: 433,
      },
      deliveryOutcomes: { delivered: { count: 0, revenue: 0 } },
    };

    const mapped = mapPostPurchaseAnalytics(realPayload);

    expect(mapped).toEqual({
      totalOrders: 433,
      offerAccepts: 5,
      acceptanceRate: 1.2,
      offerRevenue: 1995,
      aovImpact: 4.61,
    });
  });

  test("stays backward compatible with a flat legacy payload", () => {
    const legacy = {
      totalOrders: 145,
      offerAccepts: 28,
      acceptanceRate: 19.3,
      offerRevenue: 9800,
      aovImpact: 67.6,
    };
    expect(mapPostPurchaseAnalytics(legacy)).toEqual({
      totalOrders: 145,
      offerAccepts: 28,
      acceptanceRate: 19.3,
      offerRevenue: 9800,
      aovImpact: 67.6,
    });
  });

  test("returns null for invalid payloads (no fake zero data)", () => {
    expect(mapPostPurchaseAnalytics(null)).toBeNull();
    expect(mapPostPurchaseAnalytics("error")).toBeNull();
    expect(mapPostPurchaseAnalytics([])).toBeNull();
  });

  test("uses status/expiry as the activation truth (not a missing isActive field)", () => {
    expect(isManagedAppActive({ status: "ACTIVE", isExpired: false })).toBe(true);
    expect(isManagedAppActive({ status: "TRIAL", isExpired: false })).toBe(true);
    expect(isManagedAppActive({ status: "ACTIVE", isExpired: true })).toBe(false);
    expect(isManagedAppActive({ status: "EXPIRED", isExpired: true })).toBe(false);
    expect(isManagedAppActive(null)).toBe(false);
  });

  test("resolveToolActive: module boolean wins, missing app/expired app falls back to default", () => {
    const tool = { appSlug: "conversion-suite", moduleKey: "boughtTogether", defaultActive: false };

    expect(resolveToolActive(tool, undefined)).toBe(false);
    expect(resolveToolActive(tool, { id: "1", active: false })).toBe(false);
    expect(
      resolveToolActive(tool, {
        id: "1",
        active: true,
        settings: { modules: { boughtTogether: true } },
      }),
    ).toBe(true);
    expect(
      resolveToolActive(tool, {
        id: "1",
        active: true,
        settings: { modules: { boughtTogether: false } },
      }),
    ).toBe(false);
    // module never governed → active app means on
    expect(
      resolveToolActive(tool, { id: "1", active: true, settings: { modules: {} } }),
    ).toBe(true);
  });

  test("tools without appSlug follow defaultActive only", () => {
    expect(
      resolveToolActive({ id: "x", defaultActive: true } as any, undefined),
    ).toBe(true);
    expect(
      resolveToolActive({ id: "x", defaultActive: undefined } as any, undefined),
    ).toBe(false);
  });

  test("builds conversion usage counts from real byFeature rows", () => {
    const byFeature = [
      { feature: "bought_together_view", _count: { id: 87 }, _sum: { quantity: 87, totalCost: 0 } },
      { feature: "cross_sell_section_view", _count: { id: 124124 }, _sum: {} },
    ];
    const map = buildConversionUsageMap(byFeature);
    expect(map["bought_together_view"]).toBe(87);
    expect(map["cross_sell_section_view"]).toBe(124124);
    expect(buildConversionUsageMap(undefined)).toEqual({});
    expect(buildConversionUsageMap("nope")).toEqual({});
  });

  test("cross-sell telemetry listens on the REAL recorded feature name", () => {
    const crossSell = AOV_TOOLS_CATALOG.find((t) => t.id === "cross-sell-rail");
    expect(crossSell?.telemetryFeatures?.map((f) => f.feature)).toContain("cross_sell_section_view");
    // and the stale, never-recorded name is gone
    expect(crossSell?.telemetryFeatures?.map((f) => f.feature)).not.toContain("cross_sell_view");
  });

  test("telemetryFeatures use exact appUsageLog feature names (no invented events)", () => {
    const allowed = new Set([
      "bought_together_view",
      "cross_sell_section_view",
      "free_shipping_bar_view",
      "free_shipping_progress_milestone",
      "cart_upsell_view",
      "cart_quantity_upsell_click",
      "pdp_quick_order_submit",
      "pdp_quick_order_add_to_cart",
      "sticky_add_to_cart_click",
      "sticky_buy_now_click",
      "post_purchase_upsell_view",
      "thank_you_reorder_completed",
      "coupon_validation_success",
    ]);
    AOV_TOOLS_CATALOG.forEach((tool) => {
      (tool.telemetryFeatures || []).forEach((f) => {
        expect(allowed.has(f.feature)).toBe(true);
        expect(f.label.trim()).toBeTruthy();
      });
    });
  });
});

describe("AOV Cockpit period & count helpers", () => {
  test("getPeriodDateRange: today/yesterday are single Cairo calendar days", () => {
    const today = getPeriodDateRange("today");
    const yesterday = getPeriodDateRange("yesterday");

    expect(new Date(today.startDate).getTime()).toBeLessThan(new Date(today.endDate).getTime());

    const fmt = (iso: string) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date(iso));

    const todayDate = fmt(today.startDate);
    expect(fmt(today.endDate)).toBe(todayDate);
    expect(fmt(yesterday.endDate)).toBe(fmt(yesterday.startDate));
    expect(new Date(yesterday.endDate).getTime() - new Date(yesterday.startDate).getTime()).toBeLessThanOrEqual(
      24 * 3600 * 1000 + 1000,
    );
  });

  test("getPeriodDateRange: 7 day window covers about a week", () => {
    const range = getPeriodDateRange("7");
    const span = new Date(range.endDate).getTime() - new Date(range.startDate).getTime();
    expect(span).toBeGreaterThanOrEqual(7 * 86400000 - 3600 * 1000);
    expect(span).toBeLessThanOrEqual(8 * 86400000 + 3600 * 1000);
  });

  test("formatToolsCountLabel pluralizes Arabic correctly", () => {
    expect(formatToolsCountLabel(12)).toBe("12 أداة");
    expect(formatToolsCountLabel(8)).toBe("8 أدوات");
    expect(formatToolsCountLabel(6)).toBe("6 أدوات");
    expect(formatToolsCountLabel(1)).toBe("أداة واحدة");
  });
});
