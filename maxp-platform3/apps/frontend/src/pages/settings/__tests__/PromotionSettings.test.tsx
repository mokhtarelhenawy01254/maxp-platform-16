/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PromotionSettings from "../PromotionSettings";

const mockNavigate = vi.fn();
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

describe("PromotionSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads promotion settings and saves the updated payload", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          freeShippingEnabled: true,
          freeShippingThreshold: "250",
          freeShippingMessage: "شحن مجاني لما الطلب يوصل {amount} جنيه",
          flatShippingEnabled: true,
          flatShippingFee: "35",
        },
      },
    });

    mockApiPost.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(<PromotionSettings />);

    await screen.findByRole("heading", {
      name: "إعدادات الترويج وزيادة المبيعات",
    });

    fireEvent.change(screen.getByLabelText("الحد الأدنى للطلب (جنيه)"), {
      target: { value: "450" },
    });
    fireEvent.change(screen.getByLabelText("سعر الشحن الموحد (جنيه)"), {
      target: { value: "55" },
    });
    fireEvent.click(screen.getByRole("button", { name: "حفظ الإعدادات" }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/promotion-settings", {
        freeShippingEnabled: true,
        freeShippingThreshold: 450,
        freeShippingMessage: "شحن مجاني لما الطلب يوصل {amount} جنيه",
        flatShippingEnabled: true,
        flatShippingFee: 55,
      });
    });

    await waitFor(() => {
      expect(screen.getByText("تم حفظ الإعدادات بنجاح")).toBeTruthy();
    });
  });

  it("navigates to the dedicated page when a sibling tab is clicked", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          freeShippingEnabled: false,
          freeShippingThreshold: "0",
          freeShippingMessage: "",
          flatShippingEnabled: false,
          flatShippingFee: "0",
        },
      },
    });

    render(<PromotionSettings />);

    await screen.findByRole("heading", {
      name: "إعدادات الترويج وزيادة المبيعات",
    });

    fireEvent.click(screen.getByRole("tab", { name: /خصومات الكميات/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/settings/volume-discounts");
  });
});
