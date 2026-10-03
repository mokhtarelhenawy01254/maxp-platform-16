const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const deepMerge = (target, source) => {
  const output = { ...(target || {}) };

  Object.entries(source || {}).forEach(([key, value]) => {
    const currentValue = output[key];
    if (isRecord(currentValue) && isRecord(value)) {
      output[key] = deepMerge(currentValue, value);
      return;
    }

    if (value !== undefined) {
      output[key] = value;
    }
  });

  return output;
};

const DEFAULT_MARKETPLACE_APP_SETTINGS = {
  'conversion-suite': {
    general: {
      enabled: true,
      renderInTemplates: true,
      attachToThemeShell: true,
      preset: 'balanced',
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
      backInStock: true,
      purchaseFomo: false,
      inactiveTab: false,
    },
    ui: {
      pdpVariant: 'balanced',
      popupStyle: 'minimal',
      countdownStyle: 'timer',
      barPosition: 'top',
      stickyStyle: 'compact',
      lowStockStyle: 'alert',
      estimatedDeliveryStyle: 'card',
      fakeVisitorStyle: 'pulse',
      soldCounterStyle: 'spotlight',
      purchaseFomoStyle: 'alert',
      backInStockStyle: 'panel',
      trustedBadgeStyle: 'strip',
      boughtTogetherStyle: 'stacked',
      cartUpsellStyle: 'stacked',
    },
    copy: {
      freeShippingMessage: 'أضف {{remaining}} للحصول على شحن مجاني',
      freeShippingReachedMessage: 'مبروك! تم تفعيل الشحن المجاني',
      inactiveTabTitle: 'Come back before this offer ends',
      backInStockTitle: "Notify me when it's back",
      backInStockDescription:
        "Leave your name plus email or phone and we'll alert customers once inventory returns.",
      backInStockSuccessMessage:
        "You're on the waitlist. We'll let you know once this product is available again.",
      exitIntentBadge: 'Exit Intent',
      exitIntentTitle: 'Before you go',
      exitIntentDescription:
        'Bring the shopper back with a limited offer, free shipping, or bundle reminder.',
      exitIntentPrimaryLabel: 'Continue shopping',
      exitIntentSecondaryLabel: 'Dismiss',
      exitIntentCouponCode: '',
      exitIntentCouponHint: 'Copy this code and apply it at checkout.',
      trustedBadgeTitle: 'Trusted checkout',
      trustedBadgeSubtitle:
        'Show reassurance badges that align with your payment and fulfillment flow.',
      trustedBadgeItems:
        'Secure checkout, Visa & Mastercard, Cash on delivery, Easy returns',
      cartUpsellBadge: 'Upsell',
      cartUpsellTitle: 'Continue building your order',
      cartUpsellDescription:
        'These storefront suggestions are powered by the conversion app inside the cart drawer.',
      crossSellTitle: 'Cross Sell',
      crossSellDescription: 'Add complementary picks',
      boughtTogetherTitle: 'Bought Together',
      boughtTogetherDescription: 'Popular pairings for this product',
      bundleAddLabel: 'Add selected bundle',
      bundleTotalLabel: 'Bundle total',
      bundleCurrentLabel: 'Current product',
      bundleRecommendationLabel: 'Recommended add-on',
      bundleVariantHint:
        'Products with variants still need to be configured from their own product page.',
      quickAddLabel: 'Quick add',
      chooseOptionsLabel: 'Choose options',
      purchaseFomoCartMessage: '{{count}} shoppers currently have this in their cart',
      purchaseFomoRecentMessage:
        '{{count}} orders included this product in the last {{hours}} hours',
      purchaseFomoWaitlistMessage:
        '{{count}} shoppers asked to be notified when this product returns',
    },
    thresholds: {
      lowStockLimit: 5,
      freeShippingAmount: 750,
      purchaseFomoCartWindowHours: 24,
      purchaseFomoRecentPurchaseWindowHours: 48,
      purchaseFomoWaitlistFallbackLimit: 18,
      fakeVisitorMin: 6,
      fakeVisitorMax: 22,
    },
    countdown: {
      endsAt: '',
      label: 'Offer ends in',
    },
    estimatedDelivery: {
      minDays: 2,
      maxDays: 4,
      label: 'Estimated delivery',
    },
  },
  'ugc-reviews-pro': {
    general: {
      enabled: true,
    },
    modules: {
      photoReviews: true,
      videoReviews: true,
      verifiedBadge: true,
    },
    ui: {
      galleryStyle: 'mosaic',
      cardStyle: 'elevated',
    },
  },
  'commerce-advanced': {
    general: {
      enabled: true,
    },
    modules: {
      preOrder: true,
      externalAffiliate: false,
    },
    ui: {
      preOrderStyle: 'banner',
      externalLinkStyle: 'button',
    },
    copy: {
      preOrderLabel: 'Available for pre-order',
      affiliateLabel: 'Buy from partner',
    },
  },
  'quantity-offers-pro': {
    general: {
      enabled: true,
    },
    modules: {
      renderOnProductPage: true,
      mixAndMatch: true,
    },
    ui: {
      layout: 'cards',
      selectorMode: 'expanded',
    },
    copy: {
      title: 'عروض الكميات',
      subtitle:
        'اختر العرض المناسب، ثم حدّد اللون أو المقاس لكل قطعة من نفس المكان.',
      addOfferLabel: 'أضف العرض إلى السلة',
      copyFirstSelectionLabel: 'نسخ اختيار القطعة الأولى',
      freeShippingLabel: 'شحن مجاني',
      bestValueLabel: 'الأكثر توفيرًا',
    },
  },
  'wholesale-pro': {
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
  },
  'internal-courier-fleet': {
    general: {
      enabled: true,
      runCodePrefix: 'RUN',
      autoPrintManifestOnDispatch: false,
      includeCustomerPhoneInManifest: true,
    },
    remittance: {
      defaultTreasuryAccountId: '',
      shortagePolicy: 'DEDUCT_FROM_COURIER',
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
      defaultType: 'PER_ORDER',
      defaultValue: 30,
    },
    notifications: {
      notifyCustomerOnDispatch: true,
      notifyCustomerOnDelivery: true,
      notifyCustomerOnReturn: true,
    },
  },
};

