import { buildCompanyCoverage, buildMarketplaceCoverage } from "../marketplaceCoverageUtils";
import type { MarketplaceFeatureMapEntry } from "../../../config/marketplaceFeatureMap";

const twoItemFeatureMap: MarketplaceFeatureMapEntry[] = [
  {
    id: "core-feature",
    area: "platform",
    label: "Core Platform",
    description: "Core",
    status: "core",
    routes: [],
    action: "Keep",
  },
  {
    id: "orders-core",
    area: "commerce",
    label: "Order Management",
    description: "Orders",
    status: "covered",
    appSlug: "order-core",
    appLabel: "Order Core",
    currentGate: "order-core",
    legacyGate: "ecommerce-basic",
    routes: [],
    action: "Install",
  },
];

describe("buildCompanyCoverage - edge cases", () => {
  test("handles empty activeAppSlugs (company with no apps)", () => {
    const summary = buildCompanyCoverage(
      { id: "c1", name: "Empty Co", activeAppSlugs: [] },
      twoItemFeatureMap,
      ["order-core"],
    );

    expect(summary.counts.core).toBe(1);
    expect(summary.counts.productizable).toBe(1);
    expect(summary.counts.missing).toBe(1);
    expect(summary.counts.exact).toBe(0);
    expect(summary.counts.fallback).toBe(0);
    expect(summary.counts.risk).toBe(1);
    expect(summary.coverageScore).toBe(0);
  });

  test("handles undefined activeAppSlugs", () => {
    const summary = buildCompanyCoverage(
      { id: "c2", name: "Undefined Co" },
      twoItemFeatureMap,
      ["order-core"],
    );

    expect(summary.counts.missing).toBe(1);
  });

  test("handles null activeAppSlugs", () => {
    const summary = buildCompanyCoverage(
      { id: "c3", name: "Null Co", activeAppSlugs: null as undefined },
      twoItemFeatureMap,
      ["order-core"],
    );

    expect(summary.counts.missing).toBe(1);
  });

  test("handles duplicate slugs in activeAppSlugs", () => {
    const summary = buildCompanyCoverage(
      { id: "c4", name: "Dup Co", activeAppSlugs: ["order-core", "order-core", "ORDER-CORE"] },
      twoItemFeatureMap,
      ["order-core"],
    );

    expect(summary.counts.exact).toBe(1);
    expect(summary.counts.missing).toBe(0);
  });

  test("handles case-insensitive slug matching", () => {
    const summary = buildCompanyCoverage(
      { id: "c5", name: "Case Co", activeAppSlugs: ["ORDER-CORE"] },
      twoItemFeatureMap,
      ["order-core"],
    );

    expect(summary.counts.exact).toBe(1);
  });

  test("handles empty featureMap", () => {
    const summary = buildCompanyCoverage(
      { id: "c6", name: "No Features", activeAppSlugs: ["order-core"] },
      [],
      ["order-core"],
    );

    expect(summary.entries).toEqual([]);
    expect(summary.counts.core).toBe(0);
    expect(summary.counts.productizable).toBe(0);
    expect(summary.coverageScore).toBe(100);
  });

  test("handles empty catalogAppSlugs", () => {
    const summary = buildCompanyCoverage(
      { id: "c7", name: "No Catalog", activeAppSlugs: ["order-core"] },
      twoItemFeatureMap,
      [],
    );

    expect(summary.counts.catalogMissing).toBe(1);
    expect(summary.counts.missing).toBe(0);
    expect(summary.counts.risk).toBe(1);
  });

  test("handles entry with appSlug but no legacyGate", () => {
    const featureMap: MarketplaceFeatureMapEntry[] = [
      {
        id: "no-legacy",
        area: "commerce",
        label: "No Legacy",
        description: "App without legacy fallback",
        status: "covered",
        appSlug: "new-app",
        appLabel: "New App",
        currentGate: "new-app",
        routes: [],
        action: "Install",
      },
    ];

    const summary = buildCompanyCoverage(
      { id: "c8", name: "No Legacy Co", activeAppSlugs: [] },
      featureMap,
      ["new-app"],
    );

    expect(summary.counts.missing).toBe(1);
    expect(summary.counts.fallback).toBe(0);
  });

  test("handles entry with appSlug undefined but legacyGate defined", () => {
    const featureMap: MarketplaceFeatureMapEntry[] = [
      {
        id: "legacy-only",
        area: "commerce",
        label: "Legacy Only",
        description: "Only legacy gate",
        status: "covered",
        legacyGate: "old-app",
        routes: [],
        action: "Migrate",
      },
    ];

    const summary = buildCompanyCoverage(
      { id: "c9", name: "Legacy Co", activeAppSlugs: ["old-app"] },
      featureMap,
      [],
    );

    expect(summary.counts.fallback).toBe(1);
    expect(summary.counts.catalogMissing).toBe(0);
    expect(summary.coverageScore).toBe(100);
  });

  test("productizable=0 returns coverageScore=100", () => {
    const featureMap: MarketplaceFeatureMapEntry[] = [
      {
        id: "only-core",
        area: "platform",
        label: "Only Core",
        description: "Core only",
        status: "core",
        routes: [],
        action: "Keep",
      },
    ];

    const summary = buildCompanyCoverage(
      { id: "c10", name: "Only Core", activeAppSlugs: [] },
      featureMap,
      [],
    );

    expect(summary.counts.productizable).toBe(0);
    expect(summary.coverageScore).toBe(100);
  });

  test("handles mixed statuses correctly", () => {
    const featureMap: MarketplaceFeatureMapEntry[] = [
      { id: "f1", area: "platform", label: "Core", description: "C", status: "core", routes: [], action: "K" },
      { id: "f2", area: "commerce", label: "Exact", description: "E", status: "covered", appSlug: "exact-app", currentGate: "exact-app", routes: [], action: "I" },
      { id: "f3", area: "commerce", label: "Fallback", description: "Fb", status: "covered", appSlug: "fallback-app", legacyGate: "old-app", currentGate: "fallback-app", routes: [], action: "I" },
      { id: "f4", area: "commerce", label: "Missing", description: "M", status: "covered", appSlug: "missing-app", currentGate: "missing-app", routes: [], action: "I" },
      { id: "f5", area: "commerce", label: "Catalog Missing", description: "CM", status: "covered", appSlug: "future-app", currentGate: "future-app", routes: [], action: "I" },
    ];

    const summary = buildCompanyCoverage(
      { id: "c11", name: "Mixed", activeAppSlugs: ["exact-app", "old-app"] },
      featureMap,
      ["exact-app", "fallback-app", "missing-app"],
    );

    expect(summary.counts.core).toBe(1);
    expect(summary.counts.exact).toBe(1);
    expect(summary.counts.fallback).toBe(1);
    expect(summary.counts.missing).toBe(1);
    expect(summary.counts.catalogMissing).toBe(1);
    expect(summary.counts.productizable).toBe(4);
    expect(summary.counts.risk).toBe(3); // fallback + missing + catalogMissing
    expect(summary.missingExactAppSlugs).toEqual(["missing-app"]);
    expect(summary.fallbackExactAppSlugs).toEqual(["fallback-app"]);
    expect(summary.coverageScore).toBe(50); // healthy: exact(1) + fallback(1) = 2 / productizable(4) = 50%
  });
});

describe("buildMarketplaceCoverage", () => {
  test("returns an array of coverage summaries for multiple companies", () => {
    const companies = [
      { id: "c1", name: "Co A", activeAppSlugs: ["order-core"] },
      { id: "c2", name: "Co B", activeAppSlugs: ["ecommerce-basic"] },
      { id: "c3", name: "Co C", activeAppSlugs: [] },
    ];

    const results = buildMarketplaceCoverage(companies, twoItemFeatureMap, ["order-core"]);

    expect(results).toHaveLength(3);
    expect(results[0].counts.exact).toBe(1); // Co A has exact app
    expect(results[0].company.name).toBe("Co A");
    expect(results[1].counts.fallback).toBe(1); // Co B has legacy gate
    expect(results[1].company.name).toBe("Co B");
    expect(results[2].counts.missing).toBe(1); // Co C has nothing
    expect(results[2].company.name).toBe("Co C");
  });

  test("returns empty array when companies is empty", () => {
    const results = buildMarketplaceCoverage([], twoItemFeatureMap, ["order-core"]);
    expect(results).toEqual([]);
  });
});
