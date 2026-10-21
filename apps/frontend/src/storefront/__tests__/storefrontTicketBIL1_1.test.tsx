// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  getStorefrontLocale,
  getLocaleDirection,
  STOREFRONT_LOCALE_STORAGE_KEY,
} from "../i18n";
import { PageComposer } from "../engine/PageComposer";
import StorefrontShell from "../StorefrontShell";
import { buildStorefrontPath } from "../utils/paths";

const mockStorefrontData = {
  themeId: "smart-bazaar",
  pages: {
    home: {
      sections: [
        {
          id: "hero-1",
          type: "hero-banner",
          settings: {
            title: "خصم حتى 30%",
            subtitle: "تشكيلة الصيف الحصرية بأفضل الأسعار",
            ctaText: "تسوق الآن",
            i18n: {
              en: {
                title: "Summer Sale — Up to 30% Off",
                subtitle: "Exclusive Summer Collection at Best Prices",
                ctaText: "Shop Now",
              },
            },
          },
        },
        {
          id: "newsletter-1",
          type: "newsletter",
          settings: {
            title: "اشترك في النشرة الإخبارية",
          },
        },
      ],
    },
    shop: {
      sections: [
        {
          id: "shop-hero",
          type: "hero-banner",
          settings: {
            title: "جميع المنتجات",
            i18n: {
              en: {
                title: "All Products",
              },
            },
          },
        },
      ],
    },
  },
  settings: { storeName: "متجر التخفيضات" },
};

// Mock storefront settings hook
vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: { id: "comp-bil1-1", name: "متجر التخفيضات" },
      companyId: "comp-bil1-1",
      storefront: mockStorefrontData,
    },
    isLoading: false,
  }),
}));

// Mock DB page hook
vi.mock("../../hooks/useStorePage", () => ({
  useStorePage: () => ({
    page: null,
    loading: false,
    error: null,
  }),
}));

// Mock categories hook
vi.mock("../hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [],
    loading: false,
  }),
}));

// Mock products hook
vi.mock("../hooks/useProducts", () => ({
  useProducts: () => ({
    products: [],
    loading: false,
    error: null,
  }),
}));

// Mock search hook
vi.mock("../hooks/useSearch", () => ({
  useSearch: () => ({
    query: "",
    setQuery: vi.fn(),
    results: [],
    loading: false,
    isOpen: false,
    setIsOpen: vi.fn(),
  }),
}));

// Mock cart store
vi.mock("../store/useCartStore", () => {
  const storeFn: any = (selector: any) =>
    typeof selector === "function"
      ? selector({
          items: [],
          isOpen: false,
          setIsOpen: vi.fn(),
        })
      : {
          items: [],
          isOpen: false,
          setIsOpen: vi.fn(),
        };

  storeFn.getState = () => ({
    items: [],
    isOpen: false,
    setIsOpen: vi.fn(),
  });
  storeFn.subscribe = vi.fn();
  storeFn.persist = {
    setOptions: vi.fn(),
  };

  return {
    useCartStore: storeFn,
    DEFAULT_STOREFRONT_CART_STORAGE_NAME: "storefront-cart",
    getStorefrontPreviewCartStorageName: () => "storefront-preview-cart",
  };
});

// Mock checkout store
vi.mock("../store/useCheckoutStore", () => {
  const storeFn: any = (selector: any) =>
    typeof selector === "function"
      ? selector({
          formData: {},
          setPendingCouponCode: vi.fn(),
          updateFormData: vi.fn(),
        })
      : {
          formData: {},
          setPendingCouponCode: vi.fn(),
          updateFormData: vi.fn(),
        };

  storeFn.getState = () => ({
    formData: {},
    setPendingCouponCode: vi.fn(),
    updateFormData: vi.fn(),
  });
  storeFn.subscribe = vi.fn();

  return {
    useCheckoutStore: storeFn,
  };
});

