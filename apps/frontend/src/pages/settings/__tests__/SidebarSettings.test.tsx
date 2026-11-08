/* @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SidebarSettings from "../SidebarSettings";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../contexts/SidebarSettingsContext", () => ({
  useSidebarSettings: () => ({
    refreshSettings: vi.fn(),
  }),
}));

describe("SidebarSettings Page (Task 83c205dc)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          settings: [
            { key: "dashboard", order: 0, visible: true, labelAr: "لوحة التحكم", labelEn: "Dashboard" },
            { key: "inbox", order: 1, visible: true, labelAr: "صندوق المحادثات", labelEn: "Inbox" },
            { key: "orders", order: 2, visible: true, labelAr: "الطلبات", labelEn: "Orders" },
          ],
        },
      },
    });
    (apiClient.put as any).mockResolvedValue({
      data: {
        success: true,
        message: "تم حفظ إعدادات القائمة الجانبية بنجاح",
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the three sections and live preview column", async () => {
    render(<SidebarSettings />);

    await waitFor(() => {
      // Top header
      expect(screen.getByText("إعدادات القائمة الجانبية")).toBeTruthy();
    });

    // Section 1: الترتيب
    expect(screen.getByText("ترتيب عناصر القائمة الجانبية")).toBeTruthy();

    // Section 2: الإخفاء والإظهار
    expect(screen.getByText("إخفاء وإظهار عناصر القائمة")).toBeTruthy();

    // Section 3: الأسماء
    expect(screen.getByText("تخصيص الأسماء والمسميات")).toBeTruthy();

    // Right Column: المعاينة المباشرة
    expect(screen.getByText("المعاينة المباشرة")).toBeTruthy();
    expect(screen.getByText("MaxPerformance Menu")).toBeTruthy();
  });

  it("moves an item up and down using keyboard fallback buttons", async () => {
    render(<SidebarSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات القائمة الجانبية")).toBeTruthy();
    });

    // Find up/down buttons
    const downButtons = screen.getAllByRole("button", { name: "تحريك لأسفل" });
    expect(downButtons.length).toBeGreaterThan(0);

    // Click 'move down' on the first item (dashboard)
    fireEvent.click(downButtons[0]);

    // Top item should now be inbox (key: inbox)
    const moveUpButtons = screen.getAllByRole("button", { name: "تحريك لأعلى" });
    // Click 'move up' on the second item to restore position
    fireEvent.click(moveUpButtons[1]);
  });

  it("toggles item visibility and prevents hiding locked items", async () => {
    render(<SidebarSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات القائمة الجانبية")).toBeTruthy();
    });

    // Locked items (dashboard, settings) show "محمي" badge and cannot be toggled
    const lockedBadges = screen.getAllByText("محمي");
    expect(lockedBadges.length).toBeGreaterThanOrEqual(2);

    // Find toggle buttons for unlocked items (e.g. "ظاهر")
    const visibleButtons = screen.getAllByRole("button", { name: /ظاهر/i });
    expect(visibleButtons.length).toBeGreaterThan(0);

    // Toggle the first unlocked visible item to hidden
    fireEvent.click(visibleButtons[0]);

    // Verify toggle changed to "مخفي"
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /مخفي/i })).toBeTruthy();
    });
  });

  it("renames an item in Arabic and English, and resets to default", async () => {
    render(<SidebarSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات القائمة الجانبية")).toBeTruthy();
    });

    // Find Arabic input for Orders
    const arInputs = screen.getAllByPlaceholderText("الطلبات");
    expect(arInputs.length).toBeGreaterThan(0);

    // Rename Orders to "طلبات المتجر"
    fireEvent.change(arInputs[0], { target: { value: "طلبات المتجر" } });
    expect(arInputs[0]).toHaveProperty("value", "طلبات المتجر");

    // Live preview should show updated name
    expect(screen.getAllByText("طلبات المتجر").length).toBeGreaterThan(0);

    // Click reset to default for that specific item
    const ordersCard = arInputs[0].closest(".space-y-3");
    const itemResetBtn = ordersCard?.querySelector("button");
    expect(itemResetBtn).toBeTruthy();
    if (itemResetBtn) {
      fireEvent.click(itemResetBtn);
    }

    // Label should be restored to default
    expect(arInputs[0]).toHaveProperty("value", "الطلبات");
  });

  it("calls PUT /settings/sidebar with expected payload on save and toasts success in Arabic", async () => {
    render(<SidebarSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات القائمة الجانبية")).toBeTruthy();
    });

    // Click save changes button
    const saveButton = screen.getByRole("button", { name: /حفظ التغييرات/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        "/settings/sidebar",
        expect.arrayContaining([
          expect.objectContaining({
            key: "dashboard",
            order: 0,
            visible: true,
          }),
        ])
      );
      expect(toast.success).toHaveBeenCalledWith("تم حفظ إعدادات القائمة الجانبية بنجاح");
    });
  });

  it("renders educational system option with key 'education' and allows customizing it", async () => {
    render(<SidebarSettings />);

    await waitFor(() => {
      expect(screen.getByText("إعدادات القائمة الجانبية")).toBeTruthy();
    });

    // Check that 'النظام التعليمي' is present in the list
    const educationItems = screen.getAllByText("النظام التعليمي");
    expect(educationItems.length).toBeGreaterThan(0);

    // Verify key 'education' is rendered
    expect(screen.getByText("education")).toBeTruthy();

    // Verify it is also visible in live preview
    const previewMatches = screen.getAllByText(/النظام التعليمي/);
    expect(previewMatches.length).toBeGreaterThanOrEqual(2);
  });
});
