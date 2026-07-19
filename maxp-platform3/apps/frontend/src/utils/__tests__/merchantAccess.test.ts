import {
  isAffiliatePrivatePathAllowed,
  isMerchantPrivatePathAllowed,
  shouldRedirectAffiliateToDashboard,
  shouldRedirectMerchantToPortal,
} from "../merchantAccess";

describe("merchant route access", () => {
  test("allows only merchant-owned private areas", () => {
    expect(isMerchantPrivatePathAllowed("/merchant-portal")).toBe(true);
    expect(isMerchantPrivatePathAllowed("/merchant-portal/products")).toBe(true);
    expect(isMerchantPrivatePathAllowed("/merchant-portal/orders")).toBe(true);
    expect(isMerchantPrivatePathAllowed("/merchant-portal/commissions")).toBe(true);
    expect(isMerchantPrivatePathAllowed("/merchant-portal/random-tool")).toBe(false);
    expect(isMerchantPrivatePathAllowed("/profile")).toBe(true);
    expect(isMerchantPrivatePathAllowed("/company-dashboard")).toBe(false);
    expect(isMerchantPrivatePathAllowed("/merchants")).toBe(false);
  });

  test("redirects authenticated merchants away from company admin pages", () => {
    expect(
      shouldRedirectMerchantToPortal({
        isAuthenticated: true,
        isLoading: false,
        isPublicRoute: false,
        pathname: "/company-dashboard",
        role: "MERCHANT",
      }),
    ).toBe(true);

    expect(
      shouldRedirectMerchantToPortal({
        isAuthenticated: true,
        isLoading: false,
        isPublicRoute: false,
        pathname: "/merchant-portal",
        role: "MERCHANT",
      }),
    ).toBe(false);

    expect(
      shouldRedirectMerchantToPortal({
        isAuthenticated: true,
        isLoading: false,
        isPublicRoute: true,
        pathname: "/support/faq",
        role: "MERCHANT",
      }),
    ).toBe(false);

    expect(
      shouldRedirectMerchantToPortal({
        isAuthenticated: true,
        isLoading: false,
        isPublicRoute: false,
        pathname: "/company-dashboard",
        role: "OWNER",
      }),
    ).toBe(false);
  });
});

describe("affiliate route access", () => {
  test("allows only affiliate-owned private areas", () => {
    expect(isAffiliatePrivatePathAllowed("/affiliates/dashboard")).toBe(true);
    expect(isAffiliatePrivatePathAllowed("/affiliates/orders/create")).toBe(true);
    expect(isAffiliatePrivatePathAllowed("/affiliates/customers")).toBe(true);
    expect(isAffiliatePrivatePathAllowed("/profile")).toBe(true);
    expect(isAffiliatePrivatePathAllowed("/company-dashboard")).toBe(false);
    expect(isAffiliatePrivatePathAllowed("/orders")).toBe(false);
    expect(isAffiliatePrivatePathAllowed("/orders/manual")).toBe(false);
    expect(isAffiliatePrivatePathAllowed("/settings")).toBe(false);
  });

  test("redirects authenticated affiliates away from company admin pages", () => {
    const base = {
      isAuthenticated: true,
      isLoading: false,
      isPublicRoute: false,
      role: "AFFILIATE",
    };

    expect(
      shouldRedirectAffiliateToDashboard({
        ...base,
        pathname: "/company-dashboard",
      }),
    ).toBe(true);
    expect(
      shouldRedirectAffiliateToDashboard({ ...base, pathname: "/orders" }),
    ).toBe(true);
    expect(
      shouldRedirectAffiliateToDashboard({
        ...base,
        pathname: "/affiliates/orders/create",
      }),
    ).toBe(false);
    expect(
      shouldRedirectAffiliateToDashboard({
        ...base,
        pathname: "/merchant-portal",
      }),
    ).toBe(true);
    expect(
      shouldRedirectAffiliateToDashboard({
        ...base,
        role: "OWNER",
        pathname: "/settings",
      }),
    ).toBe(false);
  });
});
