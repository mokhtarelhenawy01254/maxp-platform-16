// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MarketplaceAppsManagement from "../../MarketplaceAppsManagement";
import BundlesAndPricingTab from "../components/BundlesAndPricingTab";
import StorefrontThemeCard from "../components/StorefrontThemeCard";
import type { StorefrontThemeCatalogItem } from "../../../../services/storefrontThemeCatalogService";
import type { MarketplaceManagementItem } from "../types/marketplaceAdminTypes";

// Mock axios and toast
vi.mock("axios", () => {
  const mockAxiosInstance = {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  };
  return {
    default: {
      ...mockAxiosInstance,
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../../utils/tokenManager", () => ({
  default: {
    createAuthHeaders: vi.fn().mockReturnValue({ Authorization: "Bearer test" }),
  },
}));

describe("Super Admin MarketplaceAppsManagement Suite", () => {
  it("renders MarketplaceAppsManagement with main tabs and titles", async () => {
    render(
      <MemoryRouter>
        <MarketplaceAppsManagement
          pageTitle="إدارة تطبيقات وأدوات المتجر"
          pageDescription="إدارة التطبيقات والكتالوج"
        />
      </MemoryRouter>,
    );

    const title = await screen.findByText("إدارة تطبيقات وأدوات المتجر");
    expect(title).toBeTruthy();
  });

  it("renders BundlesAndPricingTab correctly with items", () => {
    const mockPricingRules: MarketplaceManagementItem[] = [
      { id: "pr-1", feature: "رسائل إضافية", price: 150, unit: "رسالة", isActive: true },
    ];
    const mockBundles: MarketplaceManagementItem[] = [
      {
        id: "b-1",
        name: "باقة التجارة الشاملة",
        monthlyPrice: 500,
        discount: 20,
        isActive: true,
        isFeatured: true,
        apps: ["app-orders", "app-analytics"],
      },
    ];

    render(
      <MemoryRouter>
        <BundlesAndPricingTab
          pricingRules={mockPricingRules}
          bundles={mockBundles}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onRefresh={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("قواعد التسعير الإضافية")).toBeTruthy();
    expect(screen.getByText("رسائل إضافية")).toBeTruthy();
    expect(screen.getByText("باقة التجارة الشاملة")).toBeTruthy();
  });

  it("renders StorefrontThemeCard with usage metrics and action buttons", () => {
    const mockTheme: StorefrontThemeCatalogItem = {
      themeId: "modern-minimalist",
      name: "مودرن مينيمال",
      description: "قالب عصري وأنيق",
      pricingModel: "FREE",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isActive: true,
      isPublic: true,
      isFeatured: true,
      isDefaultTheme: false,
      preview: {
        imageUrl: "/assets/themes/modern.png",
        colors: ["210 100% 50%"],
      },
      pageStats: {
        homeSections: 6,
        shopSections: 4,
        pdpSections: 3,
        cartSections: 1,
        checkoutSections: 1,
      },
      usageStats: {
        installations: 120,
        activeInstallations: 85,
        purchases: 0,
        currentCompanies: 45,
        installCount: 120,
      },
    } as unknown as StorefrontThemeCatalogItem;

    render(
      <MemoryRouter>
        <StorefrontThemeCard
          theme={mockTheme}
          isSelected={false}
          isSaving={false}
          onToggleSelect={vi.fn()}
          onDraftChange={vi.fn()}
          onSetDefaultTheme={vi.fn()}
          onArchiveTheme={vi.fn()}
          onShowTheme={vi.fn()}
          onSaveTheme={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("مودرن مينيمال")).toBeTruthy();
    expect(screen.getByText("modern-minimalist")).toBeTruthy();
    expect(screen.getByText("حفظ القالب")).toBeTruthy();
  });
});