const SUPPORTED_MARKETPLACE_APP_SETTING_SLUGS = Object.freeze(
  Object.keys(DEFAULT_MARKETPLACE_APP_SETTINGS),
);

const CONVERSION_SUITE_PRESET_OVERRIDES = {
  minimal: {
    general: {
      preset: 'minimal',
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
      backInStock: true,
      purchaseFomo: false,
      inactiveTab: false,
    },
    ui: {
      pdpVariant: 'minimal',
      popupStyle: 'minimal',
      countdownStyle: 'minimal',
      barPosition: 'top',
      stickyStyle: 'minimal',
      lowStockStyle: 'minimal',
      estimatedDeliveryStyle: 'pill',
      fakeVisitorStyle: 'minimal',
      soldCounterStyle: 'minimal',
      purchaseFomoStyle: 'minimal',
      backInStockStyle: 'inline',
      trustedBadgeStyle: 'minimal',
      boughtTogetherStyle: 'compact',
      cartUpsellStyle: 'compact',
    },
  },
  balanced: {
    general: {
      preset: 'balanced',
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
      backInStock: true,
      purchaseFomo: true,
      inactiveTab: true,
    },
    ui: {
      pdpVariant: 'balanced',
      popupStyle: 'minimal',
      countdownStyle: 'timer',
      barPosition: 'top',
      stickyStyle: 'compact',
      lowStockStyle: 'alert',
      estimatedDeliveryStyle: 'card',
      fakeVisitorStyle: 'pulse',
      soldCounterStyle: 'badge',
      purchaseFomoStyle: 'alert',
      backInStockStyle: 'panel',
      trustedBadgeStyle: 'strip',
      boughtTogetherStyle: 'stacked',
      cartUpsellStyle: 'stacked',
    },
  },
  aggressive: {
    general: {
      preset: 'aggressive',
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
      backInStock: true,
      purchaseFomo: true,
      inactiveTab: true,
    },
    ui: {
      pdpVariant: 'editorial',
      popupStyle: 'coupon',
      countdownStyle: 'split',
      barPosition: 'bottom',
      stickyStyle: 'balanced',
      lowStockStyle: 'meter',
      estimatedDeliveryStyle: 'timeline',
      fakeVisitorStyle: 'ticker',
      soldCounterStyle: 'spotlight',
      purchaseFomoStyle: 'timeline',
      backInStockStyle: 'accent',
      trustedBadgeStyle: 'strip',
      boughtTogetherStyle: 'editorial',
      cartUpsellStyle: 'editorial',
    },
  },
};

const normalizeConversionSuitePreset = (value) => {
  if (value === 'minimal' || value === 'aggressive') {
    return value;
  }

  return 'balanced';
};

const buildConversionSuiteSettings = (rawSettings) => {
  const defaults = deepMerge({}, DEFAULT_MARKETPLACE_APP_SETTINGS['conversion-suite']);
  const raw = isRecord(rawSettings) ? rawSettings : {};
  const rawGeneral = isRecord(raw.general) ? raw.general : {};
  const preset = normalizeConversionSuitePreset(
    typeof rawGeneral.preset === 'string' ? rawGeneral.preset : defaults.general?.preset,
  );
  const presetDefaults = deepMerge(defaults, CONVERSION_SUITE_PRESET_OVERRIDES[preset]);

  return isRecord(rawSettings) ? deepMerge(presetDefaults, raw) : presetDefaults;
};

const getDefaultMarketplaceAppSettings = (slug) =>
  slug === 'conversion-suite'
    ? buildConversionSuiteSettings()
    : isRecord(DEFAULT_MARKETPLACE_APP_SETTINGS[slug])
      ? deepMerge({}, DEFAULT_MARKETPLACE_APP_SETTINGS[slug])
      : {};

const sanitizeMarketplaceAppSettings = (slug, rawSettings) => {
  if (slug === 'conversion-suite') {
    return buildConversionSuiteSettings(rawSettings);
  }

  const defaults = getDefaultMarketplaceAppSettings(slug);

  if (!isRecord(rawSettings)) {
    return defaults;
  }

  return deepMerge(defaults, rawSettings);
};

const buildInstalledMarketplaceAppSettings = (slug, rawSettings, extraSettings = {}) =>
  sanitizeMarketplaceAppSettings(slug, deepMerge(sanitizeMarketplaceAppSettings(slug, rawSettings), extraSettings));

module.exports = {
  deepMerge,
  SUPPORTED_MARKETPLACE_APP_SETTING_SLUGS,
  getDefaultMarketplaceAppSettings,
  sanitizeMarketplaceAppSettings,
  buildInstalledMarketplaceAppSettings,
};
