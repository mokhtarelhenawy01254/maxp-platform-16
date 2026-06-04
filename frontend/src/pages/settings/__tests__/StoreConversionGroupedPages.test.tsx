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

vi.mock("react-hot-toast", () => ({
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

    expect(screen.getByText("Free Shipping Bar")).toBeTruthy();
    expect(screen.getByLabelText(/حد الشحن المجاني/)).toBeTruthy();
    expect(screen.getByText("Exit Intent Popup")).toBeTruthy();
    expect(screen.getByText("Fake Sale Popup")).toBeTruthy();
  });

  it("renders the reviews page and explains when UGC Reviews Pro is missing", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        data: [],
      },
    });

    render(<StoreReviewsSocialProofSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("UGC Reviews Pro: غير مثبت")).toBeTruthy();
    });

    expect(screen.getByText("Photo Review")).toBeTruthy();
    expect(screen.getByText("Video Review")).toBeTruthy();
    expect(screen.getAllByText("يتطلب تفعيل UGC Reviews Pro.").length).toBeGreaterThan(0);
  });
});
