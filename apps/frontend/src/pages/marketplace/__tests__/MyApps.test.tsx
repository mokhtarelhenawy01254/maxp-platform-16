// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MyApps, getAppDestination } from "../MyApps";

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
  }),
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "test-user", name: "Test User" },
    company: { id: "test-company", name: "Test Company" },
    refreshUser: vi.fn(),
  }),
}));

const mockApps = [
  {
    id: "app-inst-1",
    status: "ACTIVE",
    activePricingModel: "SUBSCRIPTION",
    totalSpent: 100,
    monthlyUsage: {
      totalCost: 50,
      totalQuantity: 200,
    },
    createdAt: "2026-08-01T00:00:00Z",
    app: {
      id: "app-1",
      slug: "quantity-offers-pro",
      name: "عروض الكميات المتقدمة",
      nameEn: "Quantity Offers Pro",
      category: "ECOMMERCE",
      description: "زيادة مبيعات المتجر عبر عروض الخصم التدريجي للكميات.",
      pricingModel: "SUBSCRIPTION",
      trialDays: 14,
      installCount: 500,
      reviewCount: 20,
      isActive: true,
      isFeatured: true,
      isPopular: true,
      features: {},
    },
  },
  {
    id: "app-inst-2",
    status: "TRIAL",
    activePricingModel: "SUBSCRIPTION",
    trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    totalSpent: 0,
    monthlyUsage: {
      totalCost: 0,
      totalQuantity: 0,
    },
    createdAt: "2026-08-20T00:00:00Z",
    app: {
      id: "app-2",
      slug: "whatsapp-business",
      name: "واتساب للأعمال",
      nameEn: "WhatsApp Business",
      category: "COMMUNICATION",
      description: "إرسال الإشعارات والرسائل التلقائية عبر واتساب.",
      pricingModel: "SUBSCRIPTION",
      trialDays: 7,
      installCount: 1200,
      reviewCount: 50,
      isActive: true,
      isFeatured: true,
      isPopular: true,
      features: {},
    },
  },
  {
    id: "app-inst-3",
    status: "CANCELLED",
    activePricingModel: "PAY_PER_USE",
    totalSpent: 30,
    monthlyUsage: {
      totalCost: 15,
      totalQuantity: 40,
    },
    createdAt: "2026-07-15T00:00:00Z",
    app: {
      id: "app-3",
      slug: "orders-analytics",
      name: "تحليلات الطلبات",
      nameEn: "Order Analytics",
      category: "ANALYTICS",
      description: "تقارير متقدمة لحركة الطلبات والمبيعات.",
      pricingModel: "PAY_PER_USE",
      trialDays: 0,
      installCount: 300,
      reviewCount: 10,
      isActive: true,
      isFeatured: false,
      isPopular: false,
      mainRoute: "/analytics/orders",
      features: {},
    },
  },
];

describe("MyApps Page Redesign", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: mockApps,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("getAppDestination", () => {
    it("returns app.mainRoute if explicitly specified", () => {
      const dest = getAppDestination({
        slug: "custom-app",
        mainRoute: "/custom/dashboard/page",
      });
      expect(dest).toBe("/custom/dashboard/page");
    });

    it("returns mapped platform route for known slugs", () => {
      expect(getAppDestination({ slug: "quantity-offers-pro" })).toBe("/products");
      expect(getAppDestination({ slug: "whatsapp-business" })).toBe("/whatsapp");
      expect(getAppDestination({ slug: "orders-analytics" })).toBe("/analytics/orders");
    });

    it("returns fallback settings route for unknown slugs without mainRoute", () => {
      expect(getAppDestination({ slug: "unknown-plugin" })).toBe("/my-apps/unknown-plugin/settings");
    });
  });

  describe("Component Rendering & Interactions", () => {
    it("renders quick stats and installed apps correctly", async () => {
      mockApiGet.mockResolvedValue({
        data: {
          success: true,
          data: mockApps,
        },
      });

      render(
        <MemoryRouter>
          <MyApps />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("عروض الكميات المتقدمة")).toBeDefined();
        expect(screen.getByText("واتساب للأعمال")).toBeDefined();
      });

      // Total apps: 3
      expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
      // Monthly usage sum: 50 + 15 = 65.00
      expect(screen.getByText("65.00")).toBeDefined();
    });

    it("filters apps by search term", async () => {
      mockApiGet.mockResolvedValue({
        data: {
          success: true,
          data: mockApps,
        },
      });

      render(
        <MemoryRouter>
          <MyApps />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("عروض الكميات المتقدمة")).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText("ابحث بالاسم، الفئة، أو الوصف...");
      fireEvent.change(searchInput, { target: { value: "واتساب" } });

      expect(screen.getByText("واتساب للأعمال")).toBeDefined();
      expect(screen.queryByText("عروض الكميات المتقدمة")).toBeNull();
    });

    it("toggles between grid and list views", async () => {
      mockApiGet.mockResolvedValue({
        data: {
          success: true,
          data: mockApps,
        },
      });

      render(
        <MemoryRouter>
          <MyApps />
        </MemoryRouter>
      );

      await screen.findByText("عروض الكميات المتقدمة");
      const listBtn = await screen.findByTestId("list-view-btn");
      fireEvent.click(listBtn);

      await waitFor(() => {
        expect(screen.getAllByText("فتح").length).toBeGreaterThan(0);
      });
    });

    it("displays zero-state onboarding recommendations when no apps installed", async () => {
      mockApiGet.mockResolvedValue({
        data: {
          success: true,
          data: [],
        },
      });

      render(
        <MemoryRouter>
          <MyApps />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("لم يتم تفعيل أي تطبيقات بعد")).toBeDefined();
        expect(screen.getByText("أدوات أساسية موصى بها لبدء النمو:")).toBeDefined();
        expect(screen.getByText("تصفح متجر التطبيقات الآن")).toBeDefined();
      });
    });

    it("supports bulk selection and toggles bulk actions bar", async () => {
      mockApiGet.mockResolvedValue({
        data: {
          success: true,
          data: mockApps,
        },
      });

      render(
        <MemoryRouter>
          <MyApps />
        </MemoryRouter>
      );

      await screen.findByText("عروض الكميات المتقدمة");

      // Initially no bulk bar
      expect(screen.queryByTestId("bulk-actions-bar")).toBeNull();

      // Click select all
      const selectAllBtn = await screen.findByTestId("select-all-btn");
      fireEvent.click(selectAllBtn);

      // Bulk bar appears with count 3
      const bulkBar = await screen.findByTestId("bulk-actions-bar");
      expect(bulkBar).toBeDefined();
      expect(screen.getByTestId("bulk-export-btn")).toBeDefined();
      expect(screen.getByTestId("bulk-uninstall-btn")).toBeDefined();

      // Clear selection
      const clearBtn = screen.getByTestId("bulk-clear-btn");
      fireEvent.click(clearBtn);

      expect(screen.queryByTestId("bulk-actions-bar")).toBeNull();
    });
  });
});
