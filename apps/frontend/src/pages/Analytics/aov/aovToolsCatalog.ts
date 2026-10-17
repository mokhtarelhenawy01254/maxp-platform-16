export type AovLifecycleLaneId =
  | "pre-purchase"
  | "in-purchase"
  | "post-purchase"
  | "intelligence";

export interface AovMetricItem {
  label: string;
  value: string | number;
  unit?: string;
  isCurrency?: boolean;
}

export interface AovToolDefinition {
  id: string;
  name: string;
  subtitle: string;
  lane: AovLifecycleLaneId;
  appSlug?: string;
  moduleKey?: string;
  settingsPath: string;
  externalLink?: boolean;
  canToggle?: boolean;
  defaultActive?: boolean;
  /**
   * Real appUsageLog feature names (exact DB values) this card reports.
   * Metric value = number of recorded actions for the feature.
   */
  telemetryFeatures?: Array<{ feature: string; label: string }>;
}

/**
 * Arabic-friendly tool count: 3-10 → "أدوات", otherwise → "أداة".
 */
export const formatToolsCountLabel = (count: number): string => {
  if (count === 1) return "أداة واحدة";
  if (count >= 3 && count <= 10) return `${count} أدوات`;
  return `${count} أداة`;
};

export const AOV_LIFECYCLE_LANES: Array<{
  id: AovLifecycleLaneId;
  title: string;
  description: string;
}> = [
  {
    id: "pre-purchase",
    title: "1. مرحلة قبل الشراء (بناء وتضخيم السلة)",
    description: "محفزات صفحة المنتج والكتالوج لدفع العميل لاختيار قطع أكثر أو حزم أعلى قيمة قبل التوجه للسلة.",
  },
  {
    id: "in-purchase",
    title: "2. مرحلة أثناء الشراء (السلة ومكالمة التأكيد)",
    description: "تعظيم متوسط الفاتورة داخل درج السلة، صفحة الدفع، وتوجيه مسؤولي التأكيد للـ Upsell الهاتفي.",
  },
  {
    id: "post-purchase",
    title: "3. مرحلة بعد الشراء (العروض الفورية وإعادة البيع)",
    description: "استغلال ذروة ثقة العميل مباشرة بعد الطلب عبر عروض بضغطة واحدة وقنوات المتابعة الآلية.",
  },
  {
    id: "intelligence",
    title: "4. مرحلة الذكاء والقياس (Analytics & AI Agents)",
    description: "محركات الحسابات الدقيقة، تتبع هوامش الربح، والوكيل الذكي المتخصص في تعظيم الـ AOV.",
  },
];

