import fs from "fs";
import path from "path";

describe("affiliate and merchant app routes", () => {
  const appSource = fs.readFileSync(
    path.resolve(__dirname, "../App.tsx"),
    "utf8",
  );
  const profileSource = fs.readFileSync(
    path.resolve(__dirname, "../pages/profile/Profile.tsx"),
    "utf8",
  );
  const authRoutingSource = fs.readFileSync(
    path.resolve(__dirname, "../utils/authRouting.ts"),
    "utf8",
  );

  test("registers all affiliate operating routes used by the affiliate flows", () => {
    expect(appSource).toContain('path="/affiliates/register"');
    expect(appSource).toContain('path="/affiliates/dashboard"');
    expect(appSource).toContain('path="/affiliates/orders"');
    expect(appSource).toContain('path="/affiliates/orders/create"');
    expect(appSource).toContain('path="/affiliates/customers"');
    expect(appSource).toContain('path="/affiliates/marketplace"');
    expect(appSource).toContain('path="/affiliates/products"');
    expect(appSource).toContain('path="/affiliates/commission"');
  });

  test("registers merchant management routes for provider-side dropshipping flows", () => {
    expect(appSource).toContain('path="/merchants"');
    expect(appSource).toContain('path="/merchants/new"');
    expect(appSource).toContain('path="/merchants/:id"');
    expect(appSource).toContain('path="/merchants/:id/edit"');
  });

  test("applies external-role frontend guards before protected route rendering", () => {
    expect(appSource).toContain("shouldRedirectMerchantToPortal,");
    expect(appSource).toContain("shouldRedirectAffiliateToDashboard,");
    expect(appSource).toContain("shouldRedirectMerchantToPortal({");
    expect(appSource).toContain('return <Navigate to="/merchant-portal" replace />;');
    expect(appSource).toContain("shouldRedirectAffiliateToDashboard({");
    expect(appSource).toContain('return <Navigate to="/affiliates/dashboard" replace />;');
  });

  test("routes affiliate login to the affiliate dashboard", () => {
    expect(authRoutingSource).toContain('if (user?.role === "AFFILIATE")');
    expect(authRoutingSource).toContain('return "/affiliates/dashboard";');
  });

  test("keeps merchant and affiliate account profiles separate from employee HR profile tools", () => {
    expect(profileSource).toContain('const isMerchantUser = user?.role === "MERCHANT";');
    expect(profileSource).toContain('const isAffiliateUser = user?.role === "AFFILIATE";');
    expect(profileSource).toContain('if (isMerchantUser || isAffiliateUser)');
    expect(profileSource).toContain("حساب تاجر دروب شيبنج");
    expect(profileSource).toContain("حساب مسوق أفليت");
    expect(profileSource).toContain("الأدوات المتاحة للتاجر");
    expect(profileSource).toContain("الأدوات المتاحة للمسوق");
    expect(profileSource).toContain("لا تظهر هنا بيانات الموظفين أو الرواتب أو العهد أو ملفات الشركة الداخلية");
  });
});
