// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import StorefrontThemes from "../StorefrontThemes";

const { mockGetCompanyCatalog, mockPurchaseTheme, mockApplyTheme, mockApiGet, mockGetSettings } = vi.hoisted(() => ({
  mockGetCompanyCatalog: vi.fn(),
  mockPurchaseTheme: vi.fn(),
  mockApplyTheme: vi.fn(),
  mockApiGet: vi.fn(),
  mockGetSettings: vi.fn(),
}));

vi.mock("../../../services/storefrontThemeCatalogService", () => ({
  storefrontThemeCatalogService: {
    getCompanyCatalog: (...args: unknown[]) => mockGetCompanyCatalog(...args),
    purchaseTheme: (...args: unknown[]) => mockPurchaseTheme(...args),
    applyTheme: (...args: unknown[]) => mockApplyTheme(...args),
  },
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

vi.mock("../../../services/storefrontSettingsService", () => ({
  storefrontSettingsService: {
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
  },
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useOptionalAuth: () => ({
    user: { id: "u-1", companyId: "comp-1" },
  }),
}));

const mockT = (key: string, opts?: any) => {
  const translations: Record<string, string> = {
    "storefrontThemes.title": "قوالب المتجر",
    "storefrontThemes.version": "v2.0",
    "storefrontThemes.subtitle": "إدارة قوالب المتجر الاحترافية",
    "storefrontThemes.walletBalance": "الرصيد",
    "storefrontThemes.customizeCurrent": "تخصيص القالب الحالي",
    "storefrontThemes.searchPlaceholder": "ابحث عن قالب...",
    "storefrontThemes.filterAll": "الكل",
    "storefrontThemes.filterOwned": "المملوكة",
    "storefrontThemes.filterFree": "المجانية",
    "storefrontThemes.filterPaid": "المدفوعة",
    "storefrontThemes.allDomains": "جميع القطاعات",
    "storefrontThemes.preview": "معاينة",
    "storefrontThemes.purchase": "شراء القالب",
    "storefrontThemes.apply": "تفعيل القالب",
    "storefrontThemes.freePrice": "مجاني",
    "storefrontThemes.activeBadge": "نشط حالياً",
    "storefrontThemes.featuredBadge": "مميز",
    "storefrontThemes.homeSections": "أقسام الرئيسية",
    "storefrontThemes.shopLayers": "طبقات المتجر",
  };
  return translations[key] || key;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: "ar" },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockThemesList = [
  {
    themeId: "elegance-fashion",
    name: "إيليجانس فاشون",
    description: "قالب متطور للملابس والأزياء الراقية مع تجربة تسوق سريعة.",
    slug: "elegance-fashion",
    pricingModel: "ONE_TIME",
    monthlyPrice: 500,
    currency: "EGP",
    isOwned: true,
    isCurrentTheme: true,
    isFeatured: true,
    canPurchase: false,
    canActivate: true,
    preview: {
      imageUrl: "https://example.com/elegance.jpg",
      colors: ["220 80% 50%", "150 70% 40%"],
    },
    category: {
      primary: { id: "fashion", label: "أزياء" },
      secondary: { id: "womens-fashion", label: "أزياء نسائية" },
    },
    pageStats: {
      homeSections: 8,
      shopSections: 4,
    },
  },
  {
    themeId: "tech-gear",
    name: "تيك جير",
    description: "قالب متجر إلكترونيات وأجهزة ذكية بتصميم مستقبلي.",
    slug: "tech-gear",
    pricingModel: "FREE",
    monthlyPrice: 0,
    currency: "EGP",
    isOwned: false,
    isCurrentTheme: false,
    isFeatured: false,
    canPurchase: false,
    canActivate: true,
    preview: {
      imageUrl: "https://example.com/tech.jpg",
      colors: ["200 90% 45%"],
    },
    category: {
      primary: { id: "electronics", label: "إلكترونيات" },
      secondary: { id: "mobile-store", label: "متاجر الهواتف" },
    },
    pageStats: {
      homeSections: 6,
      shopSections: 3,
    },
  },
];

describe("StorefrontThemes Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCompanyCatalog.mockResolvedValue({
      data: mockThemesList,
    });
    mockApiGet.mockResolvedValue({
      data: {
        data: {
          balance: 1500,
          currency: "EGP",
        },
      },
    });
    mockGetSettings.mockResolvedValue({
      data: {
        companyId: "comp-1",
        companySlug: "my-store",
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders storefront themes header, wallet, and theme cards", async () => {
    render(
      <MemoryRouter>
        <StorefrontThemes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("قوالب المتجر")).toBeInTheDocument();
    });

    expect(screen.getByText("v2.0")).toBeInTheDocument();
    expect(screen.getByText("سوق الإيجنت (Workforce)")).toBeInTheDocument();
    expect(screen.getByText("إيليجانس فاشون")).toBeInTheDocument();
    expect(screen.getByText("تيك جير")).toBeInTheDocument();
    expect(screen.getByText("نشط حالياً")).toBeInTheDocument();
  });

  it("filters themes when typing in search query", async () => {
    render(
      <MemoryRouter>
        <StorefrontThemes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("إيليجانس فاشون")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("ابحث عن قالب...");
    fireEvent.change(searchInput, { target: { value: "تيك جير" } });

    await waitFor(() => {
      expect(screen.queryByText("إيليجانس فاشون")).not.toBeInTheDocument();
      expect(screen.getByText("تيك جير")).toBeInTheDocument();
    });
  });
});
