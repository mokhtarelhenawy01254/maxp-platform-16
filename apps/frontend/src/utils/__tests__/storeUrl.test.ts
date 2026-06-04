// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildStoreUrl,
  toPathScopedStorefrontPath,
} from "../storeUrl";

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

describe("storeUrl helpers", () => {
  beforeEach(() => {
    installMockStorage();
    window.history.replaceState({}, "", "/company-dashboard");
    window.localStorage.clear();
  });

  it("builds same-origin store URLs in local environments when companyId is available", () => {
    const url = buildStoreUrl(
      "qa-activation-final-1777174814644",
      "/shop",
      undefined,
      "cmp_123",
    );

    expect(url).toBe(`${window.location.origin}/store/shop?companyId=cmp_123`);
    expect(window.localStorage.getItem("storefront_companyId")).toBe("cmp_123");
  });

  it("keeps custom domains as the primary storefront target", () => {
    const url = buildStoreUrl(
      "qa-activation-final-1777174814644",
      "/shop",
      "store.example.com",
      "cmp_123",
    );

    expect(url).toBe("https://store.example.com/shop");
  });

  it("normalizes storefront paths into the /store namespace", () => {
    expect(toPathScopedStorefrontPath("/")).toBe("/store");
    expect(toPathScopedStorefrontPath("/shop?sortBy=price")).toBe(
      "/store/shop?sortBy=price",
    );
    expect(toPathScopedStorefrontPath("/store/product/demo")).toBe(
      "/store/product/demo",
    );
  });
});
