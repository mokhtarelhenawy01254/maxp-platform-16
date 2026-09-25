import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

const buildAffiliateDemoOwnerSidebar = () =>
  getSidebarConfig((key) => key, {
    role: "OWNER",
    company: {
      isCurrent: true,
      sidebarLayout: "affiliate-demo",
      activeApps: ["ecommerce-basic", "crm-basic", "hr-basic", "analytics-advanced"],
    },
  });

describe("affiliate demo sidebar preset", () => {
  it("keeps company owners focused on affiliate and dropshipping tools", () => {
    const config = buildAffiliateDemoOwnerSidebar();

    expect(config.map((section) => section.id)).toEqual([
      "main",
      "storefront-design",
      "affiliate",
      "products",
      "procurement",
      "orders",
      "customers",
      "marketplace",
      "company",
    ]);

    const affiliateLinks = config
      .find((section) => section.id === "affiliate")
      ?.items.map((item) => item.to);

    expect(affiliateLinks).toEqual([
      "/affiliates/management",
      "/affiliates/quick-actions",
      "/merchants",
      "/platform/commissions",
      "/affiliates/settings",
    ]);

    const storeLinks = config
      .find((section) => section.id === "storefront-design")
      ?.items.map((item) => item.to);

    expect(storeLinks).toEqual([
      "/shop",
      "/settings/store-pages",
      "/settings/store?tab=branches",
      "/settings/store/tools",
      "/settings/store-payment-offers",
    ]);

    const appLinks = config
      .find((section) => section.id === "marketplace")
      ?.items.map((item) => item.to);

    expect(appLinks).toEqual([
      "/marketplace",
      "/my-apps",
      "/marketplace/history",
      "/marketplace/downloads",
      "/marketplace/bundles",
      "/payments",
      "/subscription/pricing",
    ]);

    const procurementLinks = config
      .find((section) => section.id === "procurement")
      ?.items.map((item) => item.to);

    expect(procurementLinks).toEqual([
      "/procurement/dashboard",
      "/procurement/suppliers",
      "/procurement/purchase-orders",
      "/procurement/purchase-invoices",
      "/procurement/supplier-payments",
    ]);

    expect(config.find((section) => section.id === "hr")).toBeUndefined();
    expect(config.find((section) => section.id === "facebook")).toBeUndefined();
    expect(config.find((section) => section.id === "marketing")).toBeUndefined();
  });
});
