/* @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import StoreGrowthWidgetsSettingsPage from "../StoreGrowthWidgetsSettingsPage";
import StoreReviewsSocialProofSettingsPage from "../StoreReviewsSocialProofSettingsPage";

const mockApiGet = vi.fn();

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
    put: vi.fn(),
  },
}));

describe("Store conversion grouped pages", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the growth widgets page with sitewide tools", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [
          {
            id: "suite-1",
            status: "ACTIVE",
            settings: {
              general: { enabled: true },
              modules: {
                freeShippingBar: true,
                inactiveTab: false,
                exitIntentPopup: false,
                fakeVisitorCounter: true,
                fakeSalePopup: false,
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

    render(<StoreGrowthWidgetsSettingsPage />);

    await screen.findByRole("heading", { name: "ودجات الموقع" });

    expect(screen.getByText("شريط الشحن المجاني")).toBeTruthy();
    expect(screen.getByLabelText(/حد الشحن المجاني/)).toBeTruthy();
    expect(screen.getByText("نافذة الخروج")).toBeTruthy();
    expect(screen.getByText("إشعارات المبيعات الحية")).toBeTruthy();
  });

  it("renders the reviews page and explains when UGC Reviews Pro is missing", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [],
      },
    });

    render(<StoreReviewsSocialProofSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("تقييمات العملاء: غير مثبت")).toBeTruthy();
    });

    expect(screen.getByText("تقييم بالصور")).toBeTruthy();
    expect(screen.getByText("تقييم بالفيديو")).toBeTruthy();
    expect(screen.getAllByText("يتطلب تفعيل تقييمات العملاء.").length).toBeGreaterThan(0);
  });
});
