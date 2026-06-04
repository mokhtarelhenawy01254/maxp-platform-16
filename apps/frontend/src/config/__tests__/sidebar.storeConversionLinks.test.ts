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
  it("shows grouped store conversion pages inside the store section", () => {
    const config = createOwnerSidebar(["ecommerce-basic", "analytics-advanced"]);

    const storefrontSection = config.find(
      (section) => section.id === "storefront-design",
    );

    const labels =
      storefrontSection?.items
        ?.filter((item) => item.hidden !== true)
        .map((item) => item.label) || [];

    expect(labels).toContain("أدوات التحويل");
    expect(labels).toContain("العروض والباقات");
    expect(labels).toContain("ودجات الموقع");
    expect(labels).toContain("أوضاع البيع");
    expect(labels).toContain("المراجعات والثقة");
  });

  it("shows conversion pages when only the granular conversion-suite app is active", () => {
    const config = createOwnerSidebar(["conversion-suite"]);
    const storefrontSection = config.find(
      (section) => section.id === "storefront-design",
    );
    const conversionPage = storefrontSection?.items?.find(
      (item) => item.to === "/settings/store/product-conversion",
    );

    expect(storefrontSection?.hidden).toBe(false);
    expect(conversionPage?.hidden).not.toBe(true);
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

  it("shows business tools without restoring the removed AI workspace", () => {
    const config = createOwnerSidebar(["smart-scheduler", "ai-rag-knowledge"]);

    expect(config.find((section) => section.id === "business")?.hidden).not.toBe(true);
    expect(config.find((section) => section.id === "ai")).toBeUndefined();
  });
});

describe("marketplace feature audit sidebar link", () => {
  it("shows the audit link to marketplace admins", () => {
    const config = getSidebarConfig((key) => key, {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: [],
      },
    });

    const marketplaceSection = config.find((section) => section.id === "marketplace");
    const auditLink = marketplaceSection?.items.find(
      (item) => item.to === "/marketplace/feature-audit",
    );

    expect(auditLink?.hidden).toBe(false);
  });

  it("hides the audit link from regular team members", () => {
    const config = getSidebarConfig((key) => key, {
      role: "EMPLOYEE",
      company: {
        isCurrent: true,
        activeApps: [],
      },
    });

    const marketplaceSection = config.find((section) => section.id === "marketplace");
    const auditLink = marketplaceSection?.items.find(
      (item) => item.to === "/marketplace/feature-audit",
    );

    expect(auditLink?.hidden).toBe(true);
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
