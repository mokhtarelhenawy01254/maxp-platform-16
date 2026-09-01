/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import StoreSettings from "../StoreSettings";
import { storeSettingsService } from "../../../services/storeSettingsService";
import { storefrontSettingsService } from "../../../services/storefrontSettingsService";

const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
const mockApiGet = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    new URLSearchParams("tab=checkout"),
    mockSetSearchParams,
  ],
}));

vi.mock("sonner", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
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
    put: vi.fn(),
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

vi.mock("../PromotionSettings", () => ({
  __esModule: true,
  default: () => <div data-testid="promotion-settings" />,
}));

describe("StoreSettings checkout tab", () => {
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
    mockApiGet.mockResolvedValue({
      data: {
        data: {
          settings: {},
        },
      },
    });
  });

  it("keeps checkout settings focused and routes product conversion to its standalone page", async () => {
    render(<StoreSettings forcedTab="checkout" />);

    await screen.findByText("إعدادات حقول الشيك أوت");

    expect(screen.queryByText("أدوات التحويل داخل صفحة المنتج")).toBeNull();
    expect(screen.getByTestId("checkout-form-section")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "فتح أدوات التحويل" }),
    );

    expect(mockNavigate).toHaveBeenCalledWith("/settings/store/tools");
  });
});
