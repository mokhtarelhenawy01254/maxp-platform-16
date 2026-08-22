import { buildStoreShortcutUrl, hasStoreApp } from "../storeShortcut";

jest.mock("../storeUrl", () => ({
  buildStoreUrl: jest.fn(
    (
      identifier: string,
      path = "/",
      customDomain?: string,
    ) =>
      customDomain
        ? `https://${customDomain}${path}`
        : `https://${identifier}.maxp.online${path}`,
  ),
}));

describe("storeShortcut helpers", () => {
  describe("hasStoreApp", () => {
    it("returns true when the current store app slug is active", () => {
      expect(hasStoreApp(["crm-basic", "store", "hr-basic"])).toBe(true);
    });

    it("returns true for legacy store app slugs", () => {
      expect(hasStoreApp(["store-basic"])).toBe(true);
      expect(hasStoreApp(["store-pro"])).toBe(true);
      expect(hasStoreApp(["ecommerce-basic"])).toBe(true);
      expect(hasStoreApp(["ecommerce-pro"])).toBe(true);
    });

    it("returns false when no store app is active", () => {
      expect(hasStoreApp(["crm-basic", "hr-basic"])).toBe(false);
    });

    it("returns false for missing or malformed active apps", () => {
      expect(hasStoreApp(undefined)).toBe(false);
      expect(hasStoreApp([])).toBe(false);
    });
  });

  describe("buildStoreShortcutUrl", () => {
    it("builds the company storefront URL when the store app is active", () => {
      expect(
        buildStoreShortcutUrl({
          activeApps: ["store"],
          companySlug: "swan",
          companyId: "company-1",
        }),
      ).toBe("https://swan.maxp.online/");
    });

    it("returns null when the store app is not active", () => {
      expect(
        buildStoreShortcutUrl({
          activeApps: ["crm-basic"],
          companySlug: "swan",
          companyId: "company-1",
        }),
      ).toBeNull();
    });

    it("returns null when there is no company slug", () => {
      expect(
        buildStoreShortcutUrl({
          activeApps: ["store"],
          companySlug: null,
          companyId: "company-1",
        }),
      ).toBeNull();
    });

    it("prefers the custom domain when provided", () => {
      const url = buildStoreShortcutUrl({
        activeApps: ["store"],
        companySlug: "swan",
        customDomain: "store.swan.example.com",
        companyId: "company-1",
      });
      expect(url).toContain("store.swan.example.com");
    });
  });
});