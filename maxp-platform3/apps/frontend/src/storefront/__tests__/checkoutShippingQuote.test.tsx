// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { storefrontApi } from "../../utils/storefrontApi";
import { useCheckoutShippingQuote } from "../hooks/useCheckoutShippingQuote";
import type { StorefrontSettings } from "../hooks/useStorefrontSettings";
import { useCartStore } from "../store/useCartStore";
import { useCheckoutStore } from "../store/useCheckoutStore";

const storefrontSettingsMock = vi.hoisted(() => ({
  settings: null as StorefrontSettings | null,
}));

vi.mock("../../utils/storefrontApi", () => ({
  storefrontApi: {
    calculateShipping: vi.fn(),
  },
}));

vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: () => ({
    settings: storefrontSettingsMock.settings,
    isLoading: false,
    error: null,
  }),
}));

const buildStorefrontSettings = (
  freeShippingAmount: number,
): StorefrontSettings => ({
  company: {
    id: "cmp_swan",
    name: "Swan",
    slug: "swan",
    logo: null,
    currency: "EGP",
    settings: {},
  },
  storefront: {
    themeId: "swan",
    apps: {
      "conversion-suite": {
        enabled: true,
        status: "ACTIVE",
        settings: {
          modules: {
            freeShippingBar: true,
          },
          thresholds: {
            freeShippingAmount,
          },
        },
      },
    },
    designTokens: {},
    storefrontFeatures: {
      quickViewEnabled: true,
      comparisonEnabled: false,
      wishlistEnabled: true,
      recentlyViewedEnabled: true,
      advancedFiltersEnabled: true,
      productCardStyle: "default",
      gridAddToCartIcon: "bag",
      gridDiscountBanner: true,
    },
    settings: {
      storeName: "Swan",
      currency: "EGP",
    },
  },
  templateId: null,
  lastUpdated: "2026-05-03T00:00:00.000Z",
});

const hookLabels = {
  shippingPromptText: "اختار المحافظة الأول",
  shippingCalculatedText: "تم حساب الشحن إلى {{governorate}} بنجاح.",
  noShippingChargeText: "لا توجد تكلفة شحن",
  shippingErrorText: "تعذر حساب الشحن",
  storefrontLoadingText: "جار تحميل بيانات المتجر",
  freeShippingThresholdText: "تم تفعيل الشحن المجاني للطلب ده.",
};

describe("useCheckoutShippingQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    storefrontSettingsMock.settings = buildStorefrontSettings(799);
    useCheckoutStore.setState({
      formData: {
        customerName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        governorate: "Alexandria",
        notes: "",
      },
      paymentMethod: "cod",
      appliedCoupon: null,
    });
    useCartStore.setState({
      items: [
        {
          id: "swan-motion",
          productId: "swan-motion",
          variantId: "motion-black-37",
          name: "Swan Motion",
          price: 499,
          quantity: 1,
          attributes: {
            Color: "أسود",
            Size: "37",
          },
        },
        {
          id: "swan-fit",
          productId: "swan-fit",
          variantId: "fit-white-37",
          name: "Swan Fit",
          price: 529,
          quantity: 1,
          attributes: {
            Color: "رمادي كلاسيك",
            Size: "37",
          },
        },
      ],
    });
  });

  it("turns the governorate shipping quote into a free-shipping discount once the configured bar threshold is reached", async () => {
    vi.mocked(storefrontApi.calculateShipping).mockResolvedValue({
      success: true,
      data: {
        price: 75,
      },
    });

    const { result } = renderHook(() => useCheckoutShippingQuote(hookLabels));

    await waitFor(() => {
      expect(result.current.isShippingLoading).toBe(false);
      expect(storefrontApi.calculateShipping).toHaveBeenCalledWith(
        "Alexandria",
        "cmp_swan",
        [
          {
            productId: "swan-motion",
            variantId: "motion-black-37",
            quantity: 1,
          },
          {
            productId: "swan-fit",
            variantId: "fit-white-37",
            quantity: 1,
          },
        ],
      );
    });

    expect(result.current.conversionFreeShippingActive).toBe(true);
    expect(result.current.freeShippingActive).toBe(true);
    expect(result.current.shippingCost).toBe(0);
    expect(result.current.quotedShippingCost).toBe(75);
    expect(result.current.freeShippingDiscount).toBe(75);
    expect(result.current.shippingMessage).toBe(
      "تم تفعيل الشحن المجاني للطلب ده.",
    );
  });
});
