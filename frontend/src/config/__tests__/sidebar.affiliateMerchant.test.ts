import fs from "fs";
import path from "path";

describe("affiliate and merchant sidebar configuration", () => {
  const sidebarSource = fs.readFileSync(
    path.resolve(__dirname, "../sidebar.ts"),
    "utf8",
  );

  test("includes provider-side affiliate and merchant management entries for admin roles", () => {
    expect(sidebarSource).toContain("user?.role === 'OWNER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN'");
    expect(sidebarSource).toContain("{ to: '/affiliates/management'");
    expect(sidebarSource).toContain("{ to: '/affiliates/quick-actions'");
    expect(sidebarSource).toContain("{ to: '/merchants'");
    expect(sidebarSource).toContain("{ to: '/platform/commissions'");
    expect(sidebarSource).toContain("{ to: '/affiliates/settings'");
  });

  test("limits AFFILIATE users to affiliate operating tools", () => {
    const affiliateSidebarStart = sidebarSource.indexOf("if (user?.role === 'AFFILIATE')");
    const affiliateSidebarEnd = sidebarSource.indexOf("if (shouldDebugSidebar)", affiliateSidebarStart);
    const affiliateSidebarSource = sidebarSource.slice(
      affiliateSidebarStart,
      affiliateSidebarEnd,
    );

    expect(affiliateSidebarStart).toBeGreaterThan(-1);
    expect(affiliateSidebarEnd).toBeGreaterThan(affiliateSidebarStart);
    expect(affiliateSidebarSource).toContain("id: 'affiliate-portal'");
    expect(affiliateSidebarSource).toContain("id: 'affiliate-account'");
    expect(affiliateSidebarSource).toContain("{ to: '/affiliates/dashboard'");
    expect(affiliateSidebarSource).toContain("{ to: '/affiliates/orders'");
    expect(affiliateSidebarSource).toContain("{ to: '/affiliates/orders/create'");
    expect(affiliateSidebarSource).toContain("t('sidebar.affiliateCreateOrder')");
    expect(affiliateSidebarSource).toContain("{ to: '/affiliates/commission'");
    expect(affiliateSidebarSource).toContain("{ to: '/profile'");
    expect(affiliateSidebarSource).not.toContain("{ to: '/affiliates/marketplace'");
    expect(affiliateSidebarSource).not.toContain("t('sidebar.affiliateProductCatalog')");
    expect(affiliateSidebarSource).not.toContain("{ to: '/affiliates/products'");
    expect(affiliateSidebarSource).not.toContain("{ to: '/company-dashboard'");
    expect(affiliateSidebarSource).not.toContain("{ to: '/orders'");
    expect(affiliateSidebarSource).not.toContain("{ to: '/orders/manual'");
    expect(affiliateSidebarSource).not.toContain("{ to: '/settings'");
    expect(affiliateSidebarSource).not.toContain("{ to: '/merchants'");
  });

  test("gates affiliate manual-order and customer entries by affiliate policy fields", () => {
    const affiliateSidebarStart = sidebarSource.indexOf("if (user?.role === 'AFFILIATE')");
    const affiliateSidebarEnd = sidebarSource.indexOf("if (shouldDebugSidebar)", affiliateSidebarStart);
    const affiliateSidebarSource = sidebarSource.slice(
      affiliateSidebarStart,
      affiliateSidebarEnd,
    );

    expect(affiliateSidebarSource).toContain("canCreateOrdersForOthers !== false");
    expect(affiliateSidebarSource).toContain("canViewCustomerData !== false");
    expect(affiliateSidebarSource).toContain("...(canCreateOrdersForOthers");
    expect(affiliateSidebarSource).toContain("{ to: '/affiliates/orders/create'");
    expect(affiliateSidebarSource).toContain("...(canViewCustomerData");
    expect(affiliateSidebarSource).toContain("{ to: '/affiliates/customers'");
  });

  test("limits MERCHANT users to their own portal and account tools", () => {
    const merchantSidebarStart = sidebarSource.indexOf("if (user?.role === 'MERCHANT')");
    const merchantSidebarEnd = sidebarSource.indexOf("if (shouldDebugSidebar)", merchantSidebarStart);
    const merchantSidebarSource = sidebarSource.slice(
      merchantSidebarStart,
      merchantSidebarEnd,
    );

    expect(merchantSidebarStart).toBeGreaterThan(-1);
    expect(merchantSidebarEnd).toBeGreaterThan(merchantSidebarStart);
    expect(merchantSidebarSource).toContain("id: 'merchant-portal'");
    expect(merchantSidebarSource).toContain("id: 'merchant-account'");
    expect(merchantSidebarSource).toContain("{ to: '/merchant-portal'");
    expect(merchantSidebarSource).toContain("{ to: '/products'");
    expect(merchantSidebarSource).toContain("{ to: '/inventory'");
    expect(merchantSidebarSource).toContain("{ to: '/orders'");
    expect(merchantSidebarSource).toContain("{ to: '/merchant-portal/commissions'");
    expect(merchantSidebarSource).toContain("{ to: '/profile'");
    expect(merchantSidebarSource).not.toContain("{ to: '/orders/preparation'");
    expect(merchantSidebarSource).not.toContain("{ to: '/merchant-portal/products'");
    expect(merchantSidebarSource).not.toContain("{ to: '/merchant-portal/orders'");
    expect(merchantSidebarSource).not.toContain("{ to: '/company-dashboard'");
    expect(merchantSidebarSource).not.toContain("{ to: '/customers'");
    expect(merchantSidebarSource).not.toContain("{ to: '/settings'");
    expect(merchantSidebarSource).not.toContain("{ to: '/merchants'");
  });
});
