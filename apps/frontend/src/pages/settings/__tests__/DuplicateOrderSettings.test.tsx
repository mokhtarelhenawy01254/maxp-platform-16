/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DuplicateOrderSettings from "../DuplicateOrderSettings";

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
    expect(screen.getByDisplayValue("01011112222")).toBeTruthy();
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
          criteria: "phone_amount",
          enabled: true,
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

    // Find the time window switch
    const switches = screen.getAllByRole("switch");
    // Switch 0 is master, switch 1 is time window
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
          windowEnabled: true,
          windowMinutes: 1440,
        })
      );
    });
  });
});
