import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

const createOwnerSidebar = (activeApps: string[]) =>
  getSidebarConfig((key) => key, {
    role: "OWNER",
    company: {
      isCurrent: true,
      activeApps,
    },
  });

describe("store conversion sidebar links", () => {
  it("shows store conversion and upsell links inside the store section", () => {
    const config = createOwnerSidebar(["store", "analytics-advanced"]);

    const storefrontSection = config.find(
      (section) => section.id === "storefront-design",
    );

    const labels =
      storefrontSection?.items
        ?.filter((item) => item.hidden !== true)
        .map((item) => item.label) || [];

    expect(labels).toContain("sidebar.conversionTools");
    expect(labels).toContain("sidebar.upsellManagement");
  });

  it("shows conversion section when conversion-suite app is active", () => {
    const config = createOwnerSidebar(["conversion-suite"]);
    const storefrontSection = config.find(
      (section) => section.id === "storefront-design",
    );
    const conversionToolsItem = storefrontSection?.items?.find(
      (item) => item.to === "/settings/store/tools",
    );
    const upsellItem = storefrontSection?.items?.find(
      (item) => item.to === "/settings/upsell",
    );

    expect(storefrontSection?.hidden).toBe(false);
    expect(conversionToolsItem?.hidden).not.toBe(true);
    expect(upsellItem?.hidden).not.toBe(true);
  });
});

describe("granular marketplace gates", () => {
  it("shows procurement when procurement-pro is active", () => {
    const config = createOwnerSidebar(["procurement-pro"]);
    const procurementSection = config.find((section) => section.id === "procurement");

    expect(procurementSection?.hidden).toBe(false);
  });

  it("shows facebook ads without exposing broadcast when only facebook-ads-pro is active", () => {
    const config = createOwnerSidebar(["facebook-ads-pro"]);
    const marketingSection = config.find((section) => section.id === "marketing");
    const facebookAds = marketingSection?.items?.find(
      (item) => item.to === "/advertising/facebook-ads",
    );
    const broadcast = marketingSection?.items?.find((item) => item.to === "/broadcast");

    expect(marketingSection?.hidden).toBe(false);
    expect(facebookAds?.hidden).toBe(false);
    expect(broadcast?.hidden).toBe(true);
  });

  it("hides notifications until notification-automation is active", () => {
    const inactiveConfig = createOwnerSidebar([]);
    const activeConfig = createOwnerSidebar(["notification-automation"]);

    expect(inactiveConfig.find((section) => section.id === "notifications")?.hidden).toBe(
      true,
    );
    expect(activeConfig.find((section) => section.id === "notifications")?.hidden).toBe(
      false,
    );
  });

  it("shows appointments and tasks when respective apps are active", () => {
    const config = createOwnerSidebar(["booking-app", "business-tools"]);

    expect(config.find((section) => section.id === "appointments")?.hidden).not.toBe(true);
    expect(config.find((section) => section.id === "tasks")?.hidden).not.toBe(true);
    expect(config.find((section) => section.id === "ai")).toBeUndefined();
  });
});

describe("facebook ads sidebar links", () => {
  it("shows the reports page inside marketing when Facebook tools are enabled", () => {
    const config = getSidebarConfig((key) => key, {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: ["crm-basic"],
      },
    });

    const marketingSection = config.find((section) => section.id === "marketing");
    const reportsLink = marketingSection?.items.find(
      (item) => item.to === "/advertising/facebook-ads/decision-reports",
    );

    expect(reportsLink?.label).toBe("sidebar.facebookAdsReports");
  });
});
