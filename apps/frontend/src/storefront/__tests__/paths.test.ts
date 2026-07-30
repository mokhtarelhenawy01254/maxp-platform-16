// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildStorefrontPreviewAdminPath,
  buildStorefrontCatalogPreviewPath,
  buildStorefrontPath,
  buildStorefrontProductPreviewPath,
  buildStorefrontPreviewPath,
  getStorefrontProductRouteKey,
  getStorefrontBasePath,
  resolveImplicitStorefrontPreviewAdminOrigin,
} from "../utils/paths";

const installMockStorage = () => {
  let store: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
};

describe("storefront path helpers", () => {
  beforeEach(() => {
    installMockStorage();
    window.history.replaceState({}, "", "/settings/storefront/editor");
    window.localStorage.clear();
  });

  it("detects the query-mode storefront base path", () => {
    expect(getStorefrontBasePath("/store")).toBe("/store");
    expect(getStorefrontBasePath("/store/product/demo")).toBe("/store");
    expect(getStorefrontBasePath("/product/demo")).toBe("");
  });

  it("builds storefront paths for query-mode previews", () => {
    expect(
      buildStorefrontPath(
        "/store",
        "/shop",
        "?companyId=maxp-minimal-demo&previewTheme=bold-fashion&previewSource=marketplace",
      ),
    ).toBe(
      "/store/shop?companyId=maxp-minimal-demo&previewTheme=bold-fashion&previewSource=marketplace",
    );
    expect(
      buildStorefrontPath(
        "/store/product/demo",
        "/checkout",
        "?companyId=maxp-minimal-demo&previewTheme=bold-fashion",
      ),
    ).toBe("/store/checkout?companyId=maxp-minimal-demo&previewTheme=bold-fashion");
  });

  it("builds storefront paths for subdomain storefronts without company query", () => {
    expect(buildStorefrontPath("/", "/shop")).toBe("/shop");
    expect(buildStorefrontPath("/product/demo", "/checkout")).toBe("/checkout");
  });

  it("normalizes nullish path inputs instead of throwing", () => {
    expect(buildStorefrontPath(null as string, null as string)).toBe(
      "/",
    );
    expect(
      buildStorefrontPreviewAdminPath(
        null as string,
        null as string,
      ),
    ).toBe("/");
    expect(
      getStorefrontProductRouteKey(null as string),
    ).toBeNull();
  });

  it("merges route query params with preview query params without corrupting the URL", () => {
    expect(
      buildStorefrontPath(
        "/store/product/demo",
        "/shop?category=heels&sortBy=price",
        "?companyId=maxp-minimal-demo&previewTheme=solea-femme",
      ),
    ).toBe(
      "/store/shop?category=heels&sortBy=price&companyId=maxp-minimal-demo&previewTheme=solea-femme",
    );
  });

  it("preserves the admin return origin while navigating inside preview mode", () => {
    expect(
      buildStorefrontPath(
        "/store/product/demo",
        "/checkout",
        "?companyId=maxp-minimal-demo&previewTheme=solea-femme&previewSource=marketplace&previewAdminOrigin=https%3A%2F%2Fadmin.example.com",
      ),
    ).toBe(
      "/store/checkout?companyId=maxp-minimal-demo&previewTheme=solea-femme&previewSource=marketplace&previewAdminOrigin=https%3A%2F%2Fadmin.example.com",
    );
  });

  it("extracts product route keys from public storefront product paths", () => {
    expect(getStorefrontProductRouteKey("/product/demo-shoe")).toBe("demo-shoe");
    expect(getStorefrontProductRouteKey("/shop/products/demo-shoe")).toBe("demo-shoe");
    expect(getStorefrontProductRouteKey("/store/product/demo-shoe")).toBe("demo-shoe");
    expect(getStorefrontProductRouteKey("/store/shop/products/demo-shoe%20v2")).toBe(
      "demo-shoe v2",
    );
    expect(getStorefrontProductRouteKey("/shop")).toBeNull();
  });

  it("builds preview links for storefront settings shortcuts", () => {
    expect(
      buildStorefrontPreviewPath("/lookbook", {
        customDomain: "preview.example.com",
        previewTheme: "solea-femme",
        previewSource: "settings",
        previewAdminOrigin: "https://admin.example.com",
      }),
    ).toBe(
      "https://preview.example.com/lookbook?previewTheme=solea-femme&previewSource=settings&previewAdminOrigin=https%3A%2F%2Fadmin.example.com",
    );

    expect(
      buildStorefrontPreviewPath("/size-guide", {
        customDomain: "preview.example.com",
      }),
    ).toBe("https://preview.example.com/size-guide");

    expect(
      buildStorefrontProductPreviewPath("crystal-heel", {
        customDomain: "preview.example.com",
        previewTheme: "solea-femme",
        previewSource: "settings",
        previewAdminOrigin: "https://admin.example.com",
      }),
    ).toBe(
      "https://preview.example.com/product/crystal-heel?previewTheme=solea-femme&previewSource=settings&previewAdminOrigin=https%3A%2F%2Fadmin.example.com",
    );

    expect(
      buildStorefrontCatalogPreviewPath({
        pageKey: "sale",
        categoryId: "heels",
        sortValue: "price-desc",
        priceRangeValue: "50-100",
        customDomain: "preview.example.com",
        previewTheme: "solea-femme",
        previewSource: "settings",
        previewAdminOrigin: "https://admin.example.com",
      }),
    ).toBe(
      "https://preview.example.com/sale?category=heels&sortBy=price&sortOrder=desc&minPrice=50&maxPrice=100&previewTheme=solea-femme&previewSource=settings&previewAdminOrigin=https%3A%2F%2Fadmin.example.com",
    );
  });

  it("builds subdomain preview URLs without adding companyId query params", () => {
    const previewUrl = buildStorefrontPreviewPath("/lookbook", {
      companySlug: "maxp-minimal-demo",
      previewTheme: "solea-femme",
      previewSource: "settings",
    });
    const parsed = new URL(previewUrl);

    expect(parsed.hostname.startsWith("maxp-minimal-demo.")).toBe(true);
    expect(parsed.pathname).toBe("/lookbook");
    expect(parsed.searchParams.get("companyId")).toBeNull();
    expect(parsed.searchParams.get("previewTheme")).toBe("solea-femme");
    expect(parsed.searchParams.get("previewSource")).toBe("settings");
  });

  it("builds same-origin preview URLs in local environments when companyId is available", () => {
    const previewUrl = buildStorefrontPreviewPath("/lookbook", {
      companyId: "cmp_1",
      companySlug: "maxp-minimal-demo",
      previewTheme: "solea-femme",
      previewSource: "settings",
      previewAdminOrigin: "http://127.0.0.1:5173",
    });
    const parsed = new URL(previewUrl);

    expect(parsed.origin).toBe(window.location.origin);
    expect(parsed.pathname).toBe("/store/lookbook");
    expect(parsed.searchParams.get("companyId")).toBe("cmp_1");
    expect(parsed.searchParams.get("previewTheme")).toBe("solea-femme");
    expect(parsed.searchParams.get("previewSource")).toBe("settings");
    expect(parsed.searchParams.get("previewAdminOrigin")).toBe(
      "http://127.0.0.1:5173",
    );
  });

  it("builds admin return URLs from preview search params", () => {
    expect(
      buildStorefrontPreviewAdminPath(
        "/marketplace/themes?theme=solea-femme",
        "?previewAdminOrigin=https%3A%2F%2Fadmin.example.com",
      ),
    ).toBe("https://admin.example.com/marketplace/themes?theme=solea-femme");
  });

  it("falls back to relative admin routes when preview origin is not available", () => {
    expect(
      buildStorefrontPreviewAdminPath(
        "/marketplace/themes?theme=solea-femme",
        "",
      ),
    ).toBe("/marketplace/themes?theme=solea-femme");
  });

  it("infers the root admin origin for legacy subdomain previews without explicit admin origin", () => {
    expect(
      resolveImplicitStorefrontPreviewAdminOrigin(
        "maxp.lvh.me:3000",
        "http:",
        "lvh.me:3000",
      ),
    ).toBe("http://lvh.me:3000");
  });
});
