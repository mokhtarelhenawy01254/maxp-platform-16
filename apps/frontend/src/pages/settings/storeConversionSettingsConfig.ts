export type ManagedMarketplaceAppSlug =
  | "conversion-suite"
  | "quantity-offers-pro"
  | "commerce-advanced"
  | "ugc-reviews-pro";

export type StoreConversionPageId =
  | "product-conversion"
  | "offers-bundles"
  | "growth-widgets"
  | "selling-modes"
  | "reviews-social-proof";

export type StoreConversionToolActionConfig = {
  label: string;
  description?: string;
  to: string;
  primary?: boolean;
};

export type StoreConversionToolFieldConfig = {
  key: string;
  label: string;
  description?: string;
  type?: "number" | "text" | "select";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  path: string;
  min?: number;
  suffix?: string;
};

export type StoreConversionToolConfig = {
  key: string;
  label: string;
  description: string;
  appSlug: ManagedMarketplaceAppSlug;
  readPaths: string[];
  writePathsOn?: string[];
  writePathsOff?: string[];
  fields?: StoreConversionToolFieldConfig[];
  actions?: StoreConversionToolActionConfig[];
};

export type StoreConversionSectionConfig = {
  title: string;
  description?: string;
  tools: StoreConversionToolConfig[];
};

export type StoreConversionPageConfig = {
  id: StoreConversionPageId;
  path: string;
  navLabel: string;
  title: string;
  description: string;
  appSlugs: ManagedMarketplaceAppSlug[];
  sections: StoreConversionSectionConfig[];
};

export const STORE_CONVERSION_APP_LABELS: Record<
  ManagedMarketplaceAppSlug,
  string
> = {
  "conversion-suite": "أدوات رفع التحويل",
  "quantity-offers-pro": "عروض الكميات",
  "commerce-advanced": "المبيعات المتقدمة",
  "ugc-reviews-pro": "تقييمات العملاء",
};

const buildModuleToggle = (
  key: string,
  label: string,
  description: string,
  appSlug: ManagedMarketplaceAppSlug,
  moduleKey: string,
): StoreConversionToolConfig => ({
  key,
  label,
  description,
  appSlug,
  readPaths: ["general.enabled", `modules.${moduleKey}`],
  writePathsOn: ["general.enabled", `modules.${moduleKey}`],
  writePathsOff: [`modules.${moduleKey}`],
});