export const AOV_TOOLS_CATALOG: AovToolDefinition[] = [
  // ==================== 1. PRE-PURCHASE (12 tools) ====================
  {
    id: "quantity-offers-pro",
    name: "عروض الكميات وMix & Match",
    subtitle: "تدرج أسعار الخصم عند شراء 2 أو 3 قطع مع تخصيص المقاسات والألوان",
    lane: "pre-purchase",
    appSlug: "quantity-offers-pro",
    moduleKey: "renderOnProductPage",
    settingsPath: "/settings/store/offers-bundles",
    canToggle: true,
  },
  {
    id: "bought-together",
    name: "اشترِ معًا — الباقات المجمعة (Frequently Bought)",
    subtitle: "اقتراح باقة متكاملة بضغطة زر واحدة لزيادة متوسط القطع في الطلب",
    lane: "pre-purchase",
    appSlug: "conversion-suite",
    moduleKey: "boughtTogether",
    settingsPath: "/settings/upsell",
    canToggle: true,
    telemetryFeatures: [{ feature: "bought_together_view", label: "مشاهدات الباقة" }],
  },
  {
    id: "cross-sell-rail",
    name: "منتجات مكملة (Cross-Sell Rail)",
    subtitle: "شريط المنتجات التكميلية في صفحة المنتج المرتبطة بنوع القطعة",
    lane: "pre-purchase",
    appSlug: "conversion-suite",
    moduleKey: "crossSell",
    settingsPath: "/settings/upsell",
    canToggle: true,
    telemetryFeatures: [{ feature: "cross_sell_section_view", label: "مرات المشاهدة" }],
  },
  {
    id: "upsell-upgrade",
    name: "منتجات الترقية البديلة (Upsell Upgrade)",
    subtitle: "عرض النسخة الأحدث أو الفئة الأعلى قيمة من المنتج أثناء التصفح",
    lane: "pre-purchase",
    appSlug: "conversion-suite",
    settingsPath: "/settings/upsell",
  },
  {
    id: "store-promo-tiers",
    name: "تدرجات خصم المتجر التلقائية (Store Tiers)",
    subtitle: "خصم تصاعدي فوري (اشترِ بقيمة 1000 احصل على خصم 10% وهكذا)",
    lane: "pre-purchase",
    settingsPath: "/settings/store-pages",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "free-shipping-bar",
    name: "شريط تقدم الشحن المجاني (Free Shipping Bar)",
    subtitle: "شريط ديناميكي يوضح للعميل المبلغ المتبقي للحصول على شحن مجاني",
    lane: "pre-purchase",
    appSlug: "conversion-suite",
    moduleKey: "freeShippingBar",
    settingsPath: "/settings/store/growth-widgets",
    canToggle: true,
    telemetryFeatures: [{ feature: "free_shipping_bar_view", label: "مرات العرض" }],
  },
  {
    id: "exit-intent-popup",
    name: "نافذة نية الخروج (Exit Intent Coupon)",
    subtitle: "عرض كوبون محفز برفع السلة للعميل المتردد قبل مغادرة الصفحة",
    lane: "pre-purchase",
    appSlug: "conversion-suite",
    moduleKey: "exitIntentPopup",
    settingsPath: "/settings/store/growth-widgets",
    canToggle: true,
  },
  {
    id: "sticky-atc",
    name: "شريط الشراء الثابت (Sticky Add to Cart)",
    subtitle: "تثبيت زر الشراء مع إمكانية إضافة عروض الكميات بأسفل الشاشة أثناء التمرير",
    lane: "pre-purchase",
    appSlug: "conversion-suite",
    moduleKey: "stickyAddToCart",
    settingsPath: "/settings/store/product-conversion",
    canToggle: true,
    telemetryFeatures: [
      { feature: "sticky_add_to_cart_click", label: "نقرات الزر الثابت" },
      { feature: "sticky_buy_now_click", label: "نقرات اشترِ الآن" },
    ],
  },
  {
    id: "pdp-quick-order",
    name: "الطلب السريع المباشر (Quick Order)",
    subtitle: "فورم شراء سريع بضغطة واحدة من صفحة المنتج متكامل مع عروض الكميات",
    lane: "pre-purchase",
    appSlug: "conversion-suite",
    settingsPath: "/settings/store/product-conversion",
    telemetryFeatures: [
      { feature: "pdp_quick_order_submit", label: "طلبات سريعة" },
      { feature: "pdp_quick_order_add_to_cart", label: "إضافات للسلة" },
    ],
  },
  {
    id: "payment-offers-wallet",
    name: "عروض الدفع وخصم المحفظة (Payment Offers)",
    subtitle: "تحفيز الدفع الإلكتروني أو المحفظة بخصم مشروط بالوصول لـ AOV معين",
    lane: "pre-purchase",
    settingsPath: "/settings/store-payment-offers",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "pre-order-scarcity",
    name: "الطلب المسبق وإشارات الندرة (Pre-Order)",
    subtitle: "حجز كميات مسبقة مع تنبيهات انخفاض المخزون لتحفيز الشراء السريع",
    lane: "pre-purchase",
    appSlug: "conversion-suite",
    moduleKey: "lowStockNotice",
    settingsPath: "/settings/store/product-conversion",
    canToggle: true,
  },
  {
    id: "wholesale-tiers",
    name: "مستويات البيع بالجملة (Wholesale Tiers)",
    subtitle: "أسعار بيع الجملة للتجار والطلبات الكبيرة برفع مباشر لقيمة السلة",
    lane: "pre-purchase",
    settingsPath: "/settings/store",
    canToggle: false,
    defaultActive: false,
  },

  // ==================== 2. IN-PURCHASE (8 tools) ====================
  {
    id: "cart-drawer-upsell",
    name: "سلة المشتريات الذكية — مقترحات جوّه السلة",
    subtitle: "عرض منتجات مكملة وإضافات سريعة (Quick Add) داخل درج السلة مباشرة",
    lane: "in-purchase",
    appSlug: "conversion-suite",
    settingsPath: "/settings/store/growth-widgets",
    telemetryFeatures: [{ feature: "cart_upsell_view", label: "مرات المشاهدة" }],
  },
  {
    id: "cart-quantity-reminder",
    name: "تذكير ترقية الكمية في السلة (Cart Quantity Upsell)",
    subtitle: "تنبيه العميل بفرق السعر البسيط للحصول على قطعة إضافية داخل السلة",
    lane: "in-purchase",
    appSlug: "conversion-suite",
    settingsPath: "/settings/store/offers-bundles",
    telemetryFeatures: [{ feature: "cart_quantity_upsell_click", label: "نقرات الترقية" }],
  },
  {
    id: "cart-free-shipping-goal",
    name: "مقياس الشحن المجاني في السلة (Cart Goal)",
    subtitle: "مقياس ملون يوضح 'أضف بـ 85 ج.م واحصل على شحن مجاني'",
    lane: "in-purchase",
    appSlug: "conversion-suite",
    moduleKey: "freeShippingBar",
    settingsPath: "/settings/store/growth-widgets",
    canToggle: true,
    telemetryFeatures: [{ feature: "free_shipping_progress_milestone", label: "أداء التقدم" }],
  },
  {
    id: "cart-reservation-timer",
    name: "مؤقت حجز السلة (Cart Urgency Timer)",
    subtitle: "حجز القطع لفترة زمنية محددة لمنع تراجع العميل عن إتمام الطلب",
    lane: "in-purchase",
    appSlug: "conversion-suite",
    moduleKey: "saleCountdown",
    settingsPath: "/settings/store/growth-widgets",
    canToggle: true,
  },
  {
    id: "coupons-system",
    name: "كوبونات الخصم المشروطة بحد أدنى",
    subtitle: "كوبونات لا تُفعّل إلا إذا تجاوزت السلة حداً نقدياً معيناً لرفع الـ AOV",
    lane: "in-purchase",
    settingsPath: "/coupons",
    canToggle: false,
    defaultActive: true,
    telemetryFeatures: [{ feature: "coupon_validation_success", label: "كوبونات ناجحة" }],
  },
  {
    id: "call-center-upsell",
    name: "Upsell مكالمة التأكيد (Confirmation Desk)",
    subtitle: "إضافة عروض وبنود إضافية للطلب أثناء مكالمة تأكيد الأوردر مع العميل",
    lane: "in-purchase",
    settingsPath: "/orders/workspace",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "abandoned-cart-recovery",
    name: "استرجاع السلات المتروكة (Cart Recovery)",
    subtitle: "لوحة تحويل السلات غير المكتملة وتتبع الإيراد المسترد",
    lane: "in-purchase",
    settingsPath: "/analytics/orders/abandoned-cart",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "discount-approvals",
    name: "موافقات الخصومات على الطلبات",
    subtitle: "حوكمة الخصومات اليدوية لضمان عدم تآكل متوسط قيمة الفاتورة وهامش الربح",
    lane: "in-purchase",
    settingsPath: "/settings/orders",
    canToggle: false,
    defaultActive: true,
  },

  // ==================== 3. POST-PURCHASE (8 tools) ====================
  {
    id: "post-purchase-offer",
    name: "العرض الفوري بعد الشراء (One-Click Offer)",
    subtitle: "عرض منتج مكمل بخصم حصري ومؤقت بعد الضغط على تأكيد الطلب مباشرة",
    lane: "post-purchase",
    settingsPath: "/settings/post-purchase-offer",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "thank-you-reorder",
    name: "بلوك ما بعد الشراء وإعادة الطلب (Reorder Block)",
    subtitle: "إعادة طلب سريع واقتراح منتجات إضافية في صفحة الشكر (Thank You Page)",
    lane: "post-purchase",
    appSlug: "conversion-suite",
    moduleKey: "postPurchaseUpsell",
    settingsPath: "/settings/upsell",
    canToggle: true,
    telemetryFeatures: [
      { feature: "post_purchase_upsell_view", label: "مشاهدات ما بعد الشراء" },
      { feature: "thank_you_reorder_completed", label: "إعادة طلب مكتملة" },
    ],
  },
  {
    id: "whatsapp-abandoned-series",
    name: "سلسلة رسائل واتساب الذكية (3 تذكيرات)",
    subtitle: "إرسال 3 رسائل تصاعدية تمنح خصم مقيد بحد أدنى للطلب لاسترداد السلة",
    lane: "post-purchase",
    settingsPath: "/whatsapp/customer-journey",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "whatsapp-first-seen-alert",
    name: "تنبيه أول ظهور للسلة (Instant Cart Alert)",
    subtitle: "تواصل سريع مع العميل المتردد لتقديم ترقية أو حل للاستفسار",
    lane: "post-purchase",
    settingsPath: "/whatsapp/customer-journey",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "broadcast-pro-audiences",
    name: "البث التسويقي للمشترين السابقين (Broadcast Pro)",
    subtitle: "حملات واتساب مستهدفة للعملاء ذوي الإنفاق المرتفع لإعادة الشراء",
    lane: "post-purchase",
    settingsPath: "/whatsapp",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "auto-product-recommendations",
    name: "إرسال عروض المنتجات البديلة تلقائيًا",
    subtitle: "رسائل توصيات مبنية على ما اشتراه العميل سابقاً لرفع القيمة الدائمة (CLV)",
    lane: "post-purchase",
    settingsPath: "/whatsapp/customer-journey",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "auto-discount-cashback",
    name: "الكوبونات التلقائية والكاش باك (Auto Discount)",
    subtitle: "قسيمة خصم مشروطة تصدر مع كل فاتورة لاستخدامها في الطلب التالي",
    lane: "post-purchase",
    settingsPath: "/coupons",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "customer-loyalty-points",
    name: "برنامج الولاء والنقاط (Loyalty & Rewards)",
    subtitle: "نقاط مكافآت تتضاعف عند وصول الفاتورة إلى مستويات إنفاق أعلى",
    lane: "post-purchase",
    settingsPath: "/customers/points-center",
    canToggle: false,
    defaultActive: true,
  },

  // ==================== 4. INTELLIGENCE & ANALYTICS (6 tools) ====================
  {
    id: "quantity-offer-insights-engine",
    name: "محرك حسابات عروض الكميات (Insights Engine)",
    subtitle: "تحليل معدل الانتقاء (Selection Rate)، إضافة السلة، ومساهمة عروض الكميات في الـ AOV",
    lane: "intelligence",
    settingsPath: "/settings/store/offers-bundles",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "post-purchase-analytics-dashboard",
    name: "لوحة تحليلات العرض بعد الشراء (Offer Analytics)",
    subtitle: "معدل القبول، صافي الإيراد، الأثر الإضافي على الـ AOV، ومعدلات التسليم",
    lane: "intelligence",
    settingsPath: "/settings/post-purchase-offer",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "shady-aov-specialist-agent",
    name: "وكيل AOV الذكي «شادي» والتقرير اليومي",
    subtitle: "وكيل ذكي يراقب سلال المشتريات يومياً ويرسل تقرير AOV الساعة 9 مساءً عبر واتساب",
    lane: "intelligence",
    settingsPath: "/marketplace/agents",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "coupon-analytics-hub",
    name: "تحليلات أداء الكوبونات والخصومات",
    subtitle: "متابعة أثر الأكواد الترويجية على قيمة السلة وهوامش الربح المحققة",
    lane: "intelligence",
    settingsPath: "/analytics/orders/coupons",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "store-funnel-analytics",
    name: "تحليلات مسار التحويل والسلة (Store & Funnel)",
    subtitle: "رصد معدلات التحويل من المشاهدة إلى السلة والدفع النهائي",
    lane: "intelligence",
    settingsPath: "/analytics/store",
    canToggle: false,
    defaultActive: true,
  },
  {
    id: "upsell-planner-pricing-suite",
    name: "مخطط الـ Upsell وحسابات القيمة الدائمة (CLV)",
    subtitle: "أدوات تنبؤية لحساب نقطة التعادل وهوامش الربح مع زيادة قيمة الطلبات",
    lane: "intelligence",
    settingsPath: "/offers-review",
    canToggle: false,
    defaultActive: true,
  },
];
