type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const deepMerge = (target: JsonRecord, source: JsonRecord): JsonRecord => {
  const next: JsonRecord = { ...target };

  Object.entries(source).forEach(([key, value]) => {
    if (isRecord(next[key]) && isRecord(value)) {
      next[key] = deepMerge(next[key], value);
      return;
    }

    if (value !== undefined) {
      next[key] = value;
    }
  });

  return next;
};

export const DEFAULT_CONVERSION_SUITE_SETTINGS = {
  general: {
    enabled: true,
    renderInTemplates: true,
    attachToThemeShell: true,
    preset: "balanced",
  },
  modules: {
    saleCountdown: false,
    exitIntentPopup: false,
    lowStockNotice: true,
    bulkSavings: true,
    trustedBadges: true,
    fakeVisitorCounter: false,
    fakeSalePopup: false,
    crossSell: true,
    soldCounter: false,
    estimatedDelivery: true,
    freeShippingBar: true,
    stickyAddToCart: true,
    boughtTogether: true,
    postPurchaseUpsell: true,
    backInStock: true,
    purchaseFomo: false,
    inactiveTab: false,
    productWishlist: true,
    productComparison: true,
  },
  ui: {
    pdpVariant: "balanced",
    popupStyle: "minimal",
    countdownStyle: "timer",
    barPosition: "top",
    stickyStyle: "compact",
    lowStockStyle: "alert",
    estimatedDeliveryStyle: "card",
    fakeVisitorStyle: "pulse",
    soldCounterStyle: "spotlight",
    purchaseFomoStyle: "alert",
    backInStockStyle: "panel",
    trustedBadgeStyle: "strip",
    boughtTogetherStyle: "stacked",
    cartUpsellStyle: "stacked",
  },
  copy: {
    freeShippingMessage: "Add {{remaining}} to unlock free shipping",
    freeShippingReachedMessage: "You unlocked free shipping",
    inactiveTabTitle: "Come back before this offer ends",
    backInStockTitle: "Notify me when it's back",
    backInStockDescription:
      "Leave your name plus email or phone and we'll alert customers once inventory returns.",
    backInStockSuccessMessage:
      "You're on the waitlist. We'll let you know once this product is available again.",
    exitIntentBadge: "Exit Intent",
    exitIntentTitle: "Before you go",
    exitIntentDescription:
      "Bring the shopper back with a limited offer, free shipping, or bundle reminder.",
    exitIntentPrimaryLabel: "Continue shopping",
    exitIntentSecondaryLabel: "Dismiss",
    exitIntentCouponCode: "",
    exitIntentCouponHint: "Copy this code and apply it at checkout.",
    trustedBadgeTitle: "Trusted checkout",
    trustedBadgeSubtitle:
      "Show reassurance badges that align with your payment and fulfillment flow.",
    trustedBadgeItems:
      "Secure checkout, Visa & Mastercard, Cash on delivery, Easy returns",
    cartUpsellBadge: "Upsell",
    cartUpsellTitle: "Continue building your order",
    cartUpsellDescription:
      "These storefront suggestions are powered by the conversion app inside the cart drawer.",
    postPurchaseUpsellBadge: "Post-purchase upsell",
    postPurchaseUpsellTitle: "Complete your order with one more pick",
    postPurchaseUpsellDescription:
      "Relevant add-ons based on what the customer just ordered, ready for one more conversion step.",
    crossSellTitle: "Cross Sell",
    crossSellDescription: "Add complementary picks",
    boughtTogetherTitle: "Bought Together",
    boughtTogetherDescription: "Popular pairings for this product",
    bundleAddLabel: "Add selected bundle",
    bundleTotalLabel: "Bundle total",
    bundleCurrentLabel: "Current product",
    bundleRecommendationLabel: "Recommended add-on",
    bundleVariantHint:
      "Products with variants still need to be configured from their own product page.",
    quickAddLabel: "Quick add",
    chooseOptionsLabel: "Choose options",
    purchaseFomoCartMessage: "{{count}} shoppers currently have this in their cart",
    purchaseFomoRecentMessage: "{{count}} orders included this product in the last {{hours}} hours",
    purchaseFomoWaitlistMessage:
      "{{count}} shoppers asked to be notified when this product returns",
  },
  thresholds: {
    lowStockLimit: 5,
    freeShippingAmount: 750,
    upsellPriceRangePercent: 20,
    purchaseFomoCartWindowHours: 24,
    purchaseFomoRecentPurchaseWindowHours: 48,
    purchaseFomoWaitlistFallbackLimit: 18,
    fakeVisitorMin: 6,
    fakeVisitorMax: 22,
  },
  countdown: {
    endsAt: "",
    label: "Offer ends in",
  },
  estimatedDelivery: {
    minDays: 2,
    maxDays: 4,
    label: "Estimated delivery",
  },
} as const;

