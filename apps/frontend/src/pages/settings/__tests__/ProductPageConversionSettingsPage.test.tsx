/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProductPageConversionSettingsPage from "../ProductPageConversionSettingsPage";

const mockApiGet = vi.fn();
const mockApiPut = vi.fn();

vi.mock("react-router-dom", () => ({
  NavLink: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string | ((input: { isActive: boolean }) => string);
  }) => (
    <a
      className={
        typeof className === "function" ? className({ isActive: false }) : className
      }
    >
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      id: "user-1",
      companyId: "company-1",
    },
  }),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
  },
}));

describe("ProductPageConversionSettingsPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the product conversion control surface and saves toggles automatically", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [
          {
            id: "suite-1",
            status: "ACTIVE",
            settings: {
              general: {
                enabled: true,
              },
              modules: {
                saleCountdown: true,
                lowStockNotice: true,
                soldCounter: false,
                purchaseFomo: false,
                estimatedDelivery: true,
                stickyAddToCart: true,
                trustedBadges: true,
                backInStock: true,
              },
            },
            app: {
              slug: "conversion-suite",
              name: "Conversion Suite",
            },
          },
        ],
      },
    });

    render(<ProductPageConversionSettingsPage />);

    await screen.findByRole("heading", { name: "تحويلات صفحة المنتج" });

    expect(screen.getByText("كل تغيير هنا يُحفظ تلقائيًا")).toBeTruthy();
    expect(screen.getByText("مؤقّت العروض")).toBeTruthy();
    expect(screen.getByText("شارات الثقة")).toBeTruthy();
    expect(screen.queryByText("ليس بعد. الصفحة الآن تعمل كصفحة تنظيم ونطاق فقط")).toBeNull();

    fireEvent.click(screen.getByRole("switch", { name: "عدّاد المباع" }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith("/my-apps/suite-1/settings", {
        settings: expect.objectContaining({
          general: expect.objectContaining({
            enabled: true,
          }),
          modules: expect.objectContaining({
            soldCounter: true,
          }),
        }),
      });
    });
  });

  it("shows unavailable tool notes when Conversion Suite is not installed", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [],
      },
    });

    render(<ProductPageConversionSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("أدوات رفع التحويل: غير مثبت")).toBeTruthy();
    });

    expect(
      screen.getAllByText("يتطلب تفعيل أدوات رفع التحويل.").length,
    ).toBeGreaterThan(0);
  });
});