describe("Ticket BIL-1.1: Live Storefront Section Localization & HTML Direction Fix", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
    if (document.body) {
      document.body.dir = "rtl";
    }
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  });

  // Test 1: settings.i18n.en applied on home sections (hero-banner) in English mode (?lang=en)
  it("Test 1: Home sections (hero-banner) render English text when ?lang=en is present", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/?lang=en"]}>
          <StorefrontShell />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Document body should contain the English title "Summer Sale — Up to 30% Off"
    expect(await screen.findByText("Summer Sale — Up to 30% Off", {}, { timeout: 5000 })).toBeDefined();
    expect(screen.getByText("Exclusive Summer Collection at Best Prices")).toBeDefined();
    expect(screen.getByText("Shop Now")).toBeDefined();

    // Arabic hero title should NOT be rendered
    expect(screen.queryByText("خصم حتى 30%")).toBeNull();
  });

  // Test 2: Arabic mode (?lang=ar or default) preserves Arabic title and direction
  it("Test 2: Home sections render Arabic text and keep rtl direction when ?lang=ar or no query param", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/?lang=ar"]}>
          <StorefrontShell />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("خصم حتى 30%")).toBeDefined();
    expect(screen.getByText("تشكيلة الصيف الحصرية بأفضل الأسعار")).toBeDefined();
    expect(screen.getByText("تسوق الآن")).toBeDefined();

    // English title should NOT be rendered in Arabic mode
    expect(screen.queryByText("Summer Sale — Up to 30% Off")).toBeNull();
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
  });

  // Test 3: documentElement.dir follows active locale without being overridden back to rtl
  it("Test 3: documentElement.dir and lang cleanly switch to ltr/en in English mode and rtl/ar in Arabic mode", async () => {
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/?lang=en"]}>
          <StorefrontShell />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText("Summer Sale — Up to 30% Off");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
    expect(document.body.dir).toBe("ltr");
    unmount();

    // Now render Arabic route
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/?lang=ar"]}>
          <StorefrontShell />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByText("خصم حتى 30%");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
  });

  // Test 4: Fallback to Arabic content when a section has no English translation
  it("Test 4: Sections without i18n.en gracefully fall back to Arabic content even in English mode", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/?lang=en"]}>
          <StorefrontShell />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Section 1 has EN translations
    expect(await screen.findByText("Summer Sale — Up to 30% Off", {}, { timeout: 5000 })).toBeDefined();

    // Section 2 (newsletter) has no EN translation -> should remain Arabic
    expect(screen.getByText("اشترك في النشرة الإخبارية")).toBeDefined();
  });

  // Test 5: Page navigation preserves active language via buildStorefrontPath and localStorage
  it("Test 5: Navigation between pages preserves the active language (?lang=en preserved)", () => {
    // 1. buildStorefrontPath forwards lang parameter
    const nextPath = buildStorefrontPath("/", "/shop", "?lang=en&previewTheme=khemet");
    expect(nextPath).toContain("lang=en");
    expect(nextPath).toContain("previewTheme=khemet");

    // 2. LocalStorage fallback ensures English locale is maintained across routes even without search
    localStorage.setItem(STOREFRONT_LOCALE_STORAGE_KEY, "en");
    expect(getStorefrontLocale("")).toBe("en");
    expect(getLocaleDirection("en")).toBe("ltr");

    // 3. Explicit Arabic query overrides localStorage
    expect(getStorefrontLocale("?lang=ar")).toBe("ar");
  });

  // Test 6: PageComposer standalone localizes rawPageConfig automatically
  it("Test 6: PageComposer automatically localizes pageConfig sections based on active locale", () => {
    const standaloneConfig = {
      sections: [
        {
          type: "hero-banner",
          settings: {
            title: "عنوان عربي",
            i18n: {
              en: {
                title: "English Banner Title",
              },
            },
          },
        },
      ],
    };

    // Render with locale="en" inside MemoryRouter
    render(
      <MemoryRouter>
        <PageComposer pageConfig={standaloneConfig as any} locale="en" />
      </MemoryRouter>
    );
    expect(screen.getByText("English Banner Title")).toBeDefined();
    expect(screen.queryByText("عنوان عربي")).toBeNull();
  });
});
