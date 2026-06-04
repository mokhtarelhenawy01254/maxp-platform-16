// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  createMarketplacePreviewOrderResponse,
  getMarketplacePreviewPurchaseTracking,
  getMarketplacePreviewTrackedOrder,
} from "../marketplacePreviewOrder";

describe("marketplacePreviewOrder", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.sessionStorage.clear();
  });

  it("builds seeded purchase tracking for Max Care Go preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=max-care-go&previewSource=marketplace",
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();

    expect(purchaseTracking?.orderNumber).toBe("MCG-2048");
    expect(purchaseTracking?.phone).toBe("01055550001");
    expect(purchaseTracking?.items).toHaveLength(3);
    expect(purchaseTracking?.items.map((item) => item.productId)).toEqual([
      "cough-relief-syrup",
      "digital-thermometer",
      "first-aid-kit",
    ]);
    expect(purchaseTracking?.total).toBeGreaterThan(0);
  });

  it("builds seeded purchase tracking for cafe preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=cafe-demo&previewSource=marketplace",
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();

    expect(purchaseTracking?.orderNumber).toBe("MUT-2048");
    expect(purchaseTracking?.phone).toBe("01077770002");
    expect(purchaseTracking?.items).toHaveLength(3);
    expect(purchaseTracking?.items.map((item) => item.productId)).toEqual([
      "house-blend-beans",
      "pistachio-croissant",
      "oat-latte-bottle",
    ]);
    expect(purchaseTracking?.total).toBeGreaterThan(0);
  });

  it("builds a tracked order summary for Max Care Go preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=max-care-go&previewSource=marketplace",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("MCG-2048");
    expect(trackedOrder?.status).toBe("PROCESSING");
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "التجمع",
    });
    expect(trackedOrder?.items).toHaveLength(3);
  });

  it("creates a successful preview order response without hitting the backend", () => {
    window.history.replaceState(
      {},
      "",
      "/checkout?previewTheme=max-care-go&previewSource=marketplace",
    );

    const response = createMarketplacePreviewOrderResponse({
      guestName: "محمد علي",
      guestEmail: "mohamed@example.com",
      guestPhone: "01012345678",
      paymentMethod: "cod",
      notes: "برجاء الاتصال قبل الوصول",
      shippingAddress: {
        governorate: "Cairo",
        city: "المعادي",
        street: "24 شارع النصر",
        address: "24 شارع النصر",
        addressLine1: "24 شارع النصر",
      },
      subtotal: 1270,
      shippingCost: 70,
      total: 1340,
    });

    expect(response).toMatchObject({
      success: true,
      data: {
        guestName: "محمد علي",
        guestEmail: "mohamed@example.com",
        guestPhone: "01012345678",
        subtotal: 1270,
        shippingCost: 70,
        total: 1340,
        finalTotal: 1340,
        preview: true,
      },
    });
    expect(response?.data?.orderNumber).toMatch(/^MCG-\d{8}$/);
    expect(response?.data?.items).toHaveLength(3);
  });

  it("reuses the stored preview order on thank-you for the submitted order number", () => {
    window.history.replaceState(
      {},
      "",
      "/checkout?previewTheme=men-shoes-eg&previewSource=marketplace",
    );

    const response = createMarketplacePreviewOrderResponse({
      guestName: "اختبار خطوة",
      guestPhone: "01012345678",
      subtotal: 1890,
      total: 1890,
      items: [
        {
          productId: "stride-core-runner",
          variantId: "stride-core-runner-race-red-size-41",
          name: "سنيكر Core يومي",
          quantity: 1,
          price: 1890,
          attributes: {
            اللون: "أحمر سباق",
            المقاس: "41",
          },
        },
      ],
    });

    expect(response?.data?.orderNumber).toMatch(/^KH-\d{8}$/);

    window.history.replaceState(
      {},
      "",
      `/thank-you?previewTheme=men-shoes-eg&previewSource=marketplace&orderId=${response?.data?.orderNumber}`,
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();
    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(purchaseTracking?.orderNumber).toBe(response?.data?.orderNumber);
    expect(purchaseTracking?.items).toHaveLength(1);
    expect(purchaseTracking?.total).toBe(1890);
    expect(trackedOrder?.orderNumber).toBe(response?.data?.orderNumber);
    expect(trackedOrder?.items).toHaveLength(1);
    expect(trackedOrder?.finalTotal).toBe(1890);
  });

  it("creates and reuses a stored preview order for women-fashion-eg", () => {
    window.history.replaceState(
      {},
      "",
      "/checkout?previewTheme=women-fashion-eg&previewSource=marketplace",
    );

    const response = createMarketplacePreviewOrderResponse({
      guestName: "سارة أحمد",
      guestPhone: "01012345678",
      subtotal: 3762,
      total: 3762,
      items: [
        {
          productId: "flow-midi-dress",
          variantId: "flow-midi-dress-clay-rose-size-s",
          name: "فستان Flow Midi",
          quantity: 2,
          price: 1881,
          attributes: {
            اللون: "طوبي ناعم",
            المقاس: "S",
          },
          quantityOffer: {
            offerId: "women-fashion-duo-save",
            offerQuantity: 2,
          },
        },
      ],
    });

    expect(response?.success).toBe(true);
    expect(response?.data?.orderNumber).toMatch(/^ET-\d{8}$/);
    expect(response?.data?.items).toHaveLength(1);

    window.history.replaceState(
      {},
      "",
      `/thank-you?previewTheme=women-fashion-eg&previewSource=marketplace&orderId=${response?.data?.orderNumber}`,
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();
    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(purchaseTracking?.orderNumber).toBe(response?.data?.orderNumber);
    expect(purchaseTracking?.total).toBe(3762);
    expect(trackedOrder?.orderNumber).toBe(response?.data?.orderNumber);
    expect(trackedOrder?.items[0]?.productId).toBe("flow-midi-dress");
    expect(trackedOrder?.finalTotal).toBe(3762);
  });

  it("builds seeded purchase tracking for solea-femme preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=solea-femme&previewSource=marketplace",
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();

    expect(purchaseTracking?.orderNumber).toBe("SF-2048");
    expect(purchaseTracking?.phone).toBe("01077770031");
    expect(purchaseTracking?.items).toHaveLength(3);
    expect(purchaseTracking?.items.map((item) => item.productId)).toEqual([
      "solea-femme-cloud-sneaker",
      "solea-femme-brace-heel",
      "solea-femme-summer-sandal",
    ]);
    expect(purchaseTracking?.items[1]?.variantId).toBe(
      "solea-femme-brace-heel-rose-size-38",
    );
    expect(purchaseTracking?.total).toBeGreaterThan(0);
  });

  it("creates and reuses a stored preview order for solea-femme", () => {
    window.history.replaceState(
      {},
      "",
      "/checkout?previewTheme=solea-femme&previewSource=marketplace",
    );

    const response = createMarketplacePreviewOrderResponse({
      guestName: "مها سمير",
      guestPhone: "01012345679",
      subtotal: 2890,
      total: 2890,
      items: [
        {
          productId: "solea-femme-brace-heel",
          variantId: "solea-femme-brace-heel-rose-size-38",
          name: "هيل سوار",
          quantity: 1,
          price: 2890,
          attributes: {
            اللون: "وردي هادئ",
            المقاس: "38",
          },
        },
      ],
    });

    expect(response?.success).toBe(true);
    expect(response?.data?.orderNumber).toMatch(/^SF-\d{8}$/);
    expect(response?.data?.items).toHaveLength(1);

    window.history.replaceState(
      {},
      "",
      `/thank-you?previewTheme=solea-femme&previewSource=marketplace&orderId=${response?.data?.orderNumber}`,
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();
    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(purchaseTracking?.orderNumber).toBe(response?.data?.orderNumber);
    expect(purchaseTracking?.total).toBe(2890);
    expect(trackedOrder?.orderNumber).toBe(response?.data?.orderNumber);
    expect(trackedOrder?.items[0]?.productId).toBe("solea-femme-brace-heel");
    expect(trackedOrder?.finalTotal).toBe(2890);
  });

  it("builds a tracked order summary for Max Care Go preview", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=max-care-go&previewSource=marketplace",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("MCG-2048");
    expect(trackedOrder?.paymentMethod).toBe("wallet");
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "التجمع",
    });
    expect(trackedOrder?.items).toHaveLength(3);
  });

  it("builds a tracked order summary for cafe preview", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=cafe-demo&previewSource=marketplace",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("MUT-2048");
    expect(trackedOrder?.paymentMethod).toBe("card");
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "الزمالك",
    });
    expect(trackedOrder?.items).toHaveLength(3);
  });

  it("builds a tracked order summary for solea-femme preview", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=solea-femme&previewSource=marketplace",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("SF-2048");
    expect(trackedOrder?.paymentMethod).toBe("cod");
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "الزمالك",
    });
    expect(trackedOrder?.items).toHaveLength(3);
  });

  it("allows preview status override for pc-hub thank-you", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=pc-hub-eg&previewSource=marketplace&previewOrderStatus=SHIPPED",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("PCH-2048");
    expect(trackedOrder?.status).toBe("SHIPPED");
  });

  it("builds seeded purchase tracking for district-market preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=district-market&previewSource=marketplace",
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();

    expect(purchaseTracking?.orderNumber).toBe("DM-2048");
    expect(purchaseTracking?.phone).toBe("01088880024");
    expect(purchaseTracking?.items).toHaveLength(3);
    expect(purchaseTracking?.items.map((item) => item.productId)).toEqual([
      "dm-clip-lid-set",
      "dm-thermal-bottle",
      "dm-drawer-organizer",
    ]);
    expect(purchaseTracking?.total).toBeGreaterThan(0);
  });

  it("builds a tracked order summary for district-market preview", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=district-market&previewSource=marketplace",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("DM-2048");
    expect(trackedOrder?.paymentMethod).toBe("cod");
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "مصر الجديدة",
    });
    expect(trackedOrder?.items).toHaveLength(3);
  });

  it("builds seeded purchase tracking for men-shoes-eg preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=men-shoes-eg&previewSource=marketplace",
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();

    expect(purchaseTracking?.orderNumber).toBe("KH-2048");
    expect(purchaseTracking?.phone).toBe("01044440024");
    expect(purchaseTracking?.items).toHaveLength(3);
    expect(purchaseTracking?.items.map((item) => item.productId)).toEqual([
      "stride-core-runner",
      "city-white-court",
      "flex-knit-runner",
    ]);
    expect(purchaseTracking?.items[0]?.variantId).toBe(
      "stride-core-runner-race-red-size-42",
    );
    expect(purchaseTracking?.total).toBeGreaterThan(0);
  });

  it("builds a tracked order summary for men-shoes-eg preview", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=men-shoes-eg&previewSource=marketplace",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("KH-2048");
    expect(trackedOrder?.paymentMethod).toBe("cod");
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "مدينة نصر",
    });
    expect(trackedOrder?.items).toHaveLength(3);
  });

  it("builds seeded purchase tracking for closet-os preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=closet-os&previewSource=marketplace",
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();

    expect(purchaseTracking?.orderNumber).toBe("CO-2048");
    expect(purchaseTracking?.phone).toBe("01033330024");
    expect(purchaseTracking?.items).toHaveLength(3);
    expect(purchaseTracking?.items.map((item) => item.productId)).toEqual([
      "closet-weekday-poplin",
      "closet-commute-trouser",
      "closet-relay-tee",
    ]);
    expect(purchaseTracking?.items[0]?.variantId).toBe(
      "closet-weekday-poplin-cloud-size-M",
    );
    expect(purchaseTracking?.total).toBeGreaterThan(0);
  });

  it("builds a tracked order summary for closet-os preview", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=closet-os&previewSource=marketplace",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("CO-2048");
    expect(trackedOrder?.paymentMethod).toBe("card");
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "المعادي",
    });
    expect(trackedOrder?.items).toHaveLength(3);
  });

  it("builds seeded purchase tracking for pc-hub-eg preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=pc-hub-eg&previewSource=marketplace",
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();

    expect(purchaseTracking?.orderNumber).toBe("PCH-2048");
    expect(purchaseTracking?.phone).toBe("01022220026");
    expect(purchaseTracking?.items).toHaveLength(3);
    expect(purchaseTracking?.items.map((item) => item.productId)).toEqual([
      "workbook-14-air",
      "quadview-27-qhd",
      "precision-mouse-lite",
    ]);
    expect(purchaseTracking?.items[0]?.variantId).toBe(
      "workbook-14-air-16-1tb-silver",
    );
    expect(purchaseTracking?.total).toBeGreaterThan(0);
  });

  it("builds a tracked order summary for pc-hub-eg preview", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=pc-hub-eg&previewSource=marketplace",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("PCH-2048");
    expect(trackedOrder?.paymentMethod).toBe("card");
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "مدينة نصر",
    });
    expect(trackedOrder?.items).toHaveLength(3);
  });

  it("builds seeded purchase tracking for kids-play preview", () => {
    window.history.replaceState(
      {},
      "",
      "/?previewTheme=kids-play&previewSource=marketplace",
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();

    expect(purchaseTracking?.orderNumber).toBe("KP-2048");
    expect(purchaseTracking?.phone).toBe("01066660024");
    expect(purchaseTracking?.items).toHaveLength(3);
    expect(purchaseTracking?.items.map((item) => item.productId)).toEqual([
      "rocket-blocks-lab",
      "junior-scooter-lite",
      "splash-art-kit",
    ]);
    expect(purchaseTracking?.items[0]?.variantId).toBe(
      "rocket-blocks-lab-builder-120",
    );
    expect(purchaseTracking?.total).toBe(3270);
  });

  it("builds a tracked order summary for kids-play preview", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=kids-play&previewSource=marketplace",
    );

    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(trackedOrder?.orderNumber).toBe("KP-2048");
    expect(trackedOrder?.paymentMethod).toBe("cod");
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "مصر الجديدة",
    });
    expect(trackedOrder?.items).toHaveLength(3);
    expect(trackedOrder?.finalTotal).toBe(3270);
  });

  it("builds fallback purchase tracking and tracked orders for generated preview themes", () => {
    window.history.replaceState(
      {},
      "",
      "/thank-you?previewTheme=modern-minimal&previewSource=marketplace",
    );

    const purchaseTracking = getMarketplacePreviewPurchaseTracking();
    const trackedOrder = getMarketplacePreviewTrackedOrder();

    expect(purchaseTracking?.orderNumber).toBe("MOD-2048");
    expect(purchaseTracking?.customerName).toContain("Modern Minimal");
    expect(purchaseTracking?.items.map((item) => item.productId)).toEqual([
      "modern-minimal-cloud-sneaker",
      "modern-minimal-city-ballerina",
      "modern-minimal-brace-heel",
    ]);
    expect(trackedOrder?.orderNumber).toBe("MOD-2048");
    expect(trackedOrder?.items).toHaveLength(3);
    expect(trackedOrder?.shippingAddress).toMatchObject({
      governorate: "القاهرة",
      city: "مدينة نصر",
    });
  });
});
