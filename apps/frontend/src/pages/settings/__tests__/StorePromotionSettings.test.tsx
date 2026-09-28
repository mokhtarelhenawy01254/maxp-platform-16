/* @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import StorePromotionSettings from "../StorePromotionSettings";

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
const mockApiDelete = vi.fn();

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
}));

const samplePromotion = {
  isActive: true,
  title: "عرض المتجر الصيفي",
  tiers: JSON.stringify([
    {
      id: "tier-1",
      minQuantity: 2,
      type: "cheapest_percentage",
      value: 50,
      items: 1,
      label: "اشتري 2 وخد خصم 50% على الأرخص",
      isActive: true,
    },
    {
      id: "tier-2",
      minQuantity: 3,
      type: "all_percentage",
      value: 20,
      items: 1,
      label: "اشتري 3 وخد خصم 20% على كل القطع",
      isActive: true,
    },
  ]),
  disableOtherDiscounts: true,
  startDate: "2026-06-01T00:00:00.000Z",
  endDate: "2026-08-31T23:59:00.000Z",
  barVisible: true,
  barSticky: true,
  barPages: "all",
};

describe("StorePromotionSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: { success: true, data: samplePromotion } });
    mockApiPost.mockResolvedValue({ data: { success: true } });
    mockApiDelete.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders page title and discount tiers correctly", async () => {
    render(<StorePromotionSettings />);

    await screen.findByRole("heading", { name: "عروض المتجر الشاملة" });

    // Verify discount tiers exist
    expect(await screen.findByText("المستوى 1")).toBeTruthy();
    expect(await screen.findByText("المستوى 2")).toBeTruthy();
  });

  it("displays Arabic labels for discount types instead of English code keys", async () => {
    render(<StorePromotionSettings />);

    await screen.findByRole("heading", { name: "عروض المتجر الشاملة" });

    // Should display Arabic phrases: «خصم على أرخص قطعة» and «خصم على كل القطع»
    expect(await screen.findByText("خصم على أرخص قطعة")).toBeTruthy();
    expect(await screen.findByText("خصم على كل القطع")).toBeTruthy();

    // English code keys should NEVER be visible as text
    expect(screen.queryByText("cheapest_percentage")).toBeNull();
    expect(screen.queryByText("all_percentage")).toBeNull();
  });

  it("adds a new tier when clicking add tier button", async () => {
    render(<StorePromotionSettings />);

    await screen.findByRole("heading", { name: "عروض المتجر الشاملة" });

    const addBtn = screen.getByRole("button", { name: /إضافة مستوى خصم/i });
    fireEvent.click(addBtn);

    expect(await screen.findByText("المستوى 3")).toBeTruthy();
  });

  it("saves promotion successfully when clicking save", async () => {
    render(<StorePromotionSettings />);

    await screen.findByRole("heading", { name: "عروض المتجر الشاملة" });

    const saveBtn = screen.getByRole("button", { name: /حفظ العرض/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        "/store-promotions",
        expect.objectContaining({
          isActive: true,
          title: "عرض المتجر الصيفي",
        }),
      );
    });
  });
});
