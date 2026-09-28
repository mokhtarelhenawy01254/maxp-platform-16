/* @vitest-environment jsdom */

import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import StorePromotionBar from "../components/StorePromotionBar";
import StorePromotionTiersCard from "../components/StorePromotionTiersCard";

const mockUseStorefrontSettings = vi.fn();
const mockUseCartStore = vi.fn();

vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: () => mockUseStorefrontSettings(),
}));

vi.mock("../store/useCartStore", () => ({
  useCartStore: (selector: (state: { items: Array<{ id: string; quantity: number }> }) => unknown) =>
    mockUseCartStore(selector),
}));

describe("Storefront Promotion Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const sampleCompanyPromotion = {
    isActive: true,
    title: "عرض العودة",
    barVisible: true,
    barPages: "all",
    barSticky: false,
    tiers: [
      {
        id: "t1",
        minQuantity: 2,
        type: "cheapest_percentage",
        value: 50,
        items: 1,
        label: "اشتري 2 واحصل على خصم 50% على الثانية",
        isActive: true,
      },
      {
        id: "t2",
        minQuantity: 3,
        type: "all_percentage",
        value: 20,
        items: 1,
        label: "اشتري 3 واحصل على خصم 20% على الجميع",
        isActive: true,
      },
    ],
    disableOtherDiscounts: false,
  };

  it("renders StorePromotionBar with progress and message when active", () => {
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        company: {
          storePromotion: sampleCompanyPromotion,
        },
      },
    });

    mockUseCartStore.mockImplementation((selector) =>
      selector({
        items: [{ id: "p1", quantity: 1 }],
      })
    );

    render(
      <MemoryRouter initialEntries={["/product/item-1"]}>
        <StorePromotionBar />
      </MemoryRouter>
    );

    expect(screen.getByRole("region", { name: "عرض المتجر الشامل" })).toBeTruthy();
    expect(screen.getByText(/أضف قطعة واحدة فقط/)).toBeTruthy();
  });

  it("renders StorePromotionTiersCard on product page and allows selecting quantity", () => {
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        company: {
          storePromotion: sampleCompanyPromotion,
        },
      },
    });

    const mockSelectQuantity = vi.fn();
    const mockProduct = {
      id: "prod-1",
      name: "حقيبة مميزة",
      price: 200,
      comparePrice: 200,
      productVariants: [],
    } as any;

    render(
      <StorePromotionTiersCard
        product={mockProduct}
        currency="EGP"
        currentQuantity={1}
        onSelectQuantity={mockSelectQuantity}
      />
    );

    expect(screen.getByText("عرض العودة")).toBeTruthy();
    expect(screen.getByText("قطعة واحدة")).toBeTruthy();
    expect(screen.getByText("اشتري 2 واحصل على خصم 50% على الثانية")).toBeTruthy();
    expect(screen.getByText("اشتري 3 واحصل على خصم 20% على الجميع")).toBeTruthy();

    const tierTwoButton = screen.getByText("اشتري 2 واحصل على خصم 50% على الثانية").closest("button");
    expect(tierTwoButton).toBeTruthy();
    if (tierTwoButton) {
      fireEvent.click(tierTwoButton);
      expect(mockSelectQuantity).toHaveBeenCalledWith(2);
    }
  });
});
