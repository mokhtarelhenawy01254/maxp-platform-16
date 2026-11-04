// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import DynamicStorefrontPage from "../pages/DynamicStorefrontPage";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";
import { normalizeStorefrontThemeCommercePages, getStorefrontThemePreset } from "../themes";

vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: { id: "company-harmonize-123" },
      storefront: { settings: { storeName: "متجر الفحص التجريبي" } },
    },
    isLoading: false,
  }),
}));

vi.mock("../../hooks/useStorePage", () => ({
  useStorePage: (slug?: string) => {
    if (slug === "shipping") {
      return {
        page: {
          id: "merchant-shipping-page",
          title: "سياسة الشحن والتوصيل الخاصة بالمتجر",
          slug: "shipping",
          content: "<p>شحن مجاني لجميع الطلبات فوق 500 جنيه خلال 48 ساعة داخل القاهرة والجيزة.</p>",
          pageType: "CUSTOM",
          isActive: true,
          updatedAt: "2026-11-04T10:00:00Z",
        },
        loading: false,
        error: null,
      };
    }
    if (slug === "terms") {
      return {
        page: {
          id: "merchant-terms-page",
          title: "الشروط والأحكام المخصصة للتاجر",
          slug: "terms",
          content: "<p>جميع الحقوق محفوظة لمتجرنا الخاص 2026.</p>",
          pageType: "CUSTOM",
          isActive: true,
          updatedAt: "2026-11-04T10:00:00Z",
        },
        loading: false,
        error: null,
      };
    }
    return {
      page: null,
      loading: false,
      error: null,
    };
  },
}));

describe("Day 0: Storefront Theme Fallback Harmonization (Zero-Collision)", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  afterEach(() => {
    cleanup();
  });

  it("marks all policy boilerplate pages with isSystemFallback: true on existing themes", () => {
    const rawTheme = getStorefrontThemePreset("modern-minimal");
    const normalized = normalizeStorefrontThemeCommercePages(rawTheme);

    expect(normalized.pages["shipping"]?.isSystemFallback).toBe(true);
    expect(normalized.pages["returns"]?.isSystemFallback).toBe(true);
    expect(normalized.pages["privacy"]?.isSystemFallback).toBe(true);
    expect(normalized.pages["terms"]?.isSystemFallback).toBe(true);
    expect(normalized.pages["contact"]?.isSystemFallback).toBe(true);
  });

  it("marks generated boilerplate pages (collections, sale, thank-you) with isSystemFallback: true", () => {
    const bareTheme = {
      id: "bare-test-theme",
      name: "Bare Test Theme",
      direction: "rtl" as const,
      header: { brandName: "Bare Store" },
      footer: {},
      tokens: {
        colors: {
          primary: "#000",
          secondary: "#fff",
          accent: "#f00",
          background: "#fff",
          foreground: "#000",
        },
      },
      pages: {
        home: { sections: [] },
        shop: { sections: [] },
      },
    };
    const normalized = normalizeStorefrontThemeCommercePages(bareTheme as any);

    expect(normalized.pages["collections"]?.isSystemFallback).toBe(true);
    expect(normalized.pages["sale"]?.isSystemFallback).toBe(true);
    expect(normalized.pages["thank-you"]?.isSystemFallback).toBe(true);
  });

  it("prioritizes merchant DB page over generated fallback when dbPage exists", async () => {
    const theme = getStorefrontThemePreset("modern-minimal");

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/shipping"]}>
          <StorefrontThemeProvider initialTheme={theme}>
            <Routes>
              <Route path="/:pageSlug" element={<DynamicStorefrontPage />} />
            </Routes>
          </StorefrontThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Merchant DB page title and content should render, NOT the generic generated fallback
    expect(
      await screen.findByText("سياسة الشحن والتوصيل الخاصة بالمتجر")
    ).toBeTruthy();
    expect(
      screen.getByText(/شحن مجاني لجميع الطلبات فوق 500 جنيه/)
    ).toBeTruthy();
    // Verify document title was updated to merchant page title
    expect(document.title).toContain("سياسة الشحن والتوصيل الخاصة بالمتجر");
  });

  it("falls back cleanly to theme-generated PageComposer when dbPage does NOT exist", async () => {
    const theme = getStorefrontThemePreset("modern-minimal");

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/returns"]}>
          <StorefrontThemeProvider initialTheme={theme}>
            <Routes>
              <Route path="/:pageSlug" element={<DynamicStorefrontPage />} />
            </Routes>
          </StorefrontThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Because returns has isSystemFallback: true but no dbPage exists in mock,
    // it falls back to the generated theme layout in PageComposer
    await waitFor(() => {
      expect(document.querySelector(".storefront-page-composer")).toBeTruthy();
    });
  });

  it("renders PageComposer directly without querying store_pages when isSystemFallback is NOT set", async () => {
    const customPageTheme = {
      ...getStorefrontThemePreset("modern-minimal"),
      pages: {
        ...getStorefrontThemePreset("modern-minimal").pages,
        customlanding: {
          id: "customlanding",
          title: "صفحة هبوط مخصصة داخل الثيم",
          isSystemFallback: false,
          sections: [
            {
              id: "sec-1",
              type: "hero-banner",
              settings: { title: "عنوان مخصص غير قابل للتجاوز" },
            },
          ],
        },
      },
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/customlanding"]}>
          <StorefrontThemeProvider initialTheme={customPageTheme}>
            <Routes>
              <Route path="/:pageSlug" element={<DynamicStorefrontPage />} />
            </Routes>
          </StorefrontThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(document.querySelector(".storefront-page-composer")).toBeTruthy();
    });
  });
});
