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

export type StoreConversionToolFieldConfig = {
  key: string;
  label: string;
  description?: string;
  type: "number";
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
  "conversion-suite": "Conversion Suite",
  "quantity-offers-pro": "Quantity Offers Pro",
  "commerce-advanced": "Commerce Advanced",
  "ugc-reviews-pro": "UGC Reviews Pro",
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
    navLabel: "صفحة المنتج",
    title: "تحويلات صفحة المنتج",
    description: "أدوات الإلحاح والثقة والإكمال داخل قرار الشراء نفسه.",
    appSlugs: ["conversion-suite"],
    sections: [
      {
        title: "الإلحاح داخل الشراء",
        tools: [
          buildModuleToggle(
            "saleCountdown",
            "Sale Countdown Timer",
            "يشغل العد التنازلي داخل صفحة المنتج أثناء العروض المؤقتة.",
            "conversion-suite",
            "saleCountdown",
          ),
          buildModuleToggle(
            "lowStockNotice",
            "Low Stock Notice",
            "يظهر تنبيه قرب نفاد المقاس أو اللون قبل الإضافة للسلة.",
            "conversion-suite",
            "lowStockNotice",
          ),
          buildModuleToggle(
            "soldCounter",
            "Sold Counter",
            "يعرض وتيرة الشراء الحالية فوق مساحة القرار الشرائي.",
            "conversion-suite",
            "soldCounter",
          ),
          buildModuleToggle(
            "purchaseFomo",
            "Purchase Count & FOMO",
            "يظهر ضغط الشراء الحالي من السلات أو النشاط القريب.",
            "conversion-suite",
            "purchaseFomo",
          ),
        ],
      },
      {
        title: "الثقة والإكمال",
        tools: [
          buildModuleToggle(
            "estimatedDelivery",
            "Estimated Delivery",
            "يعرض نافذة التوصيل المتوقعة داخل صفحة المنتج.",
            "conversion-suite",
            "estimatedDelivery",
          ),
          buildModuleToggle(
            "trustedBadges",
            "Trusted Badge",
            "يعرض شارات الدفع والتوصيل والاستبدال قرب الشراء.",
            "conversion-suite",
            "trustedBadges",
          ),
          buildModuleToggle(
            "stickyAddToCart",
            "Sticky Add to Cart bar",
            "يبقي زر الإضافة ظاهرًا أثناء التمرير داخل صفحة المنتج.",
            "conversion-suite",
            "stickyAddToCart",
          ),
          buildModuleToggle(
            "backInStock",
            "Back in Stock",
            "يفعل جمع الاهتمام بالمقاس أو اللون غير المتاح.",
            "conversion-suite",
            "backInStock",
          ),
        ],
      },
    ],
  },
  {
    id: "offers-bundles",
    path: "/settings/store/offers-bundles",
    navLabel: "العروض والباقات",
    title: "العروض والباقات",
    description: "أدوات رفع متوسط قيمة الطلب عبر التوصيات وعروض الكمية.",
    appSlugs: ["conversion-suite", "quantity-offers-pro"],
    sections: [
      {
        title: "منتجات مكملة",
        tools: [
          buildModuleToggle(
            "crossSell",
            "Cross Sell",
            "يشغل اقتراح المنتجات المكملة في المساحات المخصصة لها.",
            "conversion-suite",
            "crossSell",
          ),
          buildModuleToggle(
            "boughtTogether",
            "Bought Together",
            "يعرض باقات المنتجات التي تشتري معًا من نفس الصفحة.",
            "conversion-suite",
            "boughtTogether",
          ),
        ],
      },
      {
        title: "عروض الكمية",
        tools: [
          buildModuleToggle(
            "bulkSavings",
            "Bulk Savings",
            "يشغل توفير الكمية المختصر داخل صفحة المنتج.",
            "conversion-suite",
            "bulkSavings",
          ),
          {
            key: "buyMoreSaveMore",
            label: "Buy More Save More",
            description: "يشغل لوحة عروض الكميات الكاملة وخيارات المزج داخل الصفحة.",
            appSlug: "quantity-offers-pro",
            readPaths: ["general.enabled", "modules.renderOnProductPage"],
            writePathsOn: ["general.enabled", "modules.renderOnProductPage"],
            writePathsOff: ["modules.renderOnProductPage"],
          },
        ],
      },
    ],
  },
  {
    id: "growth-widgets",
    path: "/settings/store/growth-widgets",
    navLabel: "ودجات الموقع",
    title: "ودجات الموقع",
    description: "أدوات عامة تعمل على مستوى المتجر أو الجلسة، لا داخل buybox فقط.",
    appSlugs: ["conversion-suite"],
    sections: [
      {
        title: "أشرطة ورسائل عامة",
        tools: [
          {
            ...buildModuleToggle(
              "freeShippingBar",
              "Free Shipping Bar",
              "يعرض شريط الشحن المجاني على مستوى المتجر وداخل السلة والشيك أوت عند تفعيله.",
              "conversion-suite",
              "freeShippingBar",
            ),
            fields: [
              {
                key: "freeShippingAmount",
                label: "حد الشحن المجاني",
                description:
                  "القيمة التي يحتاج العميل للوصول لها حتى يظهر له أن الشحن أصبح مجانياً.",
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
            "يغير عنوان التبويب عندما يبتعد المستخدم عن الصفحة.",
            "conversion-suite",
            "inactiveTab",
          ),
        ],
      },
      {
        title: "تحفيز سلوكي",
        tools: [
          buildModuleToggle(
            "exitIntentPopup",
            "Exit Intent Popup",
            "يشغل نافذة نية الخروج عند محاولة مغادرة المتجر.",
            "conversion-suite",
            "exitIntentPopup",
          ),
          buildModuleToggle(
            "fakeVisitorCounter",
            "Fake Visitor",
            "يشغل عداد الزوار اللحظي كجزء من الإشارات السلوكية.",
            "conversion-suite",
            "fakeVisitorCounter",
          ),
          buildModuleToggle(
            "fakeSalePopup",
            "Fake Sale Popup",
            "يشغل نافذة النشاط الشرائي المباشر على مستوى المتجر.",
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
    navLabel: "أوضاع البيع",
    title: "أوضاع البيع",
    description: "طرق بيع خاصة للمنتجات التي تحتاج سيناريو مختلف عن الشراء المعتاد.",
    appSlugs: ["commerce-advanced"],
    sections: [
      {
        title: "طرق بيع خاصة",
        tools: [
          buildModuleToggle(
            "preOrder",
            "Pre Order",
            "يسمح ببيع المنتجات قبل توفرها الفعلي بالمخزون.",
            "commerce-advanced",
            "preOrder",
          ),
          buildModuleToggle(
            "externalAffiliate",
            "External / Affiliate Product",
            "يحول عملية الشراء إلى منصة أو رابط خارجي عند الحاجة.",
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
    navLabel: "المراجعات والثقة",
    title: "المراجعات والثقة",
    description: "أدوات المحتوى المرئي والإثبات الاجتماعي داخل المراجعات.",
    appSlugs: ["ugc-reviews-pro"],
    sections: [
      {
        title: "المحتوى المرئي",
        tools: [
          buildModuleToggle(
            "photoReviews",
            "Photo Review",
            "يسمح للعميلات بإرفاق صور داخل التقييمات.",
            "ugc-reviews-pro",
            "photoReviews",
          ),
          buildModuleToggle(
            "videoReviews",
            "Video Review",
            "يسمح بإرفاق فيديو داخل التقييمات عند كتابة المراجعة.",
            "ugc-reviews-pro",
            "videoReviews",
          ),
        ],
      },
      {
        title: "إثبات الثقة",
        tools: [
          buildModuleToggle(
            "verifiedBadge",
            "Verified Badge",
            "يعرض شارة المشتري المؤكد داخل المراجعات.",
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
