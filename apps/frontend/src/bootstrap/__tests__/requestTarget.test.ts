import { shouldBootstrapStorefront } from "../requestTarget";

describe("shouldBootstrapStorefront", () => {
  test("keeps storefront routing for subdomain shop pages", () => {
    expect(
      shouldBootstrapStorefront("demo-store.lvh.me", "/store/product/123"),
    ).toBe(true);
    expect(shouldBootstrapStorefront("demo-store.lvh.me", "/product/123")).toBe(
      true,
    );
  });

  test("sends public affiliate and merchant registration routes to the admin/public shell even on subdomains", () => {
    expect(
      shouldBootstrapStorefront("demo-store.lvh.me", "/register/merchant"),
    ).toBe(false);
    expect(
      shouldBootstrapStorefront("demo-store.lvh.me", "/affiliate-register"),
    ).toBe(false);
    expect(
      shouldBootstrapStorefront(
        "demo-store.mokhtarelhenawy.online",
        "/affiliate-register",
      ),
    ).toBe(false);
    expect(
      shouldBootstrapStorefront(
        "swan.maxp.online",
        "/dental-portal/login",
      ),
    ).toBe(false);
    expect(
      shouldBootstrapStorefront(
        "swan.maxp.online",
        "/dental-portal",
      ),
    ).toBe(false);
  });

  test("does not treat localhost admin pages as storefront requests", () => {
    expect(
      shouldBootstrapStorefront("127.0.0.1", "/register/merchant"),
    ).toBe(false);
    expect(shouldBootstrapStorefront("localhost", "/dashboard")).toBe(false);
  });
});
