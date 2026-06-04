/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DeliveryOptions from "../DeliveryOptions";

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiPatch = vi.fn();

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: vi.fn(),
    patch: (...args: unknown[]) => mockApiPatch(...args),
    delete: vi.fn(),
  },
}));

describe("DeliveryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("PointerEvent", MouseEvent);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders delivery options and toggles an existing option", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "delivery-1",
            name: "توصيل سريع",
            description: "خلال 24 ساعة داخل المدن الرئيسية",
            deliveryTime: "24 ساعة",
            price: 80,
            isDefault: true,
            isActive: true,
            icon: null,
            sortOrder: 0,
          },
        ],
      },
    });

    mockApiPatch.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(<DeliveryOptions />);

    await screen.findByRole("heading", { name: "خيارات التوصيل" });

    expect(screen.getByText("توصيل سريع")).toBeTruthy();
    expect(screen.getByText("24 ساعة")).toBeTruthy();
    expect(screen.getByText("80 جنيه")).toBeTruthy();

    fireEvent.click(screen.getByRole("switch", { name: "تفعيل توصيل سريع" }));

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith(
        "/delivery-options/delivery-1/toggle",
        {},
      );
    });
  });

  it("opens the dialog and creates a new delivery option", async () => {
    mockApiGet.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    mockApiPost.mockResolvedValue({
      data: {
        success: true,
      },
    });

    render(<DeliveryOptions />);

    await screen.findByRole("heading", { name: "خيارات التوصيل" });

    fireEvent.click(screen.getByRole("button", { name: "إضافة أول خيار" }));

    fireEvent.change(screen.getByLabelText("اسم الخيار"), {
      target: { value: "توصيل اقتصادي" },
    });
    fireEvent.change(screen.getByLabelText("وقت التوصيل"), {
      target: { value: "3-5 أيام" },
    });
    fireEvent.change(screen.getByLabelText("الوصف"), {
      target: { value: "مناسب للطلبات غير المستعجلة" },
    });
    fireEvent.change(screen.getByLabelText("السعر (جنيه)"), {
      target: { value: "35" },
    });

    fireEvent.click(screen.getByRole("button", { name: "إضافة الخيار" }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/delivery-options", {
        name: "توصيل اقتصادي",
        description: "مناسب للطلبات غير المستعجلة",
        deliveryTime: "3-5 أيام",
        price: 35,
        isDefault: false,
        isActive: true,
        sortOrder: 0,
      });
    });
  });
});
