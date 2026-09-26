/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PaymentOffersSettings from "../PaymentOffersSettings";
import { storefrontSettingsService } from "../../../services/storefrontSettingsService";
import { toast } from "sonner";

if (typeof window !== "undefined" && !window.PointerEvent) {
  // @ts-ignore
  window.PointerEvent = class PointerEvent extends MouseEvent {};
}

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
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

describe("PaymentOffersSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads existing payment offers settings and displays them", async () => {
    vi.spyOn(storefrontSettingsService, "getSettings").mockResolvedValue({
      data: {
        id: "settings-1",
        companyId: "company-1",
        enabledPaymentMethods: '["cod","wallet"]',
        walletPaymentSettings: {
          enabled: true,
          walletNumber: "01012345678",
          recipientName: "سوان ستور",
          instructions: "حوّل المبلغ وارفع الإيصال",
          discountEnabled: true,
          discountPercent: 11,
          showDiscountBadge: true,
        },
      } as any,
    });

    render(<PaymentOffersSettings />);

    await screen.findByText("عروض الدفع");

    const percentInput = (await screen.findByPlaceholderText("مثال: 10")) as HTMLInputElement;
    expect(percentInput.value).toBe("11");

    const walletInput = screen.getByPlaceholderText("01xxxxxxxxx أو username@instapay") as HTMLInputElement;
    expect(walletInput.value).toBe("01012345678");

    const recipientInput = screen.getByPlaceholderText("مثال: متجر سوان") as HTMLInputElement;
    expect(recipientInput.value).toBe("سوان ستور");
  });

  it("saves payment offers and synchronizes wallet into enabledPaymentMethods", async () => {
    vi.spyOn(storefrontSettingsService, "getSettings").mockResolvedValue({
      data: {
        id: "settings-1",
        companyId: "company-1",
        enabledPaymentMethods: '["cod"]',
        walletPaymentSettings: {
          discountEnabled: false,
          discountPercent: 0,
          showDiscountBadge: true,
        },
      } as any,
    });

    const updateSpy = vi.spyOn(storefrontSettingsService, "updateSettings").mockResolvedValue({
      data: {
        id: "settings-1",
        companyId: "company-1",
      } as any,
    });

    render(<PaymentOffersSettings />);

    await screen.findByText("عروض الدفع");

    // Toggle discountEnabled on
    const discountSwitch = screen.getAllByRole("switch")[0];
    fireEvent.click(discountSwitch);

    // Enter discount percent 11%
    const percentInput = await screen.findByPlaceholderText("مثال: 10");
    fireEvent.change(percentInput, { target: { value: "11" } });

    // Enter wallet number
    const walletInput = screen.getByPlaceholderText("01xxxxxxxxx أو username@instapay");
    fireEvent.change(walletInput, { target: { value: "01099998888" } });

    // Enter recipient name
    const recipientInput = screen.getByPlaceholderText("مثال: متجر سوان");
    fireEvent.change(recipientInput, { target: { value: "متجر الأزياء" } });

    // Click Save
    const saveButton = screen.getByRole("button", { name: "حفظ إعدادات عروض الدفع" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          walletPaymentSettings: expect.objectContaining({
            discountEnabled: true,
            discountPercent: 11,
            enabled: true,
            walletNumber: "01099998888",
            recipientName: "متجر الأزياء",
          }),
          enabledPaymentMethods: expect.stringContaining("wallet"),
        }),
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("تم حفظ إعدادات عروض الدفع وتفعيلها في المتجر بنجاح"),
    );
  });

  it("shows warning toast if discount is enabled but no electronic method is active", async () => {
    vi.spyOn(storefrontSettingsService, "getSettings").mockResolvedValue({
      data: {
        id: "settings-1",
        companyId: "company-1",
        enabledPaymentMethods: '["cod"]',
        walletPaymentSettings: {
          discountEnabled: false,
          discountPercent: 0,
        },
      } as any,
    });

    render(<PaymentOffersSettings />);

    await screen.findByText("عروض الدفع");

    // Toggle discountEnabled on
    const discountSwitch = screen.getAllByRole("switch")[0];
    fireEvent.click(discountSwitch);

    // Enter percent 11%
    const percentInput = await screen.findByPlaceholderText("مثال: 10");
    fireEvent.change(percentInput, { target: { value: "11" } });

    // Wallet is enabled in form, but walletNumber is empty
    const saveButton = screen.getByRole("button", { name: "حفظ إعدادات عروض الدفع" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("لتطبيق الخصم في المتجر، يرجى كتابة رقم المحفظة أو تفعيل البطاقة البنكية"),
      );
    });
  });
});
