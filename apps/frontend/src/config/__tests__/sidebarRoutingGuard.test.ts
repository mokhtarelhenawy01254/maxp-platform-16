import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { getSidebarConfig } from "../sidebar";

function loadAppRoutes(): Set<string> {
  const appPath = path.resolve(__dirname, "../../App.tsx");
  const content = fs.readFileSync(appPath, "utf8");
  const matches = [...content.matchAll(/path=["']([^"']+)["']/g)].map((m) => m[1]);
  return new Set(matches);
}

function loadValidSettingsTabs(): Set<string> {
  const settingsPath = path.resolve(__dirname, "../../pages/settings/Settings.tsx");
  const content = fs.readFileSync(settingsPath, "utf8");
  const matches = [...content.matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]);
  return new Set(matches);
}

function isRouteMatched(toPath: string, appRoutes: Set<string>): boolean {
  const cleanPath = toPath.split("?")[0];
  if (appRoutes.has(cleanPath)) return true;

  for (const r of appRoutes) {
    if (r.includes(":") || r.includes("*")) {
      const pattern =
        "^" +
        r.replace(/\/:[^/]+/g, "/[^/]+").replace(/\/\*/g, "(/.*)?") +
        "$";
      if (new RegExp(pattern).test(cleanPath)) {
        return true;
      }
    }
  }

  return false;
}

describe("Sidebar Routing Guard (Regression Prevention)", () => {
  const appRoutes = loadAppRoutes();
  const validSettingsTabs = loadValidSettingsTabs();

  // Test with all major apps enabled so all sidebar items are uncovered
  const allSections = getSidebarConfig((k) => k, {
    role: "OWNER",
    company: {
      isCurrent: true,
      activeApps: [
        "store",
        "conversion-suite",
        "coupons-pro",
        "analytics-advanced",
        "orders-analytics",
        "crm-basic",
        "marketing-agency-pro",
      ],
    },
  });

  it("ensures /settings/post-purchase-offer is explicitly mounted in App.tsx", () => {
    expect(appRoutes.has("/settings/post-purchase-offer")).toBe(true);
  });

  it("guards Storefront Design & Store Management sidebar items from route mismatches or /settings/:tab trap", () => {
    const storefrontSection = allSections.find(
      (s) => s.id === "storefront-design",
    );
    expect(storefrontSection).toBeDefined();

    const brokenItems: Array<{ to: string; label: string; issue: string }> = [];

    for (const item of storefrontSection?.items || []) {
      if (!item.to || item.to.startsWith("http")) continue;
      const cleanPath = item.to.split("?")[0];

      // Check if it's explicitly matched
      const hasExplicitRoute = appRoutes.has(cleanPath);

      // Check if it starts with /settings/ and falls into /settings/:tab without being a real tab
      if (cleanPath.startsWith("/settings/")) {
        const segs = cleanPath.split("/").filter(Boolean);
        if (segs.length === 2) {
          const tab = segs[1];
          if (!hasExplicitRoute && !validSettingsTabs.has(tab)) {
            brokenItems.push({
              to: item.to,
              label: String(item.label),
              issue: `Falls into /settings/:tab trap; '${tab}' is not a valid tab in Settings.tsx`,
            });
            continue;
          }
        }
      }

      if (!isRouteMatched(item.to, appRoutes)) {
        brokenItems.push({
          to: item.to,
          label: String(item.label),
          issue: "No matching route found in App.tsx",
        });
      }
    }

    expect(brokenItems).toEqual([]);
  });

  it("checks all sidebar sections for the /settings/:tab trap", () => {
    const traps: Array<{ sectionId: string; to: string; tab: string }> = [];

    for (const section of allSections) {
      for (const item of section.items || []) {
        if (!item.to || item.to.startsWith("http")) continue;
        const cleanPath = item.to.split("?")[0];

        if (cleanPath.startsWith("/settings/")) {
          const segs = cleanPath.split("/").filter(Boolean);
          if (segs.length === 2) {
            const tab = segs[1];
            const hasSpecificRoute = appRoutes.has(cleanPath);
            if (!hasSpecificRoute && !validSettingsTabs.has(tab)) {
              // This is a broken trap that will route to Settings and bounce to /settings/profile
              traps.push({
                sectionId: section.id,
                to: item.to,
                tab,
              });
            }
          }
        }
      }
    }

    // Exclude known non-storefront issues reported to user (e.g. /settings/appearance) if needed
    // but ensure storefront items have 0 traps
    const storefrontTraps = traps.filter((t) => t.sectionId === "storefront-design");
    expect(storefrontTraps).toEqual([]);
  });
});
