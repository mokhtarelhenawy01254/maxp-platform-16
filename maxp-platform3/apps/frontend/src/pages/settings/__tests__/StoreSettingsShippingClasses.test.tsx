/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StoreSettings from "../StoreSettings";
import { storefrontSettingsService } from "../../../services/storefrontSettingsService";
import { storeSettingsService } from "../../../services/storeSettingsService";
import { storefrontThemeCatalogService } from "../../../services/storefrontThemeCatalogService";

var mockNavigate = vi.fn();
var mockSetSearchParams = vi.fn();
var mockApiGet = vi.fn();
var mockApiPut = vi.fn();
var mockToastSuccess = vi.fn();
var mockToastError = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    new URLSearchParams("tab=shipping"),
    mockSetSearchParams,
  ],
}));

vi.mock("sonner", () => ({
  __esModule: true,
  default: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
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

vi.mock("../../../hooks/useCheckoutFormSettings", () => ({
  DEFAULT_CHECKOUT_FORM_SETTINGS: {},
  useCheckoutFormSettings: () => ({
    settings: {},
    loading: false,
    saving: false,
    applySettings: vi.fn(),
    handleSave: vi.fn(),
    loadSettings: vi.fn(),
  }),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
    post: vi.fn(),
  },
}));

vi.mock("../../../services/storeSettingsService", () => ({
  storeSettingsService: {
    getBranches: vi.fn(),
    getShippingZones: vi.fn(),
    getCanonicalGovernorates: vi.fn(),
  },
}));

vi.mock("../../../services/footerSettingsService", () => ({
  footerSettingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
  },
}));

vi.mock("../../../services/storefrontSettingsService", () => ({
  storefrontSettingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

vi.mock("../../../services/storefrontThemeCatalogService", () => ({
  storefrontThemeCatalogService: {
    getCompanyCatalog: vi.fn(),
  },
}));

vi.mock("../../../services/checkoutFormSettingsService", () => ({
  checkoutFormSettingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
  },
}));

vi.mock("../../../components/store/BranchesSection", () => ({
  BranchesSection: () => <div data-testid="branches-section" />,
}));

vi.mock("../../../components/store/ShippingSectionV2", () => ({
  ShippingSectionV2: () => <div data-testid="shipping-section-v2" />,
}));

vi.mock("../../../components/store/CheckoutFormSection", () => ({
  CheckoutFormSection: () => <div data-testid="checkout-form-section" />,
}));

vi.mock("../../../components/store/FooterSettingsSection", () => ({
  FooterSettingsSection: () => <div data-testid="footer-settings-section" />,
}));

vi.mock("../../../components/store/BranchModal", () => ({
  BranchModal: () => null,
}));

vi.mock("../../../components/store/ShippingModalV2", () => ({
  ShippingModalV2: () => null,
}));

vi.mock("../../../components/store/StorefrontSettingsTab", () => ({
  StorefrontSettingsTab: () => <div data-testid="storefront-settings-tab" />,
}));

vi.mock("../PromotionSettings", () => ({
  __esModule: true,
  default: () => <div data-testid="promotion-settings" />,
}));

describe("StoreSettings shipping classes", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    storeSettingsService.getBranches.mockResolvedValue({
      data: { data: [] },
    });
    storeSettingsService.getShippingZones.mockResolvedValue({
      data: { data: [] },
    });
    storeSettingsService.getCanonicalGovernorates.mockResolvedValue({
      data: { data: [] },
    });
    storefrontSettingsService.getSettings.mockResolvedValue({
      data: {},
    });
    storefrontThemeCatalogService.getCompanyCatalog.mockResolvedValue({
      data: [],
    });
    mockApiGet.mockImplementation((url: string) => {
      if (url === "/settings/company") {
        return Promise.resolve({
          data: {
            data: {
              settings: {},
            },
          },
        });
      }

      if (url === "/promotion-settings") {
        return Promise.resolve({
          data: {
            data: {},
          },
        });
      }

      return Promise.resolve({ data: {} });
    });
    mockApiPut.mockResolvedValue({
      data: {
        success: true,
      },
    });
  });

  const renderPage = async () => {
    render(<StoreSettings forcedTab="shipping" />);
    await screen.findByPlaceholderText("مثال: مبرد، هدايا");
  };

  it("persists a newly added shipping class immediately", async () => {
    await renderPage();

    fireEvent.change(screen.getByPlaceholderText("مثال: مبرد، هدايا"), {
      target: { value: "مبرد" },
    });
    fireEvent.change(screen.getByPlaceholderText("slug أو اسم مختصر"), {
      target: { value: "chilled" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إضافة فئة" }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith("/settings/company", {
        settings: expect.objectContaining({
          shippingClassMode: "max",
          shippingClassFees: expect.objectContaining({
            chilled: 0,
          }),
          shippingClasses: expect.arrayContaining([
            expect.objectContaining({
              key: "chilled",
              label: "مبرد",
            }),
          ]),
        }),
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("تمت إضافة الفئة وحفظها");
  });

  it("rolls back the optimistic row when saving the new class fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockApiPut.mockRejectedValueOnce(new Error("save failed"));

    await renderPage();

    fireEvent.change(screen.getByPlaceholderText("مثال: مبرد، هدايا"), {
      target: { value: "مبرد" },
    });
    fireEvent.change(screen.getByPlaceholderText("slug أو اسم مختصر"), {
      target: { value: "chilled" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إضافة فئة" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("فشل حفظ إعدادات فئات الشحن");
    });

    expect(
      (screen.getByPlaceholderText("مثال: مبرد، هدايا") as HTMLInputElement)
        .value,
    ).toBe("مبرد");
    expect(
      (screen.getByPlaceholderText("slug أو اسم مختصر") as HTMLInputElement)
        .value,
    ).toBe("chilled");
    expect(screen.queryByText("المعرّف: chilled")).toBeNull();

    consoleErrorSpy.mockRestore();
  });
});