const CONVERSION_SUITE_PRESET_OVERRIDES: Record<string, JsonRecord> = {
  minimal: {
    general: {
      preset: "minimal",
    },
    modules: {
      saleCountdown: false,
      exitIntentPopup: false,
      lowStockNotice: true,
      bulkSavings: true,
      trustedBadges: true,
      fakeVisitorCounter: false,
      fakeSalePopup: false,
      crossSell: true,
      soldCounter: false,
      estimatedDelivery: true,
      freeShippingBar: true,
      stickyAddToCart: true,
      boughtTogether: true,
      postPurchaseUpsell: true,
      backInStock: true,
      purchaseFomo: false,
      inactiveTab: false,
      productWishlist: true,
      productComparison: true,
    },
    ui: {
      pdpVariant: "minimal",
      popupStyle: "minimal",
      countdownStyle: "minimal",
      barPosition: "top",
      stickyStyle: "minimal",
      lowStockStyle: "minimal",
      estimatedDeliveryStyle: "pill",
      fakeVisitorStyle: "minimal",
      soldCounterStyle: "minimal",
      purchaseFomoStyle: "minimal",
      backInStockStyle: "inline",
      trustedBadgeStyle: "minimal",
      boughtTogetherStyle: "compact",
      cartUpsellStyle: "compact",
    },
  },
  balanced: {
    general: {
      preset: "balanced",
    },
    modules: {
      saleCountdown: true,
      exitIntentPopup: false,
      lowStockNotice: true,
      bulkSavings: true,
      trustedBadges: true,
      fakeVisitorCounter: true,
      fakeSalePopup: false,
      crossSell: true,
      soldCounter: true,
      estimatedDelivery: true,
      freeShippingBar: true,
      stickyAddToCart: true,
      boughtTogether: true,
      postPurchaseUpsell: true,
      backInStock: true,
      purchaseFomo: true,
      inactiveTab: true,
    },
    ui: {
      pdpVariant: "balanced",
      popupStyle: "minimal",
      countdownStyle: "timer",
      barPosition: "top",
      stickyStyle: "compact",
      lowStockStyle: "alert",
      estimatedDeliveryStyle: "card",
      fakeVisitorStyle: "pulse",
      soldCounterStyle: "badge",
      purchaseFomoStyle: "alert",
      backInStockStyle: "panel",
      trustedBadgeStyle: "strip",
      boughtTogetherStyle: "stacked",
      cartUpsellStyle: "stacked",
    },
  },
  aggressive: {
    general: {
      preset: "aggressive",
    },
    modules: {
      saleCountdown: true,
      exitIntentPopup: true,
      lowStockNotice: true,
      bulkSavings: true,
      trustedBadges: true,
      fakeVisitorCounter: true,
      fakeSalePopup: true,
      crossSell: true,
      soldCounter: true,
      estimatedDelivery: true,
      freeShippingBar: true,
      stickyAddToCart: true,
      boughtTogether: true,
      postPurchaseUpsell: true,
      backInStock: true,
      purchaseFomo: true,
      inactiveTab: true,
      productWishlist: true,
      productComparison: true,
    },
    ui: {
      pdpVariant: "editorial",
      popupStyle: "coupon",
      countdownStyle: "split",
      barPosition: "bottom",
      stickyStyle: "balanced",
      lowStockStyle: "meter",
      estimatedDeliveryStyle: "timeline",
      fakeVisitorStyle: "ticker",
      soldCounterStyle: "spotlight",
      purchaseFomoStyle: "timeline",
      backInStockStyle: "accent",
      trustedBadgeStyle: "strip",
      boughtTogetherStyle: "editorial",
      cartUpsellStyle: "editorial",
    },
  },
};

const normalizeConversionSuitePreset = (value: unknown): keyof typeof CONVERSION_SUITE_PRESET_OVERRIDES => {
  if (value === "minimal" || value === "aggressive") {
    return value;
  }

  return "balanced";
};

const buildConversionSuiteSettings = (rawSettings?: unknown): JsonRecord => {
  const defaults = deepMerge(
    {},
    DEFAULT_CONVERSION_SUITE_SETTINGS as unknown as JsonRecord,
  );
  const raw = isRecord(rawSettings) ? rawSettings : {};
  const rawGeneral = isRecord(raw["general"]) ? raw["general"] : {};
  const defaultGeneral = isRecord(defaults["general"]) ? defaults["general"] : {};
  const preset = normalizeConversionSuitePreset(
    typeof rawGeneral["preset"] === "string"
      ? rawGeneral["preset"]
      : defaultGeneral["preset"],
  );
  const presetDefaults = deepMerge(
    defaults,
    CONVERSION_SUITE_PRESET_OVERRIDES[preset] || {},
  );

  return isRecord(rawSettings) ? deepMerge(presetDefaults, raw) : presetDefaults;
};

export const DEFAULT_UGC_REVIEWS_PRO_SETTINGS = {
  general: {
    enabled: true,
  },
  modules: {
    photoReviews: true,
    videoReviews: true,
    verifiedBadge: true,
  },
  ui: {
    galleryStyle: "mosaic",
    cardStyle: "elevated",
  },
} as const;

