// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import QuantityOffersPanel from "../components/QuantityOffersPanel";
import { usePdpSelectionStore } from "../store/usePdpSelectionStore";

const mockAddItem = vi.fn();
const mockTrackStorefrontAppUsage = vi.fn();

vi.mock("../store/useCartStore", () => ({
  useCartStore: (selector: (state: { addItem: typeof mockAddItem }) => unknown) =>
    selector({
      addItem: mockAddItem,
    }),
}));

vi.mock("../utils/appUsageTracking", () => ({
  trackStorefrontAppUsage: (...args: unknown[]) => mockTrackStorefrontAppUsage(...args),
}));

vi.mock("../components/VariantSelector", () => ({
  default: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("QuantityOffersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks panel view, offer selection, and add-to-cart for a simple quantity offer", async () => {
    const user = userEvent.setup();

    render(
      <QuantityOffersPanel
        currency="EGP"
        product={{
          id: "product-1",
          name: "Atlas Shoe",
          description: "",
          price: 400,
          comparePrice: 400,
          images: ["/atlas.jpg"],
          slug: "atlas-shoe",
          metadata: {
            quantityOffers: [
              {
                id: "offer-1",
                quantity: 1,
                unitPrice: 325,
                buyText: "اشتري القطعة بـ325 بدل 400",
                isDefault: true,
                isActive: true,
              },
              {
                id: "offer-2",
                quantity: 2,
                unitPrice: 305,
                buyText: "اشتري القطعتين بـ610 بدل 800",
                helperText: "الأكثر توفيرًا",
                isActive: true,
              },
            ],
          },
          productVariants: [],
        }}
      />,
    );

    expect(mockTrackStorefrontAppUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "quantity-offers-pro",
        feature: "quantity_offer_panel_view",
        metadata: expect.objectContaining({
          productId: "product-1",
          productName: "Atlas Shoe",
          offersCount: 2,
        }),
      }),
    );

    await user.click(screen.getByRole("button", { name: /اشتري القطعتين بـ610 بدل 800/i }));

    expect(mockTrackStorefrontAppUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "quantity-offers-pro",
        feature: "quantity_offer_select",
        quantity: 2,
        totalCost: 610,
        metadata: expect.objectContaining({
          productId: "product-1",
          productName: "Atlas Shoe",
          offerId: "offer-2",
          offerLabel: "اشتري القطعتين بـ610 بدل 800",
          offerQuantity: 2,
        }),
      }),
    );

    const addOfferButtons = screen.getAllByRole("button", {
      name: /أضف العرض إلى السلة/i,
    });
    await user.click(addOfferButtons[addOfferButtons.length - 1]);

    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "product-1",
        quantity: 2,
        price: 305,
        quantityOffer: expect.objectContaining({
          offerId: "offer-2",
          offerLabel: "اشتري القطعتين بـ610 بدل 800",
          offerQuantity: 2,
        }),
      }),
      expect.objectContaining({
        openCart: true,
      }),
    );

    expect(mockTrackStorefrontAppUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "quantity-offers-pro",
        feature: "quantity_offer_add_to_cart",
        quantity: 2,
        totalCost: 610,
        metadata: expect.objectContaining({
          productId: "product-1",
          productName: "Atlas Shoe",
          offerId: "offer-2",
          mode: "single-line",
        }),
      }),
    );
  });

  it("uses the selected variant reference price to keep offer savings aligned with the cart", async () => {
    const user = userEvent.setup();

    render(
      <QuantityOffersPanel
        currency="EGP"
        product={{
          id: "product-2",
          name: "Classic Watch",
          description: "",
          price: 4500,
          comparePrice: 5850,
          images: ["/watch.jpg"],
          slug: "classic-watch",
          metadata: {
            quantityOffers: [
              {
                id: "offer-3",
                quantity: 2,
                unitPrice: 4500,
                buyText: "",
                isDefault: true,
                isActive: true,
              },
            ],
          },
          productVariants: [
            {
              id: "variant-1",
              name: "Black / 42",
              price: 4500,
              comparePrice: 5625,
              attributes: {
                color: "Black",
                size: "42",
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getAllByText(/2,250/)).toHaveLength(1);

    await user.click(
      screen.getByRole("button", {
        name: /اشتري 2 قطعة/i,
      }),
    );

    const addOfferButtons = screen.getAllByRole("button", {
      name: /أضف العرض إلى السلة/i,
    });
    await user.click(addOfferButtons[addOfferButtons.length - 1]);

    expect(mockAddItem).toHaveBeenCalledTimes(2);
    expect(mockAddItem).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        basePrice: 5625,
        price: 4500,
        quantityOffer: expect.objectContaining({
          offerId: "offer-3",
          slotIndex: 1,
        }),
      }),
      expect.objectContaining({
        openCart: false,
      }),
    );
    expect(mockTrackStorefrontAppUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "quantity-offers-pro",
        feature: "quantity_offer_add_to_cart",
        metadata: expect.objectContaining({
          offerId: "offer-3",
          savings: 2250,
          mode: "mix-and-match",
        }),
      }),
    );
  });

  it("falls back to volume discounts when explicit quantity offers are missing", () => {
    render(
      <QuantityOffersPanel
        currency="EGP"
        product={{
          id: "product-3",
          name: "Stride Core",
          description: "",
          price: 1890,
          comparePrice: 2290,
          images: ["/stride.jpg"],
          slug: "stride-core",
          metadata: {},
          volumeDiscounts: [
            {
              id: "duo",
              minQuantity: 2,
              maxQuantity: 2,
              discountType: "percentage",
              discountValue: 6,
            },
            {
              id: "trio",
              minQuantity: 3,
              maxQuantity: null,
              discountType: "percentage",
              discountValue: 10,
            },
          ],
          productVariants: [],
        }}
      />,
    );

    expect(screen.getAllByText(/اشتري 2 قطعة/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/اشتري 3 قطعة/i).length).toBeGreaterThan(0);
    expect(mockTrackStorefrontAppUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "quantity-offers-pro",
        feature: "quantity_offer_panel_view",
        metadata: expect.objectContaining({
          productId: "product-3",
          offersCount: 3,
        }),
      }),
    );
  });

  it("syncs primary slot selection to usePdpSelectionStore and avoids infinite loops when parent reads selection", () => {
    usePdpSelectionStore.getState().resetSelection();

    let renderCount = 0;
    const ParentComponent = () => {
      renderCount++;
      const selectedAttributes = usePdpSelectionStore(
        (state: { selection: { attributes?: Record<string, string> } | null }) =>
          state.selection?.attributes,
      );

      return (
        <QuantityOffersPanel
          currency="EGP"
          seedAttributes={selectedAttributes || {}}
          product={{
            id: "product-loop-test",
            name: "Loop Guard Shoe",
            description: "",
            price: 550,
            comparePrice: 700,
            images: ["/shoe.jpg"],
            slug: "loop-guard-shoe",
            metadata: {
              quantityOffers: [
                {
                  id: "offer-loop-1",
                  quantity: 1,
                  unitPrice: 550,
                  buyText: "اشتري قطعة",
                  isDefault: true,
                  isActive: true,
                },
              ],
            },
            productVariants: [
              {
                id: "var-loop-1",
                name: "Black / 42",
                price: 550,
                comparePrice: 700,
                image: "/shoe-black.jpg",
                attributes: {
                  Color: "Black",
                  Size: "42",
                },
              },
            ],
          }}
        />
      );
    };

    // If there is an infinite loop (React Error #185), this render will throw "Maximum update depth exceeded"
    expect(() => render(<ParentComponent />)).not.toThrow();

    // The store should have the synced variant
    const syncedSelection = usePdpSelectionStore.getState().selection;
    expect(syncedSelection).toBeDefined();
    expect(syncedSelection?.productId).toBe("product-loop-test");
    expect(syncedSelection?.variantId).toBe("var-loop-1");
    expect(syncedSelection?.imageUrl).toBe("/shoe-black.jpg");
    expect(syncedSelection?.attributes).toEqual({
      Color: "Black",
      Size: "42",
    });

    // Renders should be low and finite (not runaway)
    expect(renderCount).toBeLessThan(10);
  });

  it("usePdpSelectionStore.syncSelection is idempotent when given identical payloads", () => {
    usePdpSelectionStore.getState().resetSelection();

    const listener = vi.fn();
    const unsubscribe = usePdpSelectionStore.subscribe(listener);

    const selectionPayload = {
      productId: "prod-1",
      productName: "Test",
      variantId: "v-1",
      imageUrl: "/img.jpg",
      unitPrice: 100,
      attributes: { Color: "Red" },
      volumeDiscounts: [],
      requiresVariantSelection: true,
      isSelectionReady: true,
    };

    usePdpSelectionStore.getState().syncSelection(selectionPayload);
    expect(listener).toHaveBeenCalledTimes(1);

    // Call syncSelection again with identical payload
    usePdpSelectionStore.getState().syncSelection({ ...selectionPayload, attributes: { Color: "Red" } });
    // Listener should NOT be called again because the state was identical
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
