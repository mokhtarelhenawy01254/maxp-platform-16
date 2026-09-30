/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PromotionSettings from "../PromotionSettings";

/* jsdom لا ينفذ PointerEvent، ومكونات Radix (زي Switch) محتاجاه أثناء النقر */
const win = window as unknown as { PointerEvent?: unknown };
if (typeof win.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? "mouse";
      this.isPrimary = params.isPrimary ?? true;
    }
  }
  win.PointerEvent = PointerEventPolyfill;
}

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockGetStorefrontSettings = vi.fn();
const mockUpdateStorefrontSettings = vi.fn();

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to?: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

vi.mock("../../../services/storefrontSettingsService", () => ({
  storefrontSettingsService: {
    getSettings: (...args: unknown[]) => mockGetStorefrontSettings(...args),
    updateSettings: (...args: unknown[]) => mockUpdateStorefrontSettings(...args),
  },
}));

const loadedSettings = {
  freeShippingEnabled: true,
  freeShippingThreshold: "250",
  freeShippingMessage: "شحن مجاني لما الطلب يوصل {amount} جنيه",
  flatShippingEnabled: true,
  flatShippingFee: "35",
};

describe("PromotionSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: { success: true, data: loadedSettings } });
    mockApiPost.mockResolvedValue({ data: { success: true } });
    mockGetStorefrontSettings.mockResolvedValue({ data: { hideUtilityBar: false } });
    mockUpdateStorefrontSettings.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it("loads settings, shows active state pills and the live store-bar preview", async () => {
    render(<PromotionSettings />);

    await screen.findByRole("heading", { name: "إعدادات الترويج وزيادة المبيعات" });

    const activePills = await screen.findAllByText("يعمل الآن");
    expect(activePills.length).toBeGreaterThanOrEqual(2);

    const preview = await screen.findByText(
      "شحن مجاني لما الطلب يوصل 250 جنيه",
      {},
      { timeout: 3000 },
    );
    expect(preview).toBeTruthy();
  });

  it("saves automatically after editing the threshold, without a save button", async () => {
    render(<PromotionSettings />);
    await screen.findByRole("heading", { name: "إعدادات الترويج وزيادة المبيعات" });

    expect(screen.queryByText("حفظ وتطبيق التغييرات")).toBeNull();

    const threshold = screen.getByRole("spinbutton", { name: "الحد الأدنى للطلب" });
    fireEvent.change(threshold, { target: { value: "300" } });

    await waitFor(
      () => {
        expect(mockApiPost).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 },
    );
    expect(mockApiPost).toHaveBeenCalledWith("/promotion-settings", {
      freeShippingEnabled: true,
      freeShippingThreshold: 300,
      freeShippingMessage: "شحن مجاني لما الطلب يوصل {amount} جنيه",
      flatShippingEnabled: true,
      flatShippingFee: 35,
    });
  });

  it("resets settings through the in-app confirm dialog", async () => {
    render(<PromotionSettings />);
    await screen.findByRole("heading", { name: "إعدادات الترويج وزيادة المبيعات" });

    fireEvent.click(screen.getByRole("button", { name: /إعادة تعيين/ }));

    const dialogTitle = await screen.findByText(
      "إرجاع الإعدادات للوضع الافتراضي؟",
    );
    expect(dialogTitle).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "إرجاع للقيم الافتراضية" }));

    await waitFor(
      () => {
        expect(mockApiPost).toHaveBeenCalledWith("/promotion-settings/reset", {});
      },
      { timeout: 3000 },
    );
  });

  it("applies the utility-bar toggle instantly through the storefront settings API", async () => {
    render(<PromotionSettings />);
    await screen.findByRole("heading", { name: "إعدادات الترويج وزيادة المبيعات" });

    fireEvent.click(
      screen.getByRole("switch", { name: "إخفاء الشريط العلوي" }),
    );

    await waitFor(() => {
      expect(mockUpdateStorefrontSettings).toHaveBeenCalledWith({
        hideUtilityBar: true,
      });
    });
  });

  it("renders related tools navigation with link to /settings/store-promotion for volume discounts", async () => {
    render(<PromotionSettings />);
    await screen.findByRole("heading", { name: "إعدادات الترويج وزيادة المبيعات" });

    const volumeLink = screen.getByRole("link", { name: /خصومات الكميات/ });
    expect(volumeLink.getAttribute("href")).toBe("/settings/store-promotion");
  });
});
