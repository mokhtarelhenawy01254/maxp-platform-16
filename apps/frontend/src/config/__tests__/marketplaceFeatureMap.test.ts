import { describe, expect, it } from "vitest";
import {
  getFeatureAuditSummary,
  getMarketplaceFeatureAudit,
  marketplaceFeatureMap,
} from "../marketplaceFeatureMap";

describe("marketplaceFeatureMap", () => {
  const mappedAppSlugs = Array.from(
    new Set(
      marketplaceFeatureMap.flatMap((entry) => (entry.appSlug ? [entry.appSlug] : [])),
    ),
  );

  it("keeps feature ids unique", () => {
    const ids = marketplaceFeatureMap.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every monetizable entry tied to at least one route", () => {
    const emptyRouteEntries = marketplaceFeatureMap.filter(
      (entry) => entry.status !== "core" && entry.routes.length === 0,
    );

    expect(emptyRouteEntries).toEqual([]);
  });

  it("marks existing app slugs as covered instead of missing apps", () => {
    const audit = getMarketplaceFeatureAudit([
      "conversion-suite",
      "inventory-pro",
      "facebook-ads-pro",
    ]);

    expect(audit.find((entry) => entry.id === "storefront-conversion")).toMatchObject({
      appExists: true,
      effectiveStatus: "covered",
    });
    expect(audit.find((entry) => entry.id === "inventory")).toMatchObject({
      appExists: true,
      effectiveStatus: "covered",
    });
    expect(audit.find((entry) => entry.id === "facebook-ads")).toMatchObject({
      appExists: true,
      effectiveStatus: "covered",
    });
  });

  it("promotes absent covered app slugs to missing-app findings", () => {
    const audit = getMarketplaceFeatureAudit(
      mappedAppSlugs.filter((slug) => slug !== "procurement-pro"),
    );

    expect(audit.find((entry) => entry.id === "procurement")).toMatchObject({
      appExists: false,
      effectiveStatus: "missing-app",
    });
  });

  it("summarizes audit statuses for dashboard cards", () => {
    const audit = getMarketplaceFeatureAudit(mappedAppSlugs);
    const summary = getFeatureAuditSummary(audit);

    expect(summary.total).toBe(marketplaceFeatureMap.length);
    expect(summary.core).toBeGreaterThan(0);
    expect(summary.covered).toBeGreaterThan(0);
    expect(summary.needsGranularGate).toBe(0);
    expect(summary.missingApp).toBe(0);
  });
});