export const STORE_CONVERSION_PAGES: StoreConversionPageConfig[] = [
  {
    id: "product-conversion",
    path: "/settings/store/product-conversion",
    navLabel: "storeConversionSettings.navProductPage",
    title: "storeConversionSettings.pageProductConversion",
    description: "storeConversionSettings.descProductConversion",
    appSlugs: ["conversion-suite"],
    sections: [
      {
        title: "storeConversionSettings.sectionUrgency",
        tools: [
          buildModuleToggle(
            "saleCountdown",
            "Sale Countdown Timer",
            "Runs a countdown timer on the product page during limited-time offers.",
            "conversion-suite",
            "saleCountdown",
          ),
          {
            ...buildModuleToggle(
              "lowStockNotice",
              "Low Stock Notice",
              "Shows a low-stock alert for size or color before adding to cart.",
              "conversion-suite",
              "lowStockNotice",
            ),
            fields: [
              {
                key: "lowStockThreshold",
                label: "الحد الأدنى لظهور التنبيه",
                description: "يظهر التنبيه للعميل عندما يقل المخزون عن هذا العدد.",
                type: "number",
                path: "thresholds.lowStockThreshold",
                min: 1,
                suffix: "قطع",
              },
            ],
          },
          buildModuleToggle(
            "soldCounter",
            "Sold Counter",
            "Displays current purchase pace above the buy section.",
            "conversion-suite",
            "soldCounter",
          ),
          buildModuleToggle(
            "purchaseFomo",
            "Purchase Count & FOMO",
            "Shows current purchase pressure from carts or recent activity.",
            "conversion-suite",
            "purchaseFomo",
          ),
        ],
      },
      {
        title: "storeConversionSettings.sectionTrustCompletion",
        tools: [
          buildModuleToggle(
            "estimatedDelivery",
            "Estimated Delivery",
            "Shows the estimated delivery window on the product page.",
            "conversion-suite",
            "estimatedDelivery",
          ),
          buildModuleToggle(
            "trustedBadges",
            "Trusted Badge",
            "Displays payment, delivery, and return badges near the buy button.",
            "conversion-suite",
            "trustedBadges",
          ),
          buildModuleToggle(
            "stickyAddToCart",
            "Sticky Add to Cart bar",
            "Keeps the add-to-cart button visible while scrolling on the product page.",
            "conversion-suite",
            "stickyAddToCart",
          ),
          buildModuleToggle(
            "backInStock",
            "Back in Stock",
            "Enables back-in-stock interest collection for unavailable sizes or colors.",
            "conversion-suite",
            "backInStock",
          ),
          buildModuleToggle(
            "productWishlist",
            "Product Wishlist",
            "Shows the wishlist heart button over product gallery images and cards.",
            "conversion-suite",
            "productWishlist",
          ),
          buildModuleToggle(
            "productComparison",
            "Product Compare",
            "Shows the product compare button over product gallery images.",
            "conversion-suite",
            "productComparison",
          ),
        ],
      },
    ],
  },
  {
    id: "offers-bundles",
    path: "/settings/store/offers-bundles",
    navLabel: "storeConversionSettings.navOffersBundles",
    title: "storeConversionSettings.pageOffersBundles",
    description: "storeConversionSettings.descOffersBundles",
    appSlugs: ["conversion-suite", "quantity-offers-pro"],
    sections: [
      {
        title: "storeConversionSettings.sectionComplementary",
        tools: [
          {
            ...buildModuleToggle(
              "crossSell",
              "Cross Sell",
              "Runs cross-sell product suggestions in dedicated spaces.",
              "conversion-suite",
              "crossSell",
            ),
            actions: [
              {
                label: "إدارة المنتجات التكميلية (Cross-Sell Hub)",
                description: "ربط وتعيين المنتجات المكملة لكل منتج في الكتالوج.",
                to: "/settings/upsell",
                primary: true,
              },
            ],
            fields: [
              {
                key: "crossSellTitle",
                label: "عنوان قسم المنتجات التكميلية",
                type: "text",
                path: "copy.crossSellTitle",
                placeholder: "منتجات تكميلية قد تعجبك",
              },
              {
                key: "crossSellDescription",
                label: "الوصف التوضيحي",
                type: "text",
                path: "copy.crossSellDescription",
                placeholder: "قطع مختارة تتناسب مع اختيارك",
              },
            ],
          },
          {
            ...buildModuleToggle(
              "boughtTogether",
              "Bought Together",
              "Shows product bundles frequently bought together on the same page.",
              "conversion-suite",
              "boughtTogether",
            ),
            actions: [
              {
                label: "إدارة وربط منتجات الباقات (Upsell Hub)",
                description: "اختر المنتج وحدد المنتجات المكملة التي ستظهر معه في باقة الشراء التلقائية.",
                to: "/settings/upsell",
                primary: true,
              },
            ],
            fields: [
              {
                key: "boughtTogetherTitle",
                label: "عنوان قسم الباقة",
                description: "العنوان الظاهر للعميل فوق الباقة في صفحة المنتج.",
                type: "text",
                path: "copy.boughtTogetherTitle",
                placeholder: "يُشترى معًا كثيرًا (أو اشترِ معًا ووفّر)",
              },
              {
                key: "boughtTogetherDescription",
                label: "الوصف التحفيزي للباقة",
                description: "النص التوضيحي تحت العنوان لتحفيز العميل.",
                type: "text",
                path: "copy.boughtTogetherDescription",
                placeholder: "اقتراحات مختارة بعناية لتكمل هذا المنتج وتزيد قيمة الطلب.",
              },
              {
                key: "boughtTogetherStyle",
                label: "شكل وتنسيق عرض الباقة",
                description: "طريقة عرض وترتيب كروت المنتجات داخل الباقة.",
                type: "select",
                path: "ui.boughtTogetherStyle",
                options: [
                  { value: "stacked", label: "مكدسة عموديًا (Stacked) — الأكثر وضوحًا" },
                  { value: "compact", label: "كروت مدمجة (Compact) — عصرية وأنيقة" },
                  { value: "editorial", label: "استعراض واسع (Editorial) — صور كبيرة وفخمة" },
                ],
              },
              {
                key: "bundleAddLabel",
                label: "نص زر إضافة الباقة",
                description: "النص المكتوب على زر إضافة الباقة للسلة.",
                type: "text",
                path: "copy.bundleAddLabel",
                placeholder: "أضف الباقة المحددة",
              },
            ],
          },
        ],
      },
      {
        title: "storeConversionSettings.sectionQuantityOffers",
        tools: [
          {
            ...buildModuleToggle(
              "bulkSavings",
              "Bulk Savings",
              "Runs quantity savings directly on the product page.",
              "conversion-suite",
              "bulkSavings",
            ),
            actions: [
              {
                label: "إدارة جدول خصومات الكميات",
                description: "تحديد شرائح الكميات ونسب الخصم على مستوى المنتجات.",
                to: "/settings/volume-discounts",
                primary: true,
              },
            ],
          },
          {
            key: "buyMoreSaveMore",
            label: "Buy More Save More",
            description: "Runs full quantity-break panels and mix-and-match options on the page.",
            appSlug: "quantity-offers-pro",
            readPaths: ["general.enabled", "modules.renderOnProductPage"],
            writePathsOn: ["general.enabled", "modules.renderOnProductPage"],
            writePathsOff: ["modules.renderOnProductPage"],
            actions: [
              {
                label: "إدارة عروض الكميات المتقدمة",
                description: "تخصيص باقات التوفير المتعددة والـ Mix and Match.",
                to: "/settings/volume-discounts",
                primary: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "growth-widgets",
    path: "/settings/store/growth-widgets",
    navLabel: "storeConversionSettings.navGrowthWidgets",
    title: "storeConversionSettings.pageGrowthWidgets",
    description: "storeConversionSettings.descGrowthWidgets",
    appSlugs: ["conversion-suite"],
    sections: [
      {
        title: "storeConversionSettings.sectionGeneralBars",
        tools: [
          {
            ...buildModuleToggle(
              "freeShippingBar",
              "Free Shipping Bar",
              "Shows a free-shipping bar storewide, in cart, and checkout when enabled.",
              "conversion-suite",
              "freeShippingBar",
            ),
            fields: [
              {
                key: "freeShippingAmount",
                label: "Free Shipping Threshold",
                description:
                  "The amount the customer needs to reach for free shipping to apply.",
                type: "number",
                path: "thresholds.freeShippingAmount",
                min: 0,
                suffix: "EGP",
              },
            ],
          },
          buildModuleToggle(
            "inactiveTab",
            "Inactive Tab",
            "Changes the tab title when the user navigates away from the page.",
            "conversion-suite",
            "inactiveTab",
          ),
        ],
      },
      {
        title: "storeConversionSettings.sectionBehavioral",
        tools: [
          {
            ...buildModuleToggle(
              "exitIntentPopup",
              "Exit Intent Popup",
              "Runs an exit-intent popup when the user tries to leave the store.",
              "conversion-suite",
              "exitIntentPopup",
            ),
            fields: [
              {
                key: "exitIntentTitle",
                label: "عنوان نافذة الخروج",
                description: "العنوان الظاهر عند محاولة العميل مغادرة الصفحة.",
                type: "text",
                path: "copy.exitIntentTitle",
                placeholder: "انتظر! لدينا هدية مميزة لك",
              },
              {
                key: "exitIntentCouponCode",
                label: "كود كوبون الخصم",
                description: "رمز القسيمة الترويجية المعروضة لتحفيز إتمام الشراء.",
                type: "text",
                path: "copy.exitIntentCouponCode",
                placeholder: "SAVE10",
              },
              {
                key: "exitIntentDescription",
                label: "رسالة العرض",
                description: "النص التوضيحي لحث العميل على استخدام الكوبون فورًا.",
                type: "text",
                path: "copy.exitIntentDescription",
                placeholder: "استخدم هذا الكوبون واحصل على خصم فوري قبل مغادرة المتجر!",
              },
            ],
          },
          buildModuleToggle(
            "fakeVisitorCounter",
            "Fake Visitor",
            "Runs a real-time visitor counter as part of behavioral signals.",
            "conversion-suite",
            "fakeVisitorCounter",
          ),
          buildModuleToggle(
            "fakeSalePopup",
            "Fake Sale Popup",
            "Runs a live purchase-activity popup at the store level.",
            "conversion-suite",
            "fakeSalePopup",
          ),
        ],
      },
    ],
  },
  {
    id: "selling-modes",
    path: "/settings/store/selling-modes",
    navLabel: "storeConversionSettings.navSellingModes",
    title: "storeConversionSettings.pageSellingModes",
    description: "storeConversionSettings.descSellingModes",
    appSlugs: ["commerce-advanced"],
    sections: [
      {
        title: "storeConversionSettings.sectionSpecialSelling",
        tools: [
          buildModuleToggle(
            "preOrder",
            "Pre Order",
            "Allows selling products before they are physically in stock.",
            "commerce-advanced",
            "preOrder",
          ),
          buildModuleToggle(
            "externalAffiliate",
            "External / Affiliate Product",
            "Redirects the purchase flow to an external platform or link.",
            "commerce-advanced",
            "externalAffiliate",
          ),
        ],
      },
    ],
  },
  {
    id: "reviews-social-proof",
    path: "/settings/store/reviews-social-proof",
    navLabel: "storeConversionSettings.navReviewsTrust",
    title: "storeConversionSettings.pageReviewsSocialProof",
    description: "storeConversionSettings.descReviewsSocialProof",
    appSlugs: ["ugc-reviews-pro"],
    sections: [
      {
        title: "storeConversionSettings.sectionVisualContent",
        tools: [
          buildModuleToggle(
            "photoReviews",
            "Photo Review",
            "Allows customers to attach photos in their reviews.",
            "ugc-reviews-pro",
            "photoReviews",
          ),
          buildModuleToggle(
            "videoReviews",
            "Video Review",
            "Allows attaching videos in reviews when writing feedback.",
            "ugc-reviews-pro",
            "videoReviews",
          ),
        ],
      },
      {
        title: "storeConversionSettings.sectionTrustProof",
        tools: [
          buildModuleToggle(
            "verifiedBadge",
            "Verified Badge",
            "Displays a verified-purchaser badge within reviews.",
            "ugc-reviews-pro",
            "verifiedBadge",
          ),
        ],
      },
    ],
  },
];

export const STORE_CONVERSION_PAGE_MAP = STORE_CONVERSION_PAGES.reduce<
  Record<StoreConversionPageId, StoreConversionPageConfig>
>((accumulator, page) => {
  accumulator[page.id] = page;
  return accumulator;
}, {} as Record<StoreConversionPageId, StoreConversionPageConfig>);