export const DEFAULT_COMMERCE_ADVANCED_SETTINGS = {
  general: {
    enabled: true,
  },
  modules: {
    preOrder: true,
    externalAffiliate: false,
  },
  ui: {
    preOrderStyle: "banner",
    externalLinkStyle: "button",
  },
  copy: {
    preOrderLabel: "Available for pre-order",
    affiliateLabel: "Buy from partner",
  },
} as const;

export const DEFAULT_QUANTITY_OFFERS_PRO_SETTINGS = {
  general: {
    enabled: true,
  },
  modules: {
    renderOnProductPage: true,
    mixAndMatch: true,
  },
  ui: {
    layout: "cards",
    selectorMode: "expanded",
  },
  copy: {
    title: "عروض الكميات",
    subtitle:
      "اختر العرض المناسب، ثم حدّد اللون أو المقاس لكل قطعة من نفس المكان.",
    addOfferLabel: "أضف العرض إلى السلة",
    copyFirstSelectionLabel: "نسخ اختيار القطعة الأولى",
    freeShippingLabel: "شحن مجاني",
    bestValueLabel: "الأكثر توفيرًا",
  },
} as const;

export const DEFAULT_WHOLESALE_PRO_SETTINGS = {
  general: {
    enabled: true,
    defaultPaymentTermsDays: 30,
    enableCustomerPortal: true,
  },
  modules: {
    priceLists: true,
    wholesaleCustomers: true,
    customerStatements: true,
    debtTracking: true,
    distributorPortal: true,
  },
} as const;

export const DEFAULT_AGENCY_PRO_SETTINGS = {
  general: {
    enabled: true,
    allowClientDirectApproval: true,
    notifyOnNewApproval: true,
  },
  pacing: {
    warningThresholdPercent: 85,
    criticalThresholdPercent: 95,
  },
} as const;

export const DEFAULT_INTERNAL_COURIER_FLEET_SETTINGS = {
  general: {
    enabled: true,
    runCodePrefix: "RUN",
    autoPrintManifestOnDispatch: false,
    includeCustomerPhoneInManifest: true,
  },
  remittance: {
    defaultTreasuryAccountId: "",
    shortagePolicy: "DEDUCT_FROM_COURIER",
    allowPartialRemittance: true,
    requireTreasuryNoteOnVariance: true,
  },
  fieldWorkflow: {
    requireCourierPin: false,
    autoUpdateOrderStatusOnDelivery: true,
    allowPartialDelivery: true,
    requirePhotoProofOnReturn: false,
  },
  commission: {
    defaultType: "PER_ORDER",
    defaultValue: 30,
  },
} as const;

export const getDefaultMarketplaceAppSettings = (slug: string): JsonRecord => {
  switch (slug) {
    case "internal-courier-fleet":
      return deepMerge({}, DEFAULT_INTERNAL_COURIER_FLEET_SETTINGS as unknown as JsonRecord);
    case "marketing-agency-pro":
      return deepMerge({}, DEFAULT_AGENCY_PRO_SETTINGS as unknown as JsonRecord);
    case "conversion-suite":
      return buildConversionSuiteSettings();
    case "ugc-reviews-pro":
      return deepMerge({}, DEFAULT_UGC_REVIEWS_PRO_SETTINGS as unknown as JsonRecord);
    case "commerce-advanced":
      return deepMerge({}, DEFAULT_COMMERCE_ADVANCED_SETTINGS as unknown as JsonRecord);
    case "quantity-offers-pro":
      return deepMerge({}, DEFAULT_QUANTITY_OFFERS_PRO_SETTINGS as unknown as JsonRecord);
    case "wholesale-pro":
      return deepMerge({}, DEFAULT_WHOLESALE_PRO_SETTINGS as unknown as JsonRecord);
    default:
      return {};
  }
};

export const normalizeMarketplaceAppSettings = (
  slug: string,
  rawSettings: unknown,
): JsonRecord => {
  switch (slug) {
    case "conversion-suite":
      return buildConversionSuiteSettings(rawSettings);
    case "internal-courier-fleet":
    case "marketing-agency-pro":
    case "ugc-reviews-pro":
    case "commerce-advanced":
    case "quantity-offers-pro":
    case "wholesale-pro": {
      const defaults = getDefaultMarketplaceAppSettings(slug);
      if (!isRecord(rawSettings)) {
        return defaults;
      }

      return deepMerge(defaults, rawSettings);
    }
    default:
      return {};
  }
};

export const applyMarketplaceAppPreset = (
  slug: string,
  rawSettings: unknown,
  preset: string,
): JsonRecord => {
  if (slug !== "conversion-suite") {
    return normalizeMarketplaceAppSettings(slug, rawSettings);
  }

  const normalized = buildConversionSuiteSettings(rawSettings);
  const nextPreset = normalizeConversionSuitePreset(preset);

  return deepMerge(normalized, CONVERSION_SUITE_PRESET_OVERRIDES[nextPreset] || {});
};
