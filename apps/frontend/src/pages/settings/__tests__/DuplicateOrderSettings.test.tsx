/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DuplicateOrderSettings from "../DuplicateOrderSettings";
import { tToast } from "../../../utils/i18n-toast";

const mockApiGet = vi.fn();
const mockApiPut = vi.fn();

vi.mock("../../../services/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
  },
}));

vi.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DuplicateOrderSettings Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads and displays settings from API", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          enabled: true,
          criteria: "phone",
          activeStatuses: ["PENDING", "CONFIRMED", "PROCESSING", "PREPARING", "SHIPPED", "ON_HOLD"],
          windowEnabled: false,
          windowMinutes: 60,
          action: "record_visible",
          alertTeam: true,
          includeStoreOrders: true,
          reportTreatment: "separate",
          exemptPhones: ["01011112222"],
        },
      },
    });

    render(<DuplicateOrderSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات فحص الطلبات المكررة")).toBeTruthy();
    });

    expect(screen.getByText("الفحص مفعّل")).toBeTruthy();
    expect(screen.getByText("01011112222")).toBeTruthy();
  });

  it("toggles enabled switch and allows changing criteria and saving", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          enabled: true,
          criteria: "phone",
          activeStatuses: ["PENDING", "CONFIRMED", "PROCESSING", "PREPARING", "SHIPPED", "ON_HOLD"],
          windowEnabled: false,
          windowMinutes: 60,
          action: "record_visible",
          alertTeam: true,
          includeStoreOrders: true,
          reportTreatment: "separate",
          exemptPhones: [],
        },
      },
    });

    mockApiPut.mockResolvedValueOnce({
      data: {
        success: true,
        data: {},
      },
    });

    render(<DuplicateOrderSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات فحص الطلبات المكررة")).toBeTruthy();
    });

    // Select different criteria (phone_amount)
    const phoneAmountInput = screen.getByDisplayValue("phone_amount");
    fireEvent.click(phoneAmountInput);

    // Save
    const saveButton = screen.getByRole("button", { name: /حفظ الإعدادات/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        "/order-settings/duplicates",
        expect.objectContaining({
          criterion: "phone_amount",
          criteria: "phone_amount",
          enabled: true,
          reportTreatment: "separate",
          excludedPhones: expect.any(Array),
        })
      );
    });
  });

  it("handles time window enabling, preset selection, and custom minutes", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          enabled: true,
          criteria: "phone",
          activeStatuses: ["PENDING", "CONFIRMED", "PROCESSING", "PREPARING", "SHIPPED", "ON_HOLD"],
          windowEnabled: false,
          windowMinutes: 60,
          action: "record_visible",
          alertTeam: true,
          includeStoreOrders: true,
          reportTreatment: "separate",
          exemptPhones: [],
        },
      },
    });

    mockApiPut.mockResolvedValueOnce({
      data: {
        success: true,
        data: {},
      },
    });

    render(<DuplicateOrderSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات فحص الطلبات المكررة")).toBeTruthy();
    });

    // Find the time window switch (switch 0 is master switch, switch 1 is time window)
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[1]);

    // Choose 24 hours preset (1440m)
    await waitFor(() => {
      expect(screen.getByText("24 ساعة")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("24 ساعة"));

    // Save
    const saveButton = screen.getByRole("button", { name: /حفظ الإعدادات/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        "/order-settings/duplicates",
        expect.objectContaining({
          windowMinutes: 1440,
          windowEnabled: true,
          reportTreatment: "separate",
          excludedPhones: expect.any(Array),
        })
      );
    });
  });

  it("preserves and submits reportTreatment and exemptPhones in save payload", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          enabled: true,
          criteria: "phone",
          activeStatuses: ["PENDING", "CONFIRMED"],
          windowEnabled: false,
          windowMinutes: 60,
          action: "record_visible",
          alertTeam: true,
          includeStoreOrders: true,
          reportTreatment: "cancelled",
          exemptPhones: ["01011112222", "01099998888"],
        },
      },
    });

    mockApiPut.mockResolvedValueOnce({
      data: {
        success: true,
        data: {},
      },
    });

    render(<DuplicateOrderSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات فحص الطلبات المكررة")).toBeTruthy();
    });

    const saveButton = screen.getByRole("button", { name: /حفظ الإعدادات/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        "/order-settings/duplicates",
        expect.objectContaining({
          reportAs: "cancelled",
          reportTreatment: "cancelled",
          excludedPhones: expect.arrayContaining(["01011112222", "01099998888"]),
        })
      );
    });
  });

  it("loads target settings shape with criterion, windowMinutes: null, and excludedPhones chips", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          duplicateSettings: {
            enabled: true,
            criterion: "phone_products",
            windowMinutes: null,
            action: "block",
            notifyTeam: true,
            compareStorefrontOrders: true,
            reportAs: "duplicate",
            activeStatuses: ["PENDING", "CONFIRMED", "PROCESSING", "READY", "SHIPPED", "ON_HOLD"],
            excludedPhones: ["01122334455"],
          },
        },
      },
    });

    render(<DuplicateOrderSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات فحص الطلبات المكررة")).toBeTruthy();
    });

    // Check excludedPhones chip is rendered
    expect(screen.getByText("01122334455")).toBeTruthy();
    // Check criterion radio is selected
    const phoneProductsInput = screen.getByDisplayValue("phone_products") as HTMLInputElement;
    expect(phoneProductsInput.checked).toBe(true);
    // Check action block radio is selected
    const blockInput = screen.getByDisplayValue("block") as HTMLInputElement;
    expect(blockInput.checked).toBe(true);
  });

  it("supports adding and removing excluded phones chips", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          enabled: true,
          criterion: "phone",
          windowMinutes: null,
          action: "record_visible",
          notifyTeam: true,
          compareStorefrontOrders: true,
          reportAs: "duplicate",
          activeStatuses: ["PENDING"],
          excludedPhones: ["01011112222"],
        },
      },
    });

    mockApiPut.mockResolvedValueOnce({
      data: {
        success: true,
        data: {},
      },
    });

    render(<DuplicateOrderSettings />);

    await waitFor(() => {
      expect(screen.getByText("01011112222")).toBeTruthy();
    });

    // Add a new phone number
    const phoneInput = screen.getByPlaceholderText(/اكتب رقم الهاتف/i);
    fireEvent.change(phoneInput, { target: { value: "01099998888" } });
    const addButton = screen.getByRole("button", { name: /إضافة/i });
    fireEvent.click(addButton);

    // Verify newly added chip
    expect(screen.getByText("01099998888")).toBeTruthy();

    // Delete the first phone chip
    const deleteBtn = screen.getByLabelText("حذف الرقم 01011112222");
    fireEvent.click(deleteBtn);

    expect(screen.queryByText("01011112222")).toBeNull();

    // Save and verify payload
    const saveButton = screen.getByRole("button", { name: /حفظ الإعدادات/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        "/order-settings/duplicates",
        expect.objectContaining({
          excludedPhones: ["01099998888"],
        })
      );
    });
  });

  it("handles 400 validation error from backend and displays toast error", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          enabled: true,
          criterion: "phone",
          windowMinutes: 60,
          action: "record_visible",
          notifyTeam: true,
          compareStorefrontOrders: true,
          reportAs: "duplicate",
          activeStatuses: ["PENDING"],
          excludedPhones: [],
        },
      },
    });

    const errorResponse = {
      response: {
        status: 400,
        data: {
          success: false,
          message: "نافذة الفحص الزمني يجب أن تكون رقمًا موجبًا أكبر من صفر بالدقائق أو null",
        },
      },
    };
    mockApiPut.mockRejectedValueOnce(errorResponse);

    render(<DuplicateOrderSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات فحص الطلبات المكررة")).toBeTruthy();
    });

    const saveButton = screen.getByRole("button", { name: /حفظ الإعدادات/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(tToast.error).toHaveBeenCalledWith(
        "نافذة الفحص الزمني يجب أن تكون رقمًا موجبًا أكبر من صفر بالدقائق أو null"
      );
    });
  });
});
