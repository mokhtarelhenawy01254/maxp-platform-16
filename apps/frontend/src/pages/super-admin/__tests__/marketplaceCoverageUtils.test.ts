import { buildCompanyCoverage } from "../marketplaceCoverageUtils";
import type { MarketplaceFeatureMapEntry } from "../../../config/marketplaceFeatureMap";

const featureMap: MarketplaceFeatureMapEntry[] = [
  {
    id: "core",
    area: "platform",
    label: "Core",
    description: "Core workspace",
    status: "core",
    routes: [],
    action: "Keep core",
  },
  {
    id: "procurement",
    area: "commerce",
    label: "Procurement",
    description: "Purchase flows",
    status: "covered",
    appSlug: "procurement-pro",
    appLabel: "Procurement Pro",
    currentGate: "procurement-pro",
    legacyGate: "store-pro",
    routes: [],
    action: "Install exact app",
  },
  {
    id: "affiliate",
    area: "commerce",
    label: "Affiliate",
    description: "Affiliate flows",
    status: "covered",
    appSlug: "affiliate-pro",
    appLabel: "Affiliate Pro",
    currentGate: "affiliate-pro",
    legacyGate: "ecommerce-basic",
    routes: [],
    action: "Install exact app",
  },
  {
    id: "notifications",
    area: "communication",
    label: "Notifications",
    description: "Notification flows",
    status: "covered",
    appSlug: "notification-automation",
    appLabel: "Notification Automation",
    currentGate: "notification-automation",
    routes: [],
    action: "Install exact app",
  },
  {
    id: "future",
    area: "integration",
    label: "Future",
    description: "Missing catalog app",
    status: "covered",
    appSlug: "future-pro",
    appLabel: "Future Pro",
    currentGate: "future-pro",
    routes: [],
    action: "Create app",
  },
];

describe("buildCompanyCoverage", () => {
  test("classifies exact, fallback, missing, and catalog-missing coverage", () => {
    const summary = buildCompanyCoverage(
      {
        id: "company-1",
        name: "Swan",
        activeAppSlugs: ["procurement-pro", "ecommerce-basic"],
      },
      featureMap,
      ["procurement-pro", "affiliate-pro", "notification-automation"],
    );

    expect(summary.counts.core).toBe(1);
    expect(summary.counts.exact).toBe(1);
    expect(summary.counts.fallback).toBe(1);
    expect(summary.counts.missing).toBe(1);
    expect(summary.counts.catalogMissing).toBe(1);
    expect(summary.counts.risk).toBe(3);
    expect(summary.missingExactAppSlugs).toEqual(["notification-automation"]);
    expect(summary.fallbackExactAppSlugs).toEqual(["affiliate-pro"]);
    expect(summary.coverageScore).toBe(50);
  });

  test("treats installed exact apps as clean coverage even when a legacy gate exists", () => {
    const summary = buildCompanyCoverage(
      {
        id: "company-2",
        name: "Clean Co",
        activeAppSlugs: [
          "procurement-pro",
          "affiliate-pro",
          "notification-automation",
        ],
      },
      featureMap.slice(0, 4),
      ["procurement-pro", "affiliate-pro", "notification-automation"],
    );

    expect(summary.counts.exact).toBe(3);
    expect(summary.counts.fallback).toBe(0);
    expect(summary.counts.missing).toBe(0);
    expect(summary.counts.risk).toBe(0);
    expect(summary.coverageScore).toBe(100);
  });
});
