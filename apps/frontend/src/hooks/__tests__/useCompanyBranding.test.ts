// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

const mockGet = vi.fn();
const mockGetSubdomain = vi.fn<() => string | null>(() => null);
const mockGetSubdomainHeaders = vi.fn<() => Record<string, string>>(() => ({}));

vi.mock("../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock("../../config/environment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/environment")>();
  return {
    ...actual,
    isCapacitorNative: () => false,
    envConfig: {
      ...actual.envConfig,
      backendUrl: "https://api.maxp.online",
      apiUrl: "https://api.maxp.online/api/v1",
    },
    getApiUrl: () => "https://api.maxp.online/api/v1",
    getBackendUrl: () => "https://api.maxp.online",
  };
});

vi.mock("../../utils/portalSessionManager", () => ({
  getCurrentSubdomainFromHost: () => mockGetSubdomain(),
  getPortalSubdomainHeaders: () => mockGetSubdomainHeaders(),
}));

import { resolveBrandingLogoUrl, useCompanyBranding } from "../useCompanyBranding";

describe("useCompanyBranding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSubdomain.mockReturnValue(null);
    mockGetSubdomainHeaders.mockReturnValue({});
    document.head.innerHTML = "";
    document.documentElement.style.cssText = "";
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    document.head.innerHTML = "";
    document.documentElement.style.cssText = "";
  });

  it("fetches /public/portal/branding with query params and applies portal DOM branding", async () => {
    window.history.pushState({}, "", "/parent/dashboard?slug=al-noor&code=N123");
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          companyId: "comp_1",
          name: "مركز النور",
          logo: "/uploads/noor.png",
          accent: "#0d9488",
          secondaryColor: "#14b8a6",
          themeMode: "light",
          supportPhone: "01000000000",
          slug: "al-noor",
          publicCode: "N123",
          customDomain: "portal.alnoor.com",
        },
      },
    });

    const { result, unmount } = renderHook(() => useCompanyBranding("comp_1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGet).toHaveBeenCalledTimes(1);
    const [urlArg, cfgArg] = mockGet.mock.calls[0] as [string, Record<string, unknown>];
    expect(urlArg).toContain("/public/portal/branding?");
    expect(urlArg).toContain("companyId=comp_1");
    expect(urlArg).toContain("slug=al-noor");
    expect(urlArg).toContain("code=N123");
    expect(cfgArg["_skipErrorToast"]).toBe(true);

    expect(result.current).toMatchObject({
      logo: "/uploads/noor.png",
      name: "مركز النور",
      accent: "#0d9488",
      secondaryColor: "#14b8a6",
      themeMode: "light",
      supportPhone: "01000000000",
      companyId: "comp_1",
      slug: "al-noor",
      publicCode: "N123",
      customDomain: "portal.alnoor.com",
      loading: false,
    });

    expect(document.documentElement.style.getPropertyValue("--portal-primary")).toBe("#0d9488");
    expect(document.documentElement.style.getPropertyValue("--company-primary")).toBe("#0d9488");

    const manifest = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    expect(manifest).not.toBeNull();
    expect(manifest?.getAttribute("href")).toContain(
      "https://api.maxp.online/api/v1/public/portal/manifest.json?",
    );
    expect(manifest?.getAttribute("href")).toContain("portal=parent");
    expect(manifest?.getAttribute("href")).toContain("companyId=comp_1");

    const themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    expect(themeColor?.content).toBe("#0d9488");

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
    expect(appleTitle?.content).toBe("مركز النور");

    unmount();
    expect(document.querySelector('link[rel="manifest"]')).toBeNull();
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
    expect(document.querySelector('meta[name="apple-mobile-web-app-title"]')).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--portal-primary")).toBe("");
  });

  it("falls back to /public/storefront/settings ONLY when /public/portal/branding returns 404", async () => {
    window.history.pushState({}, "", "/teacher/login");
    mockGetSubdomain.mockReturnValue("swan");
    mockGetSubdomainHeaders.mockReturnValue({ "X-Storefront-Subdomain": "swan" });

    mockGet
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: {
          data: {
            company: { id: "c_swan", name: "أكاديمية سوان", logo: "https://cdn.test/swan.png", slug: "swan" },
            storefront: { designTokens: { colors: { primary: "2563eb" } } },
          },
        },
      });

    const { result } = renderHook(() => useCompanyBranding("swan"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet.mock.calls[0]?.[0]).toBe("/public/portal/branding");
    expect(mockGet.mock.calls[1]?.[0]).toBe("/public/storefront/settings");
    expect(result.current.name).toBe("أكاديمية سوان");
    expect(result.current.accent).toBe("#2563eb");
    expect(result.current.logo).toBe("https://cdn.test/swan.png");
  });

  it("does NOT fall back to storefront settings on non-404 errors", async () => {
    window.history.pushState({}, "", "/doctor/login");
    mockGet.mockRejectedValueOnce({ response: { status: 500 } });

    const { result } = renderHook(() => useCompanyBranding("c_err"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result.current.name).toBe("");
    expect(result.current.logo).toBeNull();
  });

  it("does NOT inject portal CSS variables or manifest on non-portal ERP routes", async () => {
    window.history.pushState({}, "", "/dashboard");
    mockGet.mockResolvedValue({
      data: {
        data: {
          companyId: "c_erp",
          name: "شركة عامة",
          accent: "#e11d48",
        },
      },
    });

    const { result } = renderHook(() => useCompanyBranding("c_erp"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.name).toBe("شركة عامة");
    expect(document.documentElement.style.getPropertyValue("--portal-primary")).toBe("");
    expect(document.querySelector('link[rel="manifest"]')).toBeNull();
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  });

  it("resolveBrandingLogoUrl resolves relative paths and preserves absolute URLs", () => {
    expect(resolveBrandingLogoUrl("/uploads/a.png")).toBe("https://api.maxp.online/uploads/a.png");
    expect(resolveBrandingLogoUrl("uploads/a.png")).toBe("https://api.maxp.online/uploads/a.png");
    expect(resolveBrandingLogoUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(resolveBrandingLogoUrl(null)).toBeNull();
  });
});
