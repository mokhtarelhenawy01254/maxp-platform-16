// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import MarketplaceV2 from "../MarketplaceV2";

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      id: "usr-1",
      company: {
        id: "comp-1",
        businessSpecialty: { slug: "fashion" },
      },
    },
    refreshUser: vi.fn(),
  }),
}));

const mockT = (key: string, fallback?: unknown) => {
  if (typeof fallback === "string") return fallback;
  if (typeof fallback === "object" && fallback !== null && "defaultValue" in fallback) {
    return (fallback as { defaultValue: string }).defaultValue;
  }
  return key;
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

const mockAppsData = [
  {
    id: "app-1",
    slug: "quantity-offers-pro",
    name: "عروض الكميات المتقدمة",
    nameEn: "Quantity Offers Pro",
    category: "ECOMMERCE",
    description: "تطبيق لزيادة المبيعات عبر الخصومات.",
    isPublic: true,
    isActive: true,
    isInstalled: true,
    pricingModel: "SUBSCRIPTION",
    rating: 4.8,
  },
  {
    id: "app-2",
    slug: "cart-drawer-upsell",
    name: "سلة التسوق الذكية",
    nameEn: "Smart Cart Drawer",
    category: "ECOMMERCE",
    description: "سلة عصرية تدعم العروض المباشرة.",
    isPublic: true,
    isActive: true,
    isInstalled: false,
    pricingModel: "FREE",
    rating: 4.6,
  },
];

const mockCategoriesData = [
  {
    category: "ECOMMERCE",
    name: "التجارة الإلكترونية",
    count: 2,
  },
];

function renderMarketplaceV2() {
  return render(
    <MemoryRouter>
      <MarketplaceV2 />
    </MemoryRouter>,
  );
}

describe("MarketplaceV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders system hubs and search bar", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes("/marketplace/apps")) {
        return Promise.resolve({ data: { success: true, data: mockAppsData } });
      }
      if (url.includes("/marketplace/categories")) {
        return Promise.resolve({ data: { success: true, data: mockCategoriesData } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderMarketplaceV2();

    await waitFor(() => {
      expect(screen.getByText("كل المنظومات")).toBeInTheDocument();
      expect(screen.getAllByText("التجارة والتجزئة").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders status segmented buttons with accurate counts", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes("/marketplace/apps")) {
        return Promise.resolve({ data: { success: true, data: mockAppsData } });
      }
      if (url.includes("/marketplace/categories")) {
        return Promise.resolve({ data: { success: true, data: mockCategoriesData } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderMarketplaceV2();

    await waitFor(() => {
      expect(screen.getByText(/الكل \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/المثبتة \(1\)/)).toBeInTheDocument();
      expect(screen.getByText("غير مثبتة")).toBeInTheDocument();
    });
  });

  it("displays apps in the marketplace grid", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes("/marketplace/apps")) {
        return Promise.resolve({ data: { success: true, data: mockAppsData } });
      }
      if (url.includes("/marketplace/categories")) {
        return Promise.resolve({ data: { success: true, data: mockCategoriesData } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderMarketplaceV2();

    await waitFor(() => {
      expect(screen.getByText("عروض الكميات المتقدمة")).toBeInTheDocument();
      expect(screen.getByText("سلة التسوق الذكية")).toBeInTheDocument();
    });
  });
});
