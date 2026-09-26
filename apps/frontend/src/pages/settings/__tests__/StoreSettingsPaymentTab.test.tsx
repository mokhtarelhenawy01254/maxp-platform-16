/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    new URLSearchParams("tab=payment"),
    mockSetSearchParams,
  ],
}));

vi.mock("sonner", () => {
  const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
  };
  return {
    __esModule: true,
    default: toastMock,
    toast: toastMock,
  };
});

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
  BranchesSection: () => null,
}));

vi.mock("../../../components/store/ShippingSectionV2", () => ({
  ShippingSectionV2: () => null,
}));

vi.mock("../../../components/store/CheckoutFormSection", () => ({
  CheckoutFormSection: () => null,
}));

vi.mock("../../../components/store/FooterSettingsSection", () => ({
  FooterSettingsSection: () => null,
}));

vi.mock("../../../components/store/BranchModal", () => ({
  BranchModal: () => null,
}));

vi.mock("../../../components/store/ShippingModalV2", () => ({
  ShippingModalV2: () => null,
}));

vi.mock("../PromotionSettings", () => ({
  __esModule: true,
  default: () => null,
}));

describe("StoreSettings payment tab", () => {
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
    mockApiGet.mockResolvedValue({
      data: {
        data: {
          settings: {},
        },
      },
    });
  });

  it("shows wallet payment sub-tab and properly toggles and saves wallet payment activation", async () => {
    storefrontSettingsService.getSettings.mockResolvedValue({
      data: {
        enabledPaymentMethods: '["cod","wallet"]',
        walletPaymentSettings: {
          enabled: true,
          walletNumber: "01012345678",
          recipientName: "Swan Store",
        },
      },
    });
    storefrontSettingsService.updateSettings.mockResolvedValue({
      data: {
        enabledPaymentMethods: '["cod"]',
        walletPaymentSettings: {
          enabled: false,
          walletNumber: "01012345678",
          recipientName: "Swan Store",
        },
      },
    });

    render(<StoreSettings forcedTab="payment" />);

    // Switch to wallet sub-tab
    const walletTabBtn = await screen.findByRole("button", { name: "الدفع بالمحفظة" });
    fireEvent.click(walletTabBtn);

    // Verify wallet fields are rendered and toggle is active
    await screen.findByText("الدفع بالمحفظة (تحويل + رفع إيصال)");
    const toggleBtn = screen.getByRole("button", { name: /محفظة إلكترونية/ });
    expect(toggleBtn.getAttribute("aria-pressed")).toBe("true");

    // Toggle off
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(storefrontSettingsService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          enabledPaymentMethods: '["cod"]',
          walletPaymentSettings: expect.objectContaining({
            enabled: false,
          }),
        }),
      );
    });
  });

  it("correctly resolves wallet as active when walletPaymentSettings.enabled is true even if enabledPaymentMethods is missing it", async () => {
    storefrontSettingsService.getSettings.mockResolvedValue({
      data: {
        enabledPaymentMethods: '["cod"]',
        walletPaymentSettings: {
          enabled: true,
          walletNumber: "01099998888",
          recipientName: "Test Store",
        },
      },
    });

    render(<StoreSettings forcedTab="payment" />);

    const walletTabBtn = await screen.findByRole("button", { name: "الدفع بالمحفظة" });
    fireEvent.click(walletTabBtn);

    await screen.findByText("الدفع بالمحفظة (تحويل + رفع إيصال)");
    const toggleBtn = screen.getByRole("button", { name: /محفظة إلكترونية/ });
    expect(toggleBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("properly auto-saves COD toggle when clicked in gateway sub-tab", async () => {
    storefrontSettingsService.getSettings.mockResolvedValue({
      data: {
        enabledPaymentMethods: '["cod","wallet"]',
      },
    });
    storefrontSettingsService.updateSettings.mockResolvedValue({
      data: {
        enabledPaymentMethods: '["wallet"]',
      },
    });

    render(<StoreSettings forcedTab="payment" />);

    const codToggleBtn = await screen.findByRole("button", { name: /الدفع عند الاستلام/ });
    expect(codToggleBtn.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(codToggleBtn);

    await waitFor(() => {
      expect(storefrontSettingsService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          enabledPaymentMethods: '["wallet"]',
        }),
      );
    });
  });
});
