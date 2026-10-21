export type StorefrontSectionFieldInputType =
  | "text"
  | "textarea"
  | "number"
  | "url"
  | "select"
  | "checkbox";

export interface StorefrontSectionFieldOption {
  label: string;
  value: string;
}

export interface StorefrontSectionFieldDefinition {
  key: string;
  label: string;
  type: StorefrontSectionFieldInputType;
  placeholder?: string;
  helperText?: string;
  options?: readonly StorefrontSectionFieldOption[];
}

export interface StorefrontSectionVariantDefinition {
  value: string;
  label: string;
}

export interface StorefrontSectionManifestEntry {
  label: string;
  component: string;
  note?: string;
  pages?: readonly string[];
  variants?: readonly StorefrontSectionVariantDefinition[];
  fields?: readonly StorefrontSectionFieldDefinition[];
  legacy?: boolean;
}

export const STOREFRONT_PRODUCT_GRID_VARIANTS = [
  { value: "standard", label: "بطاقات قياسية" },
  { value: "minimal-card", label: "بطاقات مبسطة" },
  { value: "boutique-shelf", label: "رف بوتيك كلاسيكي" },
  { value: "boutique-rail", label: "ريل بوتيك أفقي" },
  { value: "retail-air-grid", label: "شبكة بيع خفيفة" },
  { value: "retail-direct-grid", label: "شبكة بيع مباشرة" },
  { value: "quick-view-fashion-grid", label: "شبكة أزياء مع quick view" },
  { value: "fastly-offer-wall", label: "شبكة عروض Fastly" },
  { value: "spec-rack", label: "رف مقارنة تقني" },
  { value: "elessi-bag-grid", label: "شبكة حقائب Elessi" },
  { value: "elessi-bag-shop-grid", label: "شبكة متجر الحقائب Elessi" },
  { value: "elessi-spotlight-grid", label: "شبكة Elessi مميزة" },
  { value: "elessi-listing-grid", label: "شبكة Elessi قائمة" },
  { value: "elessi-compact-shelf", label: "رف Elessi كثيف" },
  { value: "elessi-editorial-stack", label: "تكديس Elessi تحريري" },
  { value: "elessi-organic-market-grid", label: "شبكة السوق العضوي Elessi" },
  { value: "elessi-organic-shop-grid", label: "شبكة متجر العضوي Elessi" },
  { value: "butcher-cut-grid", label: "شبكة تقطيعات الجزارة" },
  { value: "butcher-atelier-grid", label: "شبكة جزارة Premium داكنة" },
  { value: "elessi-digital-launch-grid", label: "شبكة إطلاق رقمية Elessi" },
  { value: "elessi-digital-catalog-grid", label: "كتالوج رقمي Elessi" },
  { value: "elessi-bike-grid", label: "شبكة الدراجات Elessi" },
  { value: "elessi-bike-shop-grid", label: "شبكة متجر الدراجات Elessi" },
  { value: "elessi-plant-favorites", label: "مفضلات النباتات Elessi" },
  { value: "elessi-plant-nursery-grid", label: "شبكة مشتل Elessi" },
  { value: "perfume-cabinet", label: "خزانة عطور" },
  { value: "perfume-shelf", label: "رف زجاجات" },
  { value: "overlay-card", label: "بطاقات تراكبية" },
  { value: "compact", label: "شبكة كثيفة" },
  { value: "curated-rack", label: "رف منسق (حريمي)" },
  { value: "fit-catalog", label: "شبكة اكتشاف المقاس" },
  { value: "deal-edit", label: "شبكة العروض المركزة" },
  { value: "luxury-card", label: "بطاقات فاخرة" },
  { value: "editorial-card", label: "بطاقات تحريرية" },
  { value: "glass-card", label: "بطاقات زجاجية" },
  { value: "list-card", label: "عرض قائمة" },
  { value: "legacy-compact-listing", label: "قائمة كلاسيكية كثيفة" },
  { value: "carousel", label: "سلايدر أفقي" },
  { value: "grid", label: "شبكة افتراضية" },
  { value: "playful-toybox", label: "صندوق ألعاب مرح (أطفال)" },
] as const satisfies readonly StorefrontSectionVariantDefinition[];

export const STOREFRONT_CONVERSION_SECTION_VARIANTS = [
  { value: "minimal", label: "Minimal" },
  { value: "balanced", label: "Balanced" },
  { value: "editorial", label: "Editorial" },
  { value: "seamless", label: "Seamless (Fragmented)" },
  { value: "couture-minimal", label: "Couture Minimal" },
] as const satisfies readonly StorefrontSectionVariantDefinition[];

export const STOREFRONT_CONVERSION_SECTION_IDS = [
  "conversion-stack",
  "countdown",
  "low-stock",
  "delivery-proof",
  "quantity-offers",
  "viewer-counter",
  "sold-counter",
  "purchase-fomo",
  "pre-order",
  "back-in-stock",
  "trusted-badges",
  "bulk-savings",
  "quantity-offers",
  "bought-together",
] as const;

export const STOREFRONT_QUANTITY_OFFERS_VARIANTS = [
  { value: "stacked-cards", label: "بطاقات متتالية" },
  { value: "compact-buybox", label: "كتلة شراء مضغوطة" },
  { value: "single-offer-focus", label: "تركيز على العرض النشط" },
  { value: "look-builder", label: "منسق الإطلالة" },
  { value: "selection-rail", label: "شريط الحسم المسطح" },
] as const satisfies readonly StorefrontSectionVariantDefinition[];

const STOREFRONT_CONVERSION_COMMON_FIELDS = [
  {
    key: "title",
    label: "عنوان القسم",
    type: "text",
    placeholder: "عنصر تحويل",
  },
  {
    key: "subtitle",
    label: "وصف القسم",
    type: "textarea",
    placeholder: "وصف مختصر يساعد على ضبط هذا العنصر داخل صفحة المنتج.",
  },
  {
    key: "contentAlign",
    label: "محاذاة المحتوى",
    type: "select",
    options: [
      { label: "في المنتصف", value: "center" },
      { label: "على الطرف", value: "start" },
    ],
  },
] as const satisfies readonly StorefrontSectionFieldDefinition[];

const buildConversionSectionFields = (
  fields: readonly StorefrontSectionFieldDefinition[],
) =>
  [
    ...STOREFRONT_CONVERSION_COMMON_FIELDS,
    ...fields,
  ] as const satisfies readonly StorefrontSectionFieldDefinition[];

export const STOREFRONT_CUSTOM_PAGE_STARTER_SECTIONS = [
  "hero-banner",
  "product-grid",
  "newsletter",
] as const;

export const STOREFRONT_SECTION_MANIFEST = {
  heading: {
    label: "عنوان",
    component: "heading",
    pages: [],
    variants: [],
    fields: [
      { key: "text", label: "نص العنوان", type: "text", placeholder: "عنوان رئيسي" },
      {
        key: "level",
        label: "المستوى",
        type: "select",
        options: [
          { value: "h2", label: "H2 (افتراضي)" },
          { value: "h3", label: "H3 (فرعي)" },
          { value: "h4", label: "H4 (مبسط)" },
        ],
      },
      {
        key: "align",
        label: "المحاذاة",
        type: "select",
        options: [
          { value: "start", label: "بداية (يمين)" },
          { value: "center", label: "توسيط" },
          { value: "end", label: "نهاية (يسار)" },
        ],
      },
      { key: "color", label: "اللون", type: "text", placeholder: "accent أو #171717" },
    ],
  },
  text: {
    label: "نص",
    component: "text",
    pages: [],
    variants: [],
    fields: [
      { key: "content", label: "محتوى النص", type: "textarea", placeholder: "أدخل النص هنا..." },
      {
        key: "size",
        label: "الحجم",
        type: "select",
        options: [
          { value: "sm", label: "صغير" },
          { value: "md", label: "متوسط (افتراضي)" },
          { value: "lg", label: "كبير" },
        ],
      },
      {
        key: "align",
        label: "المحاذاة",
        type: "select",
        options: [
          { value: "start", label: "بداية (يمين)" },
          { value: "center", label: "توسيط" },
          { value: "end", label: "نهاية (يسار)" },
        ],
      },
    ],
  },
  image: {
    label: "صورة",
    component: "image",
    pages: [],
    variants: [],
    fields: [
      { key: "src", label: "رابط الصورة", type: "url", placeholder: "https://..." },
      { key: "alt", label: "النص البديل", type: "text", placeholder: "وصف الصورة" },
      { key: "href", label: "رابط التحويل", type: "url", placeholder: "/collections" },
      {
        key: "radius",
        label: "استدارة الحواف",
        type: "select",
        options: [
          { value: "store", label: "افتراضي المتجر (--store-radius)" },
          { value: "none", label: "بدون استدارة (0)" },
          { value: "sm", label: "صغير (4px)" },
          { value: "md", label: "متوسط (8px)" },
          { value: "lg", label: "كبير (16px)" },
          { value: "full", label: "دائري كامل" },
        ],
      },
    ],
  },
  button: {
    label: "زر",
    component: "button",
    pages: [],
    variants: [
      { value: "primary", label: "أساسي" },
      { value: "outline", label: "محدد" },
      { value: "ghost", label: "شفاف" },
    ],
    fields: [
      { key: "label", label: "نص الزر", type: "text", placeholder: "اضغط هنا" },
      { key: "href", label: "رابط الزر", type: "url", placeholder: "#" },
      {
        key: "variant",
        label: "نوع الزر",
        type: "select",
        options: [
          { value: "primary", label: "أساسي" },
          { value: "outline", label: "محدد" },
          { value: "ghost", label: "شفاف" },
        ],
      },
      {
        key: "size",
        label: "الحجم",
        type: "select",
        options: [
          { value: "sm", label: "صغير" },
          { value: "md", label: "متوسط" },
          { value: "lg", label: "كبير" },
        ],
      },
    ],
  },
  icon: {
    label: "أيقونة",
    component: "icon",
    pages: [],
    variants: [],
    fields: [
      { key: "name", label: "اسم الأيقونة", type: "text", placeholder: "sparkles, check, star, heart, truck, shield..." },
      {
        key: "size",
        label: "الحجم",
        type: "select",
        options: [
          { value: "sm", label: "صغير (16px)" },
          { value: "md", label: "متوسط (24px)" },
          { value: "lg", label: "كبير (36px)" },
          { value: "xl", label: "كبير جداً (48px)" },
        ],
      },
      { key: "color", label: "اللون", type: "text", placeholder: "accent أو #2563eb" },
    ],
  },
  divider: {
    label: "فاصل",
    component: "divider",
    pages: [],
    variants: [],
    fields: [
      {
        key: "thickness",
        label: "السماكة",
        type: "select",
        options: [
          { value: "1px", label: "1px (افتراضي)" },
          { value: "2px", label: "2px" },
          { value: "4px", label: "4px" },
        ],
      },
      { key: "color", label: "اللون", type: "text", placeholder: "#e5e7eb أو accent" },
      {
        key: "width",
        label: "العرض",
        type: "select",
        options: [
          { value: "full", label: "كامل (100%)" },
          { value: "3/4", label: "ثلاثة أرباع (75%)" },
          { value: "1/2", label: "نصف (50%)" },
          { value: "1/4", label: "ربع (25%)" },
        ],
      },
    ],
  },
  spacer: {
    label: "مسافة",
    component: "spacer",
    pages: [],
    variants: [],
    fields: [
      {
        key: "height",
        label: "الارتفاع",
        type: "select",
        options: [
          { value: "density", label: "كثافة المتجر تلقائياً (--store-density-gap)" },
          { value: "sm", label: "صغير (12px)" },
          { value: "md", label: "متوسط (24px)" },
          { value: "lg", label: "كبير (48px)" },
          { value: "xl", label: "كبير جداً (64px)" },
        ],
      },
    ],
  },
  video: {
    label: "فيديو",
    component: "video",
    pages: [],
    variants: [],
    fields: [
      { key: "url", label: "رابط الفيديو (YouTube/Vimeo/MP4)", type: "url", placeholder: "https://www.youtube.com/watch?v=..." },
      { key: "poster", label: "صورة الغلاف", type: "url", placeholder: "https://..." },
      {
        key: "ratio",
        label: "نسبة الأبعاد",
        type: "select",
        options: [
          { value: "16:9", label: "16:9 (عريض)" },
          { value: "4:3", label: "4:3 (كلاسيكي)" },
          { value: "1:1", label: "1:1 (مربع)" },
          { value: "9:16", label: "9:16 (رأسي)" },
        ],
      },
    ],
  },
  "look-mosaic": {
    label: "فسيفساء اللوكات",
    component: "look-mosaic",
    pages: ["home", "shop"],
    variants: [
      { value: "bento", label: "بنتو" },
      { value: "masonry", label: "ماسونري" },
    ],
    fields: [
      { key: "title", label: "العنوان", type: "text" },
      { key: "subtitle", label: "التسمية", type: "textarea" },
      { key: "ctaText", label: "نص الزر", type: "text" },
      { key: "ctaLink", label: "رابط الزر", type: "url" },
    ],
  },
  "look-planner": {
    label: "مخطّط اللوك",
    component: "look-planner",
    pages: ["home", "shop"],
    variants: [
      { value: "stepper", label: "خطوات" },
      { value: "chips", label: "شرائح" },
    ],
    fields: [
      { key: "title", label: "العنوان", type: "text" },
      { key: "subtitle", label: "التسمية", type: "textarea" },
    ],
  },
  "look-progress": {
    label: "سلّم الإطلالة",
    component: "look-progress",
    pages: ["pdp"],
    variants: [
      { value: "ladder", label: "سلّم" },
      { value: "compact", label: "مضغوط" },
    ],
    fields: [
      { key: "title", label: "العنوان", type: "text" },
      { key: "subtitle", label: "التسمية", type: "textarea" },
    ],
  },
  "promo-strip": {
    label: "شريط المزايا",
    component: "promo-strip",
      variants: [
        { value: "standard", label: "قياسي" },
        { value: "benefit-ribbon", label: "شريط مزايا حريمي" },
        { value: "sale-signal", label: "شريط خصومات حريمي" },
        { value: "butcher-proof-marquee", label: "ماركيه ضمانات جزارة Premium" },
      ],
    fields: [
      { key: "badge", label: "شارة العرض", type: "text", placeholder: "عرض خاص" },
      {
        key: "message",
        label: "الرسالة الرئيسية",
        type: "textarea",
        placeholder: "خصومات موسمية وشحن سريع...",
      },
      {
        key: "saleLabel",
        label: "شارة الخصم",
        type: "text",
        placeholder: "حتى 25% خصم",
      },
      {
        key: "shippingLabel",
        label: "شارة الشحن",
        type: "text",
        placeholder: "شحن خلال 48 ساعة",
      },
      {
        key: "returnLabel",
        label: "شارة الاستبدال",
        type: "text",
        placeholder: "استبدال خلال 14 يوم",
      },
      {
        key: "ctaText",
        label: "نص زر الإجراء",
        type: "text",
        placeholder: "شاهدي العروض",
      },
      {
        key: "ctaLink",
        label: "رابط زر الإجراء",
        type: "url",
        placeholder: "/sale",
      },
    ],
  },
  "hero-banner": {
    label: "البنر الرئيسي",
    component: "hero-banner",
    note: "يمكنك تخصيص النصوص والصور وأزرار الإجراء مباشرة من لوحة الإعدادات، والتحكم في شكل العرض وترتيب القسم.",
    variants: [
      { value: "centered", label: "عنوان في المنتصف" },
      { value: "full-bleed", label: "عرض كامل" },
      { value: "cinematic-plinth", label: "منصة سينمائية فاخرة" },
      { value: "split-panel", label: "تقسيم جانبي" },
      { value: "retail-direct-banner", label: "بانر بيع مباشر" },
      { value: "fashion-billboard", label: "لوحة أزياء باستيل" },
      { value: "style-ledger", label: "مذكرة الإطلالة" },
      { value: "graceful-banner", label: "بانر Graceful (صورة كاملة)" },
      { value: "retail-command", label: "لوحة بيع تقنية" },
      { value: "soft-showcase", label: "عرض تقني ناعم" },
      { value: "travel-dashboard", label: "لوحة سفر عائمة" },
      { value: "neon-dark", label: "نيون داكن" },
      { value: "luxury-minimal", label: "فخامة مبسطة" },
      { value: "organic-bloom", label: "تزهر عضوي" },
      { value: "speed-banner", label: "شريط سرعة" },
      { value: "warm-cozy", label: "دافئ ومريح" },
      { value: "cyber-glitch", label: "سايبر جليتش" },
      { value: "drop-board", label: "لوحة دروب" },
      { value: "runway-grid", label: "شبكة رانواي" },
      { value: "wardrobe-planner", label: "مخطط خزانة" },
      { value: "modest-cascade", label: "تدرج الطبقات المحتشم" },
      { value: "legacy-image-slider", label: "سلايدر صور كلاسيكي" },
      { value: "boutique-muse", label: "بوتيك كلاسيكي هادئ" },
      { value: "nature-breeze", label: "نسمة طبيعية" },
      { value: "scent-portrait", label: "بورتريه العطر" },
      { value: "elessi-spotlight", label: "Elessi Spotlight" },
      { value: "elessi-bag-hero", label: "Elessi Bag Hero" },
      { value: "elessi-beauty-ritual", label: "Elessi Beauty Ritual" },
      { value: "elessi-jewel-salon", label: "Elessi Jewel Salon" },
      { value: "elessi-dual-merch", label: "Elessi Dual Merch" },
      { value: "elessi-pet-sunroom", label: "Elessi Pet Sunroom" },
      { value: "elessi-promo-cascade", label: "Elessi Promo Cascade" },
      { value: "elessi-garage-command", label: "Elessi Garage Command" },
      { value: "elessi-utility-stage", label: "Elessi Utility Stage" },
      { value: "elessi-soft-departments", label: "Elessi Soft Departments" },
      { value: "elessi-organic-harvest", label: "Elessi Organic Harvest" },
      { value: "butcher-counter", label: "عداد جزارة طازة" },
      { value: "butcher-atelier", label: "جزارة Premium سينمائية" },
      { value: "elessi-digital-launch", label: "Elessi Digital Launch" },
      { value: "elessi-bike-hero", label: "Elessi Bike Hero" },
      { value: "elessi-plant-slider", label: "Elessi Plant Slider" },
      { value: "playful-split", label: "تقسيم مرح (أطفال)" },
      { value: "layered-parallax-sky", label: "سماء تفاعلية (أطفال)" },
      { value: "grooming-hero", label: "Hero مدونة Grooming (داكن)" },
      { value: "dental-precision-hero", label: "معمل أسنان رقمي CAD/CAM فاخر" },
    ],
    fields: [
      {
        key: "eyebrow",
        label: "شارة أعلى العنوان",
        type: "text",
        placeholder: "Fly smarter",
      },
      {
        key: "title",
        label: "العنوان الرئيسي",
        type: "text",
        placeholder: "مثال: أحدث صيحات الموضة",
      },
      {
        key: "subtitle",
        label: "العنوان الفرعي",
        type: "text",
        placeholder: "مثال: استمتع بتخفيضات تصل إلى 50%",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "ctaText",
        label: "نص الزر الأساسي",
        type: "text",
        placeholder: "تسوق الآن",
      },
      {
        key: "ctaLink",
        label: "رابط الزر الأساسي",
        type: "url",
        placeholder: "/shop",
      },
      {
        key: "secondaryCtaText",
        label: "نص الزر الثانوي",
        type: "text",
        placeholder: "شاهدي التخفيضات",
      },
      {
        key: "secondaryCtaLink",
        label: "رابط الزر الثانوي",
        type: "url",
        placeholder: "/sale",
      },
      {
        key: "backgroundImage",
        label: "رابط الصورة",
        type: "url",
        placeholder: "/placeholders/luxury-shoes/hero.png",
      },
    ],
  },
  "featured-collections": {
    label: "التصنيفات المميزة",
    component: "featured-collections",
    variants: [
      { value: "standard-showcase", label: "عرض قياسي" },
      { value: "editorial-categories", label: "تصنيفات تحريرية" },
      { value: "gallery-columns", label: "جاليري أعمدة تحريرية" },
      { value: "fast-nav-grid", label: "شبكة تنقل سريع" },
      { value: "tech-decision-lanes", label: "مسارات تقنية احترافية" },
      { value: "catalog-pills", label: "حبوب أقسام ناعمة" },
      { value: "retail-category-tiles", label: "بلاطات أقسام مباشرة" },
      { value: "pastel-category-lane", label: "مسار أقسام باستيل" },
      { value: "fragrance-ledger", label: "دفتر العائلات العطرية" },
      { value: "butcher-cut-map", label: "خريطة تقطيعات جزارة Premium" },
      { value: "elessi-merch-panels", label: "ألواح Elessi البيعية" },
      { value: "elessi-bag-categories", label: "فئات حقائب Elessi" },
      { value: "elessi-pill-shelf", label: "رف أقسام Elessi" },
      { value: "elessi-story-cards", label: "بطاقات Elessi القصصية" },
      { value: "elessi-utility-cards", label: "بطاقات Elessi العملية" },
      { value: "elessi-organic-routes", label: "مسارات العضوي Elessi" },
      { value: "elessi-digital-departments", label: "أقسام الرقمية Elessi" },
      { value: "elessi-bike-panels", label: "ألواح الدراجات Elessi" },
      { value: "elessi-plant-categories", label: "فئات النباتات Elessi" },
      { value: "occasion-ribbon", label: "شريط مناسبات" },
      { value: "travel-postcards", label: "بطاقات رحلة" },
      { value: "legacy-circle-categories", label: "تصنيفات دائرية كلاسيكية" },
      { value: "menu-categories", label: "تصنيفات منيو" },
      { value: "playful-bubbles", label: "فقاعات مرحة (أطفال)" },
      { value: "floating-bubbles", label: "فقاعات عائمة (أطفال)" },
    ],
    fields: [
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "تسوقي حسب الستايل",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "اختيارات حسب المناسبة أو الستايل...",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      { key: "limit", label: "عدد البطاقات", type: "number", placeholder: "6" },
      {
        key: "ctaText",
        label: "نص رابط القسم",
        type: "text",
        placeholder: "كل التصنيفات",
      },
      {
        key: "ctaLink",
        label: "رابط القسم",
        type: "url",
        placeholder: "/collections",
      },
      {
        key: "collections",
        label: "بطاقات الأقسام",
        type: "textarea",
        placeholder:
          "أساسيات يومية|منتجات تتكرر يوميًا وتحتاج وصولًا أسرع|/assets/themes/smart-bazaar/daily.png|/shop?sort=popular",
        helperText: "كل سطر: title|subtitle|image|link",
      },
    ],
  },
  "featured-products": {
    label: "المنتجات المميزة",
    component: "product-grid",
    variants: STOREFRONT_PRODUCT_GRID_VARIANTS,
    fields: [
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "منتجات مختارة لك",
      },
      {
        key: "limit",
        label: "عدد المنتجات",
        type: "number",
        placeholder: "8",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "saleOnly",
        label: "منتجات مخفضة فقط",
        type: "select",
        options: [
          { label: "لا", value: "false" },
          { label: "نعم", value: "true" },
        ],
      },
    ],
  },
  "shoe-fit-finder": {
    label: "مساعد اختيار الحذاء",
    component: "shoe-fit-finder",
    pages: ["home", "pdp"],
    fields: [
      { key: "badge", label: "شارة القسم", type: "text", placeholder: "اختيار أسرع" },
      { key: "title", label: "عنوان القسم", type: "text", placeholder: "اختاري الحذاء حسب يومك" },
      {
        key: "subtitle",
        label: "وصف القسم",
        type: "textarea",
        placeholder: "ابدئي من استخدامك اليومي ثم اختاري المقاس واللون.",
      },
      { key: "primaryCtaText", label: "نص الزر الرئيسي", type: "text", placeholder: "شاهدي كل الأحذية" },
      { key: "primaryCtaLink", label: "رابط الزر الرئيسي", type: "url", placeholder: "/shop" },
      {
        key: "routes",
        label: "مسارات الاختيار",
        type: "textarea",
        placeholder:
          "مشاوير طويلة|راحة تمشي معاكي اليوم كله|سنيكرز خفيف وثابت|/placeholders/luxury-shoes/sneaker-white.png|سنيكرز مريح|/shop?category=sneakers",
        helperText: "يمكن تركها فارغة لاستخدام مسارات أحذية جاهزة.",
      },
    ],
  },
  "lookbook-showcase": {
    label: "قسم الإلهام",
    component: "lookbook-showcase",
    pages: ["home", "lookbook", "shop"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "boutique-storyboard", label: "لوحة بوتيك هادئة" },
    ],
    fields: [
      { key: "badge", label: "شارة القسم", type: "text", placeholder: "إلهام" },
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "إطلالات كاملة تبدأ من الحذاء",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "أفكار تنسيق سريعة ومُلهمة...",
      },
      { key: "limit", label: "عدد البطاقات", type: "number", placeholder: "4" },
      { key: "ctaText", label: "نص الزر", type: "text", placeholder: "تسوقي التشكيلة" },
      { key: "ctaLink", label: "رابط الزر", type: "url", placeholder: "/shop" },
      {
        key: "categoryCards",
        label: "بطاقات التصنيفات",
        type: "textarea",
        placeholder:
          "heels|من المكتب إلى العشاء|كعب مريح للحركة|ستايل يومي|/placeholders/luxury-shoes/pump-black.png|/shop?category=heels",
        helperText:
          "كل سطر: categoryId|title|subtitle|mood|image|link. إذا تركته فارغًا سيُبنى القسم تلقائيًا من التصنيفات الحالية.",
      },
    ],
  },
  newsletter: {
    label: "الاشتراك والدعوة",
    component: "newsletter",
    note: "يمكنك تخصيص نصوص الاشتراك والدعوة وحقول النموذج مباشرة من لوحة الإعدادات، والتحكم في شكل العرض وترتيب القسم.",
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "split-panel", label: "تقسيم جانبي" },
      { value: "minimal", label: "مبسط" },
      { value: "editorial-strip", label: "شريط تحريري هادئ" },
    ],
    fields: [
      {
        key: "title",
        label: "العنوان",
        type: "text",
        placeholder: "اشترك في نشرتنا الإخبارية",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "كن أول من يعلم عن أحدث العروض والمنتجات.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      { key: "buttonText", label: "نص الزر", type: "text", placeholder: "اشترك" },
      {
        key: "placeholder",
        label: "النص الإرشادي للبريد",
        type: "text",
        placeholder: "اكتبي بريدك الإلكتروني",
      },
    ],
  },
  "tiktok-feed": {
    label: "تيك توك",
    component: "tiktok-feed",
    note: "يعرض مقاطع TikTok من حساب المتجر.",
    fields: [
      {
        key: "username",
        label: "اسم المستخدم على TikTok",
        type: "text",
        placeholder: "maxp_store",
      },
      {
        key: "title",
        label: "العنوان",
        type: "text",
        placeholder: "تابعنا على TikTok",
      },
      {
        key: "count",
        label: "عدد المقاطع (اختياري)",
        type: "number",
        placeholder: "6",
      },
    ],
  },
  "hero-sidebar": {
    label: "بنر مع شريط جانبي",
    component: "hero-sidebar",
  },
  "tech-grid": {
    label: "شبكة المزايا",
    component: "tech-grid",
  },
  "story-parallax": {
    label: "قصة العلامة",
    component: "story-parallax",
    variants: [
      { value: "standard", label: "غلاف بارالاكس" },
      { value: "split-editorial", label: "تقسيم تحريري" },
    ],
    fields: [
      {
        key: "badge",
        label: "الشارة",
        type: "text",
        placeholder: "قصة الحرفة",
      },
      {
        key: "title",
        label: "العنوان",
        type: "text",
        placeholder: "عنوان قصة البراند",
      },
      {
        key: "content",
        label: "النص",
        type: "textarea",
        placeholder: "وصف مختصر يشرح الحرفة أو البراند.",
      },
      {
        key: "image",
        label: "رابط الصورة",
        type: "url",
        placeholder: "https://images.unsplash.com/...",
      },
      {
        key: "overlayOpacity",
        label: "شفافية الطبقة الداكنة",
        type: "number",
        placeholder: "0.45",
      },
      {
        key: "ctaText",
        label: "نص الرابط",
        type: "text",
        placeholder: "اقرئي القصة كاملة",
      },
      {
        key: "ctaLink",
        label: "رابط القصة",
        type: "url",
        placeholder: "/lookbook",
      },
    ],
  },
  "filters-sidebar": {
    label: "Filters Sidebar",
    component: "filters-sidebar",
    fields: [
      { key: "badge", label: "شارة العمود", type: "text", placeholder: "فلترة" },
      { key: "title", label: "عنوان العمود", type: "text", placeholder: "فلترة النتائج" },
      {
        key: "subtitle",
        label: "وصف العمود",
        type: "textarea",
        placeholder: "وجّه المستخدم لكيفية استخدام العمود الجانبي بسرعة.",
      },
      {
        key: "showSort",
        label: "إظهار الفرز",
        type: "select",
        options: [
          { label: "إظهار", value: "true" },
          { label: "إخفاء", value: "false" },
        ],
      },
      {
        key: "showCategories",
        label: "إظهار التصنيفات",
        type: "select",
        options: [
          { label: "إظهار", value: "true" },
          { label: "إخفاء", value: "false" },
        ],
      },
      {
        key: "showPriceFilter",
        label: "فلتر السعر",
        type: "select",
        options: [
          { label: "إظهار", value: "true" },
          { label: "إخفاء", value: "false" },
        ],
      },
      {
        key: "categoryStyle",
        label: "أسلوب عرض التصنيفات",
        type: "select",
        options: [
          { label: "قائمة", value: "list" },
          { label: "قائمة منسدلة", value: "dropdown" },
        ],
      },
      { key: "clearButtonText", label: "نص إعادة الضبط", type: "text", placeholder: "مسح الفلاتر" },
      { key: "showMobileLabel", label: "نص زر الموبايل", type: "text", placeholder: "إظهار الفلاتر" },
      { key: "hideMobileLabel", label: "نص إغلاق الموبايل", type: "text", placeholder: "إخفاء الفلاتر" },
      { key: "mobileTitle", label: "عنوان لوحة الموبايل", type: "text", placeholder: "لوحة التصفية" },
      {
        key: "mobileSubtitle",
        label: "وصف لوحة الموبايل",
        type: "textarea",
        placeholder: "وجّه المستخدم لما يمكنه ضبطه قبل الرجوع إلى المنتجات.",
      },
      { key: "mobileApplyText", label: "نص زر التطبيق", type: "text", placeholder: "اعرض المنتجات" },
      { key: "mobileResetText", label: "نص زر إعادة ضبط الموبايل", type: "text", placeholder: "ابدأ من جديد" },
    ],
  },
  "shop-command-bar": {
    label: "Shop Command Bar",
    component: "shop-command-bar",
    pages: ["shop"],
    variants: [
      { value: "default-discovery", label: "اكتشاف افتراضي" },
      { value: "marketplace-dense", label: "شريط كثيف" },
      { value: "minimal-toolbar", label: "شريط مبسط" },
        { value: "menu-quick-order", label: "طلب سريع للمنيو" },
        { value: "boutique-discovery", label: "دليل بوتيك هادئ" },
        { value: "fit-finder", label: "دليل المقاس والفلترة" },
        { value: "soft-sort-bar", label: "شريط ترتيب ناعم" },
        { value: "fragrance-console", label: "كونسول العطر" },
        { value: "spec-console", label: "لوحة مقارنة تقنية" },
        { value: "decision-deck", label: "غرفة قرار الشراء" },
        { value: "graceful-bar", label: "شريط Graceful (فلتر/عدد/ترتيب)" },
        { value: "occasion-planner", label: "مخطط المناسبة" },
        { value: "butcher-cut-console", label: "كونسول تقطيع جزارة Premium" },
        { value: "elessi-bag-toolbar", label: "شريط حقائب Elessi" },
        { value: "elessi-filter-deck", label: "لوحة فلاتر Elessi" },
        { value: "elessi-category-ribbon", label: "شريط أقسام Elessi" },
        { value: "elessi-spec-toolbar", label: "شريط مواصفات Elessi" },
        { value: "elessi-bike-toolbar", label: "شريط الدراجات Elessi" },
        { value: "elessi-gift-toolbar", label: "شريط هدايا Elessi" },
        { value: "elessi-organic-toolbar", label: "شريط العضوي Elessi" },
        { value: "elessi-digital-toolbar", label: "شريط الرقمية Elessi" },
        { value: "elessi-plant-toolbar", label: "شريط النباتات Elessi" },
    ],
    fields: [
      {
        key: "title",
        label: "عنوان الشريط",
        type: "text",
        placeholder: "تحكم أسرع في التصفح",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "ابحث وفلتر ورتّب المنتجات بدون مغادرة الشبكة.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "searchPlaceholder",
        label: "Placeholder البحث",
        type: "text",
        placeholder: "ابحث داخل المنتجات",
      },
      {
        key: "allCategoriesLabel",
        label: "نص كل التصنيفات",
        type: "text",
        placeholder: "كل المنتجات",
      },
      {
        key: "resultsLabel",
        label: "نص عداد النتائج",
        type: "text",
        placeholder: "منتج متاح",
      },
      {
        key: "clearButtonText",
        label: "نص زر إزالة الفلاتر",
        type: "text",
        placeholder: "إزالة الفلاتر",
      },
      {
        key: "stickyLabel",
        label: "شارة الشريط",
        type: "text",
        placeholder: "أدوات التصفح",
      },
      {
        key: "chipLimit",
        label: "عدد Chips التصنيفات",
        type: "number",
        placeholder: "6",
      },
    ],
  },
  "shop-promo-rail": {
    label: "Shop Promo Rail",
    component: "shop-promo-rail",
    pages: ["home", "shop", "collections"],
    variants: [
      { value: "trust-rail", label: "مسار ثقة" },
      { value: "campaign-rail", label: "مسار حملات" },
      { value: "stylist-rail", label: "مسار منسقة المظهر" },
    ],
    fields: [
      { key: "badge", label: "شارة القسم", type: "text", placeholder: "الثقة والخصومات" },
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "بناء الثقة أثناء الاستكشاف",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "مساحة جانبية لرسائل الثقة والتحويل.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "spotlightLabel",
        label: "شارة بطاقة العرض",
        type: "text",
        placeholder: "عرض اليوم",
      },
      {
        key: "spotlightTitle",
        label: "عنوان بطاقة الـ Spotlight",
        type: "text",
        placeholder: "خصم اليوم على المنتجات الأكثر طلبًا",
      },
      {
        key: "spotlightText",
        label: "نص بطاقة الـ Spotlight",
        type: "textarea",
        placeholder: "اكتب عرضًا فعليًا أو وعد خدمة حقيقيًا يراه العميل أثناء التصفح.",
      },
      { key: "ctaText", label: "نص الزر", type: "text", placeholder: "شاهد العروض" },
      { key: "ctaLink", label: "رابط الزر", type: "url", placeholder: "/sale" },
      {
        key: "trustItems",
        label: "بطاقات الثقة",
        type: "textarea",
        placeholder: "شحن سريع|داخل مصر خلال 48 ساعة\nاستبدال أسهل|سياسات أوضح بعد الشراء",
        helperText: "كل سطر: title|description",
      },
      {
        key: "highlights",
        label: "بطاقات الـ Highlights",
        type: "textarea",
        placeholder: "خصم اليوم|15%\nالشحن المجاني|750+ ج.م",
        helperText: "كل سطر: label|value",
      },
    ],
  },
  "product-grid": {
    label: "شبكة المنتجات",
    component: "product-grid",
    variants: STOREFRONT_PRODUCT_GRID_VARIANTS,
    fields: [
      { key: "title", label: "عنوان الشبكة", type: "text", placeholder: "All Products" },
      { key: "limit", label: "العدد في الصفحة", type: "number", placeholder: "12" },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "saleOnly",
        label: "منتجات مخفضة فقط",
        type: "select",
        options: [
          { label: "لا", value: "false" },
          { label: "نعم", value: "true" },
        ],
      },
    ],
  },
  "product-gallery": {
    label: "Product Gallery",
    component: "product-gallery",
    pages: ["pdp"],
    variants: [
      { value: "standard", label: "عرض أساسي" },
      { value: "grid", label: "شبكة صور" },
      { value: "stacked", label: "عرض رأسي" },
      { value: "masonry", label: "موزاييك" },
      { value: "neon-showcase", label: "عرض نيون (Cyber Gear)" },
      { value: "mirror-carousel", label: "مراية المنتج" },
      { value: "atelier-editorial-stage", label: "مسرح تحريري مفتوح" },
      { value: "boutique-portrait-stage", label: "مسرح بوتيك بورتريه" },
      { value: "fashion-counter-stage", label: "مسرح عداد الأزياء" },
      { value: "command-stage", label: "مسرح القرار التقني" },
      { value: "elessi-bag-gallery", label: "معرض حقائب Elessi" },
      { value: "elessi-showroom", label: "صالة عرض Elessi" },
      { value: "elessi-organic-gallery", label: "معرض العضوي Elessi" },
      { value: "elessi-digital-gallery", label: "معرض الرقمية Elessi" },
      { value: "elessi-mosaic-stage", label: "مسرح موزاييك Elessi" },
      { value: "elessi-detail-column", label: "عمود التفاصيل Elessi" },
      { value: "elessi-bike-gallery", label: "معرض الدراجات Elessi" },
      { value: "elessi-plant-gallery", label: "معرض النباتات Elessi" },
    ],
  },
  "product-info": {
    label: "Product Info",
    component: "product-info",
    pages: ["pdp"],
    variants: [
      { value: "standard", label: "Standard" },
      { value: "accordion", label: "Accordion" },
      { value: "specs-grid", label: "Specs Grid" },
      { value: "command-specs", label: "Command Specs" },
      { value: "bento-specs", label: "Bento Specs" },
      { value: "gear-loadout", label: "Gear Loadout (Gaming)" },
      { value: "playful-story", label: "كتاب قصص (أطفال)" },
      { value: "style-ledger", label: "مذكرة الإطلالة" },
      { value: "atelier-buybox", label: "شراء تحريري مفتوح" },
      { value: "boutique-ledger", label: "دفتر بوتيك هادئ" },
      { value: "utility-rail", label: "شريط الخدمات التجاري" },
      { value: "fashion-direct-buybox", label: "صندوق شراء أزياء مباشر" },
      { value: "scent-brief", label: "نبذة العطر" },
      { value: "elessi-bag-buybox", label: "شراء الحقائب Elessi" },
      { value: "elessi-buybox", label: "صندوق شراء Elessi" },
      { value: "elessi-spec-buybox", label: "شراء المواصفات Elessi" },
      { value: "elessi-garage-buybox", label: "شراء الجراج Elessi" },
      { value: "elessi-digital-buybox", label: "شراء الرقمية Elessi" },
      { value: "elessi-bike-buybox", label: "شراء الدراجات Elessi" },
      { value: "elessi-gift-buybox", label: "شراء الهدايا Elessi" },
      { value: "elessi-pet-buybox", label: "شراء الحيوانات Elessi" },
      { value: "elessi-watch-buybox", label: "شراء الساعات Elessi" },
      { value: "elessi-care-buybox", label: "شراء العناية Elessi" },
      { value: "elessi-organic-buybox", label: "شراء العضوي Elessi" },
      { value: "elessi-plant-buybox", label: "شراء النباتات Elessi" },
    ],
    fields: [
      {
        key: "addToCartText",
        label: "نص زر الإضافة للسلة",
        type: "text",
        placeholder: "Add to Cart",
      },
      {
        key: "descriptionTitle",
        label: "عنوان الوصف",
        type: "text",
        placeholder: "Description",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "shippingTitle",
        label: "عنوان الشحن والإرجاع",
        type: "text",
        placeholder: "Shipping & Returns",
      },
      {
        key: "shippingText",
        label: "نص الشحن والإرجاع",
        type: "textarea",
        placeholder: "رسالة قصيرة عن الشحن والإرجاع.",
      },
      {
        key: "shippingInteraction",
        label: "طريقة عرض الشحن والإرجاع",
        type: "select",
        options: [
          { label: "Accordion", value: "accordion" },
          { label: "Modal", value: "modal" },
        ],
      },
      {
        key: "shippingTriggerText",
        label: "نص مختصر قبل فتح النافذة",
        type: "textarea",
        placeholder: "اعرف السياسة قبل الدفع وخيارات الاستبدال بعد الاستلام.",
      },
      {
        key: "shippingModalTitle",
        label: "عنوان نافذة الشحن والإرجاع",
        type: "text",
        placeholder: "تفاصيل الشحن والاستبدال",
      },
      {
        key: "showGuarantees",
        label: "إظهار قسم الضمانات",
        type: "select",
        options: [
          { label: "نعم", value: "true" },
          { label: "لا", value: "false" },
        ],
      },
      {
        key: "guaranteesTitle",
        label: "عنوان الضمانات",
        type: "text",
        placeholder: "Our Guarantees",
      },
      {
        key: "guaranteesSubtitle",
        label: "Guarantees description",
        type: "textarea",
        placeholder: "Secure payment methods and reassurance messages connected to your store policy.",
      },
      {
        key: "guaranteeItems",
        label: "Guarantee items",
        type: "textarea",
        placeholder: "Secure checkout, Visa & Mastercard, Cash on delivery, Easy returns",
        helperText: "Use commas or new lines.",
      },
      {
        key: "guaranteeStyle",
        label: "Guarantee style",
        type: "select",
        options: [
          { value: "strip", label: "Strip" },
          { value: "grid", label: "Grid" },
          { value: "minimal", label: "Minimal" },
        ],
      },
      {
        key: "sizeGuideText",
        label: "نص رابط المقاسات",
        type: "text",
        placeholder: "دليل المقاسات",
      },
      {
        key: "sizeGuideLayout",
        label: "شكل إظهار دليل المقاسات",
        type: "select",
        options: [
          { label: "Panel", value: "panel" },
          { label: "Compact", value: "compact" },
        ],
      },
      {
        key: "sizeGuideInteraction",
        label: "طريقة عرض دليل المقاسات",
        type: "select",
        options: [
          { label: "Inline", value: "inline" },
          { label: "Modal", value: "modal" },
        ],
      },
      {
        key: "sizeGuideModalTitle",
        label: "عنوان نافذة المقاسات",
        type: "text",
        placeholder: "اختيار المقاس",
      },
      {
        key: "sizeGuideLink",
        label: "رابط دليل المقاسات",
        type: "url",
        placeholder: "/size-guide",
      },
      {
        key: "fitNote",
        label: "ملاحظة المقاس",
        type: "textarea",
        placeholder: "إذا كنتِ بين مقاسين فاختاري الأكبر.",
      },
    ],
  },
  "pdp-checkout": {
    label: "شيك أوت داخل صفحة المنتج",
    component: "pdp-checkout",
    pages: ["pdp"],
    note: "يعرض فورم طلب سريع مخصص داخل صفحة المنتج مع حقول مستقلة ومسار طلب مباشر من نفس الصفحة.",
    fields: [
      {
        key: "badgeText",
        label: "شارة القسم",
        type: "text",
        placeholder: "شيك أوت سريع داخل الصفحة",
      },
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "إتمام الطلب من صفحة المنتج",
      },
      {
        key: "subtitle",
        label: "وصف القسم",
        type: "textarea",
        placeholder: "نموذج دفع مدمج يعيد استخدام نفس منطق الطلب الحالي.",
      },
      {
        key: "emptyStateText",
        label: "رسالة قبل إضافة المنتج",
        type: "textarea",
        placeholder: "اختَر المتغير والكمية ثم أضف المنتج إلى السلة لتفعيل الشيك أوت هنا.",
      },
      {
        key: "readyStateText",
        label: "رسالة الجاهزية",
        type: "textarea",
        placeholder: "المنتج الحالي موجود في السلة ويمكنك الآن إكمال الطلب من نفس الصفحة.",
      },
      {
        key: "foreignCartStateText",
        label: "رسالة وجود سلة حالية",
        type: "textarea",
        placeholder: "يوجد محتوى داخل السلة حاليًا ويمكنك إكمال الطلب من هنا أو إضافة المنتج الحالي أولًا.",
      },
      {
        key: "scrollToBuyBoxText",
        label: "نص زر الانتقال لصندوق الشراء",
        type: "text",
        placeholder: "اذهب إلى صندوق الشراء",
      },
      {
        key: "showCheckoutText",
        label: "نص زر إظهار الشيك أوت",
        type: "text",
        placeholder: "إظهار الشيك أوت",
      },
      {
        key: "hideCheckoutText",
        label: "نص زر إخفاء الشيك أوت",
        type: "text",
        placeholder: "إخفاء الشيك أوت",
      },
      {
        key: "fullCheckoutLinkText",
        label: "نص رابط صفحة الدفع الكاملة",
        type: "text",
        placeholder: "فتح صفحة الدفع الكاملة",
      },
      {
        key: "formVariant",
        label: "نسخة نموذج البيانات",
        type: "select",
        options: [
          { value: "standard", label: "Standard" },
          { value: "split", label: "Split Cards" },
          { value: "compact", label: "Compact" },
          { value: "men-shoes-eg", label: "أحذية رجالي مصر" },
          { value: "safe-adventure", label: "مسار مغامرة (أطفال)" },
        ],
      },
      {
        key: "placement",
        label: "مكان النموذج داخل صفحة المنتج",
        type: "select",
        options: [
          { value: "before-description", label: "قبل تفاصيل المنتج" },
          { value: "after-description", label: "بعد تفاصيل المنتج" },
        ],
      },
      {
        key: "surfaceMode",
        label: "أسلوب الدمج مع صندوق الشراء",
        type: "select",
        options: [
          { value: "standalone", label: "كتلة مستقلة" },
          { value: "merged-buybox", label: "مكتلة مع المتغيرات والشراء" },
        ],
      },
      {
        key: "paymentVariant",
        label: "نسخة الدفع",
        type: "select",
        options: [
          { value: "standard", label: "Standard" },
          { value: "cards", label: "Cards" },
          { value: "minimal", label: "Minimal" },
        ],
      },
    ],
  },
  "conversion-stack": {
    label: "Conversion Stack",
    component: "conversion-stack",
    note: "يفضل استخدام أدوات التحويل المنفصلة في القوالب الجديدة، ويُستخدم هذا القسم فقط عندما يكون التجميع مقصودًا.",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "countdownLabel",
        label: "نص العداد",
        type: "text",
        placeholder: "Offer ends in",
      },
      {
        key: "countdownStyle",
        label: "نمط العداد",
        type: "select",
        options: [
          { value: "timer", label: "عداد تصاعدي (Timer)" },
          { value: "split", label: "عداد مقسم (Split)" },
          { value: "minimal", label: "بسيط (Minimal)" },
          { value: "pill", label: "كبسولة (Urgency Pill)" },
        ],
      },
      {
        key: "preOrderLabel",
        label: "نص الطلب المسبق",
        type: "text",
        placeholder: "Pre-order now",
      },
      {
        key: "preOrderStyle",
        label: "نمط الطلب المسبق",
        type: "select",
        options: [
          { value: "pulse", label: "نبض (Pulse)" },
          { value: "ticker", label: "شريط (Ticker)" },
          { value: "pill", label: "كبسولة (Pill)" },
        ],
      },
      {
        key: "lowStockLabel",
        label: "شارة المخزون المنخفض",
        type: "text",
        placeholder: "Low Stock",
      },
      {
        key: "lowStockMessage",
        label: "رسالة المخزون المنخفض",
        type: "text",
        placeholder: "Only {{count}} left",
        helperText: "يدعم {{count}}.",
      },
      {
        key: "lowStockStyle",
        label: "نمط المخزون المنخفض",
        type: "select",
        options: [
          { value: "alert", label: "Alert" },
          { value: "meter", label: "Meter" },
          { value: "minimal", label: "Minimal" },
        ],
      },
      {
        key: "estimatedDeliveryLabel",
        label: "نص التوصيل المتوقع",
        type: "text",
        placeholder: "Estimated delivery",
      },
      {
        key: "estimatedDeliveryStyle",
        label: "نمط التوصيل المتوقع",
        type: "select",
        options: [
          { value: "card", label: "Card" },
          { value: "timeline", label: "Timeline" },
          { value: "pill", label: "Pill" },
        ],
      },
      {
        key: "fakeVisitorMessage",
        label: "رسالة عدد المشاهدين",
        type: "text",
        placeholder: "{{count}} people are viewing this right now",
        helperText: "يدعم {{count}}.",
      },
      {
        key: "fakeVisitorStyle",
        label: "نمط عدد المشاهدين",
        type: "select",
        options: [
          { value: "pulse", label: "Pulse" },
          { value: "ticker", label: "Ticker" },
          { value: "minimal", label: "Minimal" },
        ],
      },
      {
        key: "soldCounterMessage",
        label: "رسالة المبيعات الحديثة",
        type: "text",
        placeholder: "Sold {{count}} times",
        helperText: "يدعم {{count}}.",
      },
      {
        key: "soldCounterStyle",
        label: "نمط المبيعات الحديثة",
        type: "select",
        options: [
          { value: "spotlight", label: "Spotlight" },
          { value: "badge", label: "Badge" },
          { value: "minimal", label: "Minimal" },
        ],
      },
      {
        key: "purchaseFomoMessage",
        label: "رسالة نية الشراء",
        type: "text",
        placeholder: "{{count}} shoppers showed purchase intent recently",
        helperText: "يدعم {{count}}.",
      },
      {
        key: "purchaseFomoStyle",
        label: "نمط نية الشراء",
        type: "select",
        options: [
          { value: "alert", label: "Alert" },
          { value: "timeline", label: "Timeline" },
          { value: "minimal", label: "Minimal" },
        ],
      },
      {
        key: "backInStockStyle",
        label: "نمط العودة للمخزون",
        type: "select",
        options: [
          { value: "panel", label: "Panel" },
          { value: "inline", label: "Inline" },
          { value: "accent", label: "Accent" },
        ],
      },
      {
        key: "trustedBadgeTitle",
        label: "عنوان شارات الثقة",
        type: "text",
        placeholder: "Trusted checkout",
      },
      {
        key: "trustedBadgeSubtitle",
        label: "وصف شارات الثقة",
        type: "textarea",
        placeholder:
          "Secure payment methods and reassurance messages connected to your store policy.",
      },
      {
        key: "trustedBadgeItems",
        label: "عناصر شارات الثقة",
        type: "textarea",
        placeholder:
          "Secure checkout, Visa & Mastercard, Cash on delivery, Easy returns",
        helperText: "استخدم فاصلة أو سطرًا جديدًا بين كل عنصر.",
      },
      {
        key: "trustedBadgeStyle",
        label: "نمط شارات الثقة",
        type: "select",
        options: [
          { value: "strip", label: "شريط (Strip)" },
          { value: "grid", label: "شبكة (Grid)" },
          { value: "minimal", label: "بسيطة (Minimal)" },
          { value: "perfume-minimal", label: "عطرية هادئة" },
          { value: "glass", label: "زجاجية (Glass)" },
        ],
      },
      {
        key: "showPulseRow",
        label: "إظهار صف النبض (Social Proof)",
        type: "select",
        options: [
          { label: "نعم", value: "true" },
          { label: "لا", value: "false" },
        ],
      },
      {
        key: "showUrgencyTicker",
        label: "إظهار شريط الطوارئ (Urgency)",
        type: "select",
        options: [
          { label: "نعم", value: "true" },
          { label: "لا", value: "false" },
        ],
      },
      {
        key: "showConfidenceGrid",
        label: "إظهار شبكة الثقة (Trust)",
        type: "select",
        options: [
          { label: "نعم", value: "true" },
          { label: "لا", value: "false" },
        ],
      },
    ]),
  },
  countdown: {
    label: "Countdown",
    component: "conversion-stack",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "countdownLabel",
        label: "نص العداد",
        type: "text",
        placeholder: "Offer ends in",
      },
      {
        key: "countdownStyle",
        label: "نمط العداد",
        type: "select",
        options: [
          { value: "timer", label: "عداد تصاعدي (Timer)" },
          { value: "split", label: "عداد مقسم (Split)" },
          { value: "minimal", label: "بسيط (Minimal)" },
          { value: "pill", label: "كبسولة (Urgency Pill)" },
        ],
      },
    ]),
  },
  "low-stock": {
    label: "Low Stock",
    component: "conversion-stack",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "lowStockLabel",
        label: "شارة المخزون المنخفض",
        type: "text",
        placeholder: "Low Stock",
      },
      {
        key: "lowStockMessage",
        label: "رسالة المخزون المنخفض",
        type: "text",
        placeholder: "Only {{count}} left",
        helperText: "يدعم {{count}}.",
      },
      {
        key: "lowStockStyle",
        label: "نمط المخزون المنخفض",
        type: "select",
        options: [
          { value: "alert", label: "Alert" },
          { value: "meter", label: "Meter" },
          { value: "minimal", label: "Minimal" },
        ],
      },
    ]),
  },
  "delivery-proof": {
    label: "Delivery Proof",
    component: "conversion-stack",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "estimatedDeliveryLabel",
        label: "نص التوصيل المتوقع",
        type: "text",
        placeholder: "Estimated delivery",
      },
      {
        key: "estimatedDeliveryStyle",
        label: "نمط التوصيل المتوقع",
        type: "select",
        options: [
          { value: "card", label: "Card" },
          { value: "timeline", label: "Timeline" },
          { value: "pill", label: "Pill" },
        ],
      },
    ]),
  },
  "viewer-counter": {
    label: "Viewer Counter",
    component: "conversion-stack",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "fakeVisitorMessage",
        label: "رسالة عدد المشاهدين",
        type: "text",
        placeholder: "{{count}} people are viewing this right now",
        helperText: "يدعم {{count}}.",
      },
      {
        key: "fakeVisitorStyle",
        label: "نمط عدد المشاهدين",
        type: "select",
        options: [
          { value: "pulse", label: "Pulse" },
          { value: "ticker", label: "Ticker" },
          { value: "minimal", label: "Minimal" },
        ],
      },
    ]),
  },
  "sold-counter": {
    label: "Sold Counter",
    component: "conversion-stack",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "soldCounterMessage",
        label: "رسالة المبيعات الحديثة",
        type: "text",
        placeholder: "Sold {{count}} times",
        helperText: "يدعم {{count}}.",
      },
      {
        key: "soldCounterStyle",
        label: "نمط المبيعات الحديثة",
        type: "select",
        options: [
          { value: "spotlight", label: "Spotlight" },
          { value: "badge", label: "Badge" },
          { value: "minimal", label: "Minimal" },
        ],
      },
    ]),
  },
  "purchase-fomo": {
    label: "Purchase FOMO",
    component: "conversion-stack",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "purchaseFomoMessage",
        label: "رسالة نية الشراء",
        type: "text",
        placeholder: "{{count}} shoppers showed purchase intent recently",
        helperText: "يدعم {{count}}.",
      },
      {
        key: "purchaseFomoStyle",
        label: "نمط نية الشراء",
        type: "select",
        options: [
          { value: "alert", label: "Alert" },
          { value: "timeline", label: "Timeline" },
          { value: "minimal", label: "Minimal" },
        ],
      },
    ]),
  },
  "pre-order": {
    label: "Pre-order",
    component: "conversion-stack",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "preOrderLabel",
        label: "نص الطلب المسبق",
        type: "text",
        placeholder: "Pre-order now",
      },
      {
        key: "preOrderStyle",
        label: "نمط الطلب المسبق",
        type: "select",
        options: [
          { value: "pulse", label: "نبض (Pulse)" },
          { value: "ticker", label: "شريط (Ticker)" },
          { value: "pill", label: "كبسولة (Pill)" },
        ],
      },
    ]),
  },
  "back-in-stock": {
    label: "Back in Stock",
    component: "conversion-stack",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "backInStockTitle",
        label: "عنوان العودة للمخزون",
        type: "text",
        placeholder: "Notify me when it's back",
      },
      {
        key: "backInStockDescription",
        label: "وصف العودة للمخزون",
        type: "textarea",
        placeholder:
          "Leave your name plus email or phone and we'll let you know once inventory returns.",
      },
      {
        key: "backInStockSuccessMessage",
        label: "رسالة نجاح التسجيل",
        type: "textarea",
        placeholder:
          "You're on the waitlist. We'll let you know when this product is back in stock.",
      },
      {
        key: "backInStockStyle",
        label: "نمط العودة للمخزون",
        type: "select",
        options: [
          { value: "panel", label: "Panel" },
          { value: "inline", label: "Inline" },
          { value: "accent", label: "Accent" },
        ],
      },
    ]),
  },
  "trusted-badges": {
    label: "Trusted Badges",
    component: "conversion-stack",
    pages: ["home", "shop", "pdp", "cart", "checkout"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([
      {
        key: "trustedBadgeTitle",
        label: "عنوان شارات الثقة",
        type: "text",
        placeholder: "Trusted checkout",
      },
      {
        key: "trustedBadgeSubtitle",
        label: "وصف شارات الثقة",
        type: "textarea",
        placeholder:
          "Secure payment methods and reassurance messages connected to your store policy.",
      },
      {
        key: "trustedBadgeItems",
        label: "عناصر شارات الثقة",
        type: "textarea",
        placeholder:
          "Secure checkout, Visa & Mastercard, Cash on delivery, Easy returns",
        helperText: "استخدم فاصلة أو سطرًا جديدًا بين كل عنصر.",
      },
      {
        key: "trustedBadgeStyle",
        label: "نمط شارات الثقة",
        type: "select",
        options: [
          { value: "strip", label: "شريط (Strip)" },
          { value: "grid", label: "شبكة (Grid)" },
          { value: "minimal", label: "بسيطة (Minimal)" },
          { value: "perfume-minimal", label: "عطرية هادئة" },
          { value: "glass", label: "زجاجية (Glass)" },
        ],
      },
    ]),
  },
  "bulk-savings": {
    label: "Bulk Savings",
    component: "conversion-stack",
    pages: ["pdp"],
    variants: STOREFRONT_CONVERSION_SECTION_VARIANTS,
    fields: buildConversionSectionFields([]),
  },
  "quantity-offers": {
    label: "Quantity Offers",
    component: "quantity-offers",
    note: "يعتمد على تفعيل تطبيق Quantity Offers Pro ووجود عروض كميات فعلية على المنتج.",
    pages: ["pdp"],
    variants: STOREFRONT_QUANTITY_OFFERS_VARIANTS,
    fields: [
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "عروض الكميات",
      },
      {
        key: "subtitle",
        label: "وصف القسم",
        type: "textarea",
        placeholder: "اختر العرض المناسب ثم حدّد اللون أو المقاس لكل قطعة.",
      },
      {
        key: "placement",
        label: "مكان الظهور داخل صفحة المنتج",
        type: "select",
        options: [
          { value: "companion", label: "كتلة مستقلة بعد معلومات المنتج" },
          { value: "inline-buybox", label: "داخل كتلة الحسم قبل الفورم" },
        ],
      },
      {
        key: "decisionMode",
        label: "دور عروض الكميات في الحسم",
        type: "select",
        options: [
          { value: "supporting", label: "مساند" },
          { value: "primary", label: "القرار الأساسي" },
        ],
      },
      {
        key: "addOfferLabel",
        label: "نص زر الإضافة",
        type: "text",
        placeholder: "أضف العرض إلى السلة",
      },
      {
        key: "copyFirstSelectionLabel",
        label: "نص نسخ الاختيار الأول",
        type: "text",
        placeholder: "نسخ اختيار القطعة الأولى",
      },
      {
        key: "freeShippingLabel",
        label: "شارة الشحن المجاني",
        type: "text",
        placeholder: "شحن مجاني",
      },
      {
        key: "bestValueLabel",
        label: "شارة الأفضل توفيرًا",
        type: "text",
        placeholder: "الأكثر توفيرًا",
      },
    ],
  },
  "size-guide": {
    label: "Size Guide",
    component: "size-guide",
    pages: ["pdp", "size-guide"],
    variants: [
      { value: "detailed", label: "Detailed" },
      { value: "compact", label: "Compact" },
      { value: "quick", label: "Quick (جدول سريع)" },
    ],
    fields: [
      { key: "badge", label: "شارة القسم", type: "text", placeholder: "دليل المقاسات" },
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "اعرف المقاس المناسب قبل الشراء",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "دليل سريع لاختيار المقاس...",
      },
      {
        key: "note",
        label: "ملاحظة المقاس",
        type: "textarea",
        placeholder: "إذا كنت بين مقاسين اختر الأكبر.",
      },
      { key: "ctaText", label: "نص الزر", type: "text", placeholder: "ابدأ التسوق" },
      { key: "ctaLink", label: "رابط الزر", type: "url", placeholder: "/shop" },
      {
        key: "guideImage",
        label: "صورة توضيحية لطريقة القياس",
        type: "url",
        placeholder: "/assets/size-guide-diagram.svg",
      },
      {
        key: "measurementSteps",
        label: "خطوات القياس",
        type: "textarea",
        placeholder:
          "قِس طول القدم في نهاية اليوم|ضع القدم على ورقة، حدد الكعب وأطول إصبع، ثم احسب المسافة بالسنتيمتر.\nقارن القياس بجدول المقاسات|اختر المقاس الأقرب لطول القدم الفعلي.\nبين مقاسين؟ اختر الأكبر|إذا كان القياس بين رقمين اختر المقاس الأكبر.",
        helperText: "كل سطر: title|description",
      },
      {
        key: "fitTips",
        label: "نصائح اختيار المقاس",
        type: "textarea",
        placeholder:
          "الموديلات المدببة قد تحتاج نصف مقاس أكبر.\nالجوارب السميكة تحتاج مساحة إضافية.\nلو المقاس مضبوط صباحاً وضيّق مساءً، اختر الأكبر.",
        helperText: "كل سطر نصيحة مستقلة.",
      },
      {
        key: "guideRows",
        label: "جدول المقاسات الديناميكي",
        type: "textarea",
        placeholder:
          "default|36|3|5|22.5\ncategory:heels|36|3|5|22.2\nproduct:crystal-heel|36|3|5|22.0",
        helperText:
          "كل سطر: target|EU|UK|US|CM. target يدعم default أو category:<id> أو product:<slug>.",
      },
      {
        key: "guideOverrides",
        label: "عناوين وملاحظات مخصصة",
        type: "textarea",
        placeholder:
          "default|دليل المقاسات|اختيار سريع للمقاس|اختر الأكبر لو كنت بين مقاسين",
        helperText:
          "كل سطر: target|title|subtitle|note بنفس targets الخاصة بجدول المقاسات.",
      },
    ],
  },
  "bought-together": {
    label: "Bought Together",
    component: "bought-together",
    pages: ["pdp"],
    variants: [
      { value: "stacked", label: "Stacked" },
      { value: "compact", label: "Compact" },
      { value: "editorial", label: "Editorial" },
      { value: "complete-look", label: "كملي الإطلالة" },
      { value: "pairing-rail", label: "شريط التنسيق" },
      { value: "gift-pairings", label: "تنسيقات الهدية" },
    ],
    fields: [
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "Frequently bought together",
      },
      {
        key: "subtitle",
        label: "وصف القسم",
        type: "textarea",
        placeholder: "Curated add-ons that pair naturally with this product.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "limit",
        label: "عدد المنتجات المقترحة",
        type: "number",
        placeholder: "3",
      },
      {
        key: "addBundleText",
        label: "نص زر إضافة الباقة",
        type: "text",
        placeholder: "Add selected bundle",
      },
      {
        key: "totalLabel",
        label: "عنوان الإجمالي",
        type: "text",
        placeholder: "Bundle total",
      },
      {
        key: "currentProductLabel",
        label: "شارة المنتج الحالي",
        type: "text",
        placeholder: "Current product",
      },
      {
        key: "recommendationLabel",
        label: "شارة المنتج المقترح",
        type: "text",
        placeholder: "Recommended add-on",
      },
      {
        key: "quickAddText",
        label: "نص الإضافة السريعة",
        type: "text",
        placeholder: "Quick add",
      },
      {
        key: "chooseOptionsText",
        label: "نص اختيار الخيارات",
        type: "text",
        placeholder: "Choose options",
      },
      {
        key: "bundleVariantHint",
        label: "رسالة المنتجات المتغيرة",
        type: "textarea",
        placeholder: "Products with variants still need to be configured from their own product page.",
      },
    ],
  },
  reviews: {
    label: "Reviews",
    component: "reviews",
    pages: ["home", "pdp", "shop"],
    variants: [
      { value: "standard", label: "Standard" },
      { value: "editorial", label: "Editorial" },
      { value: "compact", label: "Compact" },
      { value: "voice-notes", label: "ملاحظات المشترِيات" },
      { value: "scent-notes", label: "ملاحظات العطر" },
      { value: "command-proof", label: "ثقة ما بعد الشراء" },
      { value: "elessi-proof-wall", label: "جدار الثقة Elessi" },
      { value: "elessi-story-grid", label: "شبكة القصص Elessi" },
      { value: "elessi-trust-pile", label: "كومة الثقة Elessi" },
      { value: "elessi-plant-reviews", label: "مراجعات النباتات Elessi" },
    ],
    fields: [
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "Customer Reviews",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "writeReviewText",
        label: "نص زر إضافة مراجعة",
        type: "text",
        placeholder: "Write a Review",
      },
      {
        key: "emptyText",
        label: "نص الحالة الفارغة",
        type: "textarea",
        placeholder: "There are no reviews yet. Be the first to review this product.",
      },
      {
        key: "verifiedLabel",
        label: "نص العميل الموثق",
        type: "text",
        placeholder: "Verified buyer",
      },
      {
        key: "reviewsLabel",
        label: "نص عدد المراجعات",
        type: "text",
        placeholder: "reviews",
      },
      {
        key: "outOfText",
        label: "نص التقييم",
        type: "text",
        placeholder: "out of 5",
      },
      {
        key: "mediaTitle",
        label: "عنوان الميديا",
        type: "text",
        placeholder: "Customer photos & videos",
      },
      {
        key: "mediaDescription",
        label: "وصف الميديا",
        type: "textarea",
        placeholder: "Rendered from review media when the UGC app is enabled.",
      },
      {
        key: "listTitle",
        label: "عنوان قائمة المراجعات",
        type: "text",
        placeholder: "Review list",
      },
      {
        key: "showMediaFeed",
        label: "إظهار معرض الميديا",
        type: "select",
        options: [
          { value: "true", label: "نعم" },
          { value: "false", label: "لا" },
        ],
      },
      {
        key: "reviewLimit",
        label: "عدد المراجعات المعروضة",
        type: "number",
        placeholder: "6",
      },
      {
        key: "mobileReviewLimit",
        label: "عدد المراجعات على الموبايل",
        type: "number",
        placeholder: "2",
      },
      {
        key: "galleryStyle",
        label: "شكل معرض الميديا",
        type: "select",
        options: [
          { value: "mosaic", label: "Mosaic" },
          { value: "carousel", label: "Carousel" },
          { value: "stack", label: "Stack" },
        ],
      },
      {
        key: "cardStyle",
        label: "شكل بطاقات المراجعات",
        type: "select",
        options: [
          { value: "elevated", label: "Elevated" },
          { value: "minimal", label: "Minimal" },
          { value: "editorial", label: "Editorial" },
        ],
      },
    ],
  },
  "related-products": {
    label: "Related Products",
    component: "related-products",
    pages: ["pdp"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "graceful-related", label: "كروت Graceful" },
      { value: "compact", label: "مضغوط" },
      { value: "editorial", label: "تحريري" },
      { value: "glass", label: "زجاجي" },
      { value: "list", label: "قائمة" },
      { value: "luxury", label: "فاخر" },
      { value: "minimal", label: "مبسط" },
      { value: "playful", label: "مرح" },
      { value: "overlay", label: "تراكبي" },
      { value: "fastly-offer-wall", label: "شبكة عروض Fastly" },
      { value: "closet-pairings", label: "تنسيقات الدولاب" },
      { value: "scent-circle", label: "دائرة الروائح" },
      { value: "command-alternatives", label: "بدائل القرار التقني" },
      { value: "elessi-merch-rail", label: "شريط بيع Elessi" },
      { value: "elessi-complete-set", label: "طقم كامل Elessi" },
      { value: "elessi-discovery-strip", label: "شريط اكتشاف Elessi" },
      { value: "elessi-organic-related", label: "منتجات عضوية مكملة Elessi" },
      { value: "elessi-digital-related", label: "منتجات رقمية مكملة Elessi" },
      { value: "elessi-bike-related", label: "منتجات دراجات مكملة Elessi" },
      { value: "elessi-plant-related", label: "منتجات نباتات مكملة Elessi" },
    ],
    fields: [
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "منتجات قد تعجبك",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "اختيارات إضافية قد تكمل نفس اللوك.",
      },
      { key: "limit", label: "عدد المنتجات", type: "number", placeholder: "4" },
      {
        key: "mobileLimit",
        label: "عدد المنتجات على الموبايل",
        type: "number",
        placeholder: "2",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
    ],
  },
  "cart-items": {
    label: "قائمة السلة",
    component: "cart-items",
    pages: ["cart", "checkout"],
    variants: [
      { value: "standard", label: "Standard" },
      { value: "editorial", label: "Editorial" },
      { value: "compact", label: "Compact" },
      { value: "market-basket", label: "سلة سوق دافئة" },
      { value: "nature-cart", label: "سلة طبيعية هادئة" },
      { value: "playful-basket", label: "سلة ألعاب (أطفال)" },
      { value: "command-cart", label: "مراجعة تقنية" },
      { value: "wardrobe-cart", label: "مراجعة الدولاب" },
    ],
    fields: [
      { key: "title", label: "عنوان السلة", type: "text", placeholder: "Your Cart" },
      {
        key: "subtitle",
        label: "وصف السلة",
        type: "textarea",
        placeholder: "Review your selected products before moving to checkout.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "emptyTitle",
        label: "عنوان السلة الفارغة",
        type: "text",
        placeholder: "Your cart is empty",
      },
      {
        key: "emptyText",
        label: "نص السلة الفارغة",
        type: "textarea",
        placeholder: "Your cart is currently empty.",
      },
      {
        key: "continueShoppingText",
        label: "نص زر متابعة التسوق",
        type: "text",
        placeholder: "Continue Shopping",
      },
      {
        key: "productLabel",
        label: "نص عمود المنتج",
        type: "text",
        placeholder: "Product",
      },
      {
        key: "priceLabel",
        label: "نص عمود السعر",
        type: "text",
        placeholder: "Price",
      },
      {
        key: "quantityLabel",
        label: "نص عمود الكمية",
        type: "text",
        placeholder: "Quantity",
      },
      {
        key: "totalLabel",
        label: "نص عمود الإجمالي",
        type: "text",
        placeholder: "Total",
      },
      {
        key: "removeLabel",
        label: "نص أزرار الحذف",
        type: "text",
        placeholder: "Remove item",
      },
    ],
  },
  "order-summary": {
    label: "ملخص الطلب",
    component: "order-summary",
    pages: ["cart", "checkout"],
    variants: [
      { value: "standard", label: "Standard" },
      { value: "highlighted", label: "Highlighted" },
      { value: "minimal", label: "Minimal" },
      { value: "market-summary", label: "ملخص سوق دافئ" },
      { value: "nature-summary", label: "ملخص طبيعي هادئ" },
      { value: "command-summary", label: "ملخص تقني" },
      { value: "boutique-summary", label: "ملخص بوتيك هادئ" },
      { value: "fitting-room-summary", label: "Fitting room app summary" },
    ],
    fields: [
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "Order Summary",
      },
      {
        key: "subtitle",
        label: "وصف القسم",
        type: "textarea",
        placeholder: "A conversion-focused summary with coupon, trust, and shipping nudges.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "shippingHelpText",
        label: "رسالة ملاحظة الشحن",
        type: "textarea",
        placeholder:
          "Shipping is calculated after you enter your governorate during checkout.",
      },
      {
        key: "couponPlaceholder",
        label: "Placeholder الكوبون",
        type: "text",
        placeholder: "Coupon code",
      },
      {
        key: "couponButtonText",
        label: "نص زر تطبيق الكوبون",
        type: "text",
        placeholder: "Apply",
      },
      {
        key: "checkoutButtonText",
        label: "نص زر إكمال الشراء",
        type: "text",
        placeholder: "Proceed to Checkout",
      },
      {
        key: "subtotalLabel",
        label: "نص المجموع الفرعي",
        type: "text",
        placeholder: "Subtotal",
      },
      {
        key: "shippingLabel",
        label: "نص الشحن",
        type: "text",
        placeholder: "Shipping",
      },
      {
        key: "shippingValueText",
        label: "قيمة الشحن الافتراضية",
        type: "text",
        placeholder: "Calculated at checkout",
      },
      {
        key: "totalLabel",
        label: "نص الإجمالي",
        type: "text",
        placeholder: "Estimated total",
      },
      {
        key: "secureCheckoutText",
        label: "نص الثقة الأول",
        type: "text",
        placeholder: "Secure checkout",
      },
      {
        key: "returnsText",
        label: "نص الثقة الثاني",
        type: "text",
        placeholder: "Easy returns",
      },
      {
        key: "freeShippingTitle",
        label: "رسالة تقدم الشحن المجاني",
        type: "textarea",
        placeholder: "Add {{remaining}} to unlock free shipping",
      },
      {
        key: "freeShippingReachedText",
        label: "رسالة تحقق الشحن المجاني",
        type: "text",
        placeholder: "You unlocked free shipping",
      },
      {
        key: "showTrustRow",
        label: "إظهار شريط الثقة",
        type: "select",
        options: [
          { value: "true", label: "نعم" },
          { value: "false", label: "لا" },
        ],
      },
      {
        key: "showCouponField",
        label: "إظهار حقل الكوبون",
        type: "select",
        options: [
          { value: "true", label: "نعم" },
          { value: "false", label: "لا" },
        ],
      },
      {
        key: "showFreeShippingProgress",
        label: "إظهار تقدم الشحن المجاني",
        type: "select",
        options: [
          { value: "true", label: "نعم" },
          { value: "false", label: "لا" },
        ],
      },
    ],
  },
  "checkout-form": {
    label: "بيانات الدفع",
    component: "checkout-form",
    pages: ["checkout"],
    variants: [
      { value: "standard", label: "Standard" },
      { value: "split", label: "Split Cards" },
      { value: "compact", label: "Compact" },
      { value: "market-checkout", label: "إتمام سوق واضح" },
      { value: "nature-checkout", label: "إتمام طبيعي هادئ" },
      { value: "safe-adventure", label: "مسار مغامرة (أطفال)" },
      { value: "command-checkout", label: "إتمام تقني" },
      { value: "soft-flow", label: "تدفق ناعم" },
      { value: "fitting-room-checkout", label: "Fitting room checkout" },
    ],
    fields: [
      {
        key: "contactTitle",
        label: "عنوان بيانات التواصل",
        type: "text",
        placeholder: "Contact Information",
      },
      {
        key: "contactDescription",
        label: "وصف بيانات التواصل",
        type: "textarea",
        placeholder: "Explain what contact details are needed before checkout.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "shippingTitle",
        label: "عنوان الشحن",
        type: "text",
        placeholder: "Shipping Address",
      },
      {
        key: "shippingDescription",
        label: "وصف الشحن",
        type: "textarea",
        placeholder: "Explain how the shipping details will be used.",
      },
      {
        key: "notesTitle",
        label: "عنوان الملاحظات",
        type: "text",
        placeholder: "Order Notes",
      },
      {
        key: "notesDescription",
        label: "وصف الملاحظات",
        type: "textarea",
        placeholder: "Explain what kind of optional notes can be added.",
      },
      {
        key: "notesOptionalLabel",
        label: "نص الحقل الاختياري",
        type: "text",
        placeholder: "(Optional)",
      },
      {
        key: "autoDetectHint",
        label: "رسالة الاقتراح التلقائي",
        type: "textarea",
        placeholder: "We can suggest the governorate automatically from the city or address.",
      },
      {
        key: "autoDetectSuccessText",
        label: "رسالة نجاح الاقتراح",
        type: "text",
        placeholder: "The governorate was suggested automatically and can still be changed.",
      },
    ],
  },
  payment: {
    label: "طريقة الدفع",
    component: "payment",
    pages: ["checkout"],
    variants: [
      { value: "standard", label: "Standard" },
      { value: "cards", label: "Cards" },
      { value: "minimal", label: "Minimal" },
      { value: "market-payment", label: "دفع سوق دافئ" },
      { value: "nature-payment", label: "دفع طبيعي هادئ" },
      { value: "command-payment", label: "دفع تقني" },
      { value: "boutique-payment", label: "دفع بوتيك هادئ" },
    ],
    fields: [
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "4. Payment Method",
      },
      {
        key: "subtitle",
        label: "وصف القسم",
        type: "textarea",
        placeholder: "Guide shoppers through the final payment selection and summary.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "summaryTitle",
        label: "عنوان الملخص",
        type: "text",
        placeholder: "Summary",
      },
      {
        key: "summaryDescription",
        label: "وصف الملخص",
        type: "textarea",
        placeholder: "Explain what the shopper is seeing inside the live summary block.",
      },
      {
        key: "confirmOrderText",
        label: "نص زر تأكيد الطلب",
        type: "text",
        placeholder: "Confirm Order",
      },
      {
        key: "payButtonPrefix",
        label: "بادئة زر الدفع",
        type: "text",
        placeholder: "Pay",
      },
      {
        key: "processingText",
        label: "نص حالة المعالجة",
        type: "text",
        placeholder: "Processing...",
      },
      {
        key: "shippingPromptText",
        label: "رسالة انتظار اختيار المحافظة",
        type: "textarea",
        placeholder: "Enter your governorate to calculate shipping.",
      },
      {
        key: "enterGovernorateText",
        label: "نص خانة الشحن قبل الاختيار",
        type: "text",
        placeholder: "Enter governorate",
      },
      {
        key: "subtotalLabel",
        label: "نص المجموع الفرعي",
        type: "text",
        placeholder: "Subtotal",
      },
      {
        key: "shippingLabel",
        label: "نص الشحن",
        type: "text",
        placeholder: "Shipping",
      },
      {
        key: "totalLabel",
        label: "نص الإجمالي",
        type: "text",
        placeholder: "Total",
      },
      {
        key: "calculatingText",
        label: "نص حالة حساب الشحن",
        type: "text",
        placeholder: "Calculating...",
      },
      {
        key: "shippingCalculatedText",
        label: "رسالة نجاح حساب الشحن",
        type: "text",
        placeholder: "Shipping to {{governorate}} calculated successfully.",
      },
      {
        key: "noShippingChargeText",
        label: "رسالة عدم وجود رسوم شحن",
        type: "text",
        placeholder: "No shipping charge is configured for this governorate.",
      },
      {
        key: "shippingErrorText",
        label: "رسالة خطأ حساب الشحن",
        type: "textarea",
        placeholder: "Unable to calculate shipping right now. The backend will confirm the final total.",
      },
      {
        key: "governorateRequiredText",
        label: "رسالة إلزام المحافظة",
        type: "textarea",
        placeholder: "Selecting the governorate is required before confirming the order.",
      },
      {
        key: "invalidEmailText",
        label: "رسالة البريد غير الصحيح",
        type: "textarea",
        placeholder: "The email format is not valid. Leave it empty or enter a valid address.",
      },
      {
        key: "invalidPhoneText",
        label: "رسالة الهاتف غير الصحيح",
        type: "textarea",
        placeholder: "The phone number must be a valid Egyptian mobile number with 11 digits.",
      },
      {
        key: "securityText",
        label: "نص الأمان",
        type: "text",
        placeholder: "Secure encrypted checkout via SSL",
      },
    ],
  },
  "order-confirmation": {
    label: "تأكيد الطلب",
    component: "order-confirmation",
    pages: ["thank-you"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "market-aftercare", label: "متابعة سوق دافئة" },
      { value: "nature-aftercare", label: "متابعة طبيعية هادئة" },
      { value: "command-aftercare", label: "متابعة تقنية واضحة" },
      { value: "boutique-aftercare", label: "متابعة بوتيك هادئة" },
      { value: "soft-thanks", label: "شكر ناعم مباشر" },
    ],
    fields: [
      {
        key: "title",
        label: "عنوان رسالة النجاح",
        type: "text",
        placeholder: "Order Confirmed!",
      },
      {
        key: "description",
        label: "رسالة الشكر",
        type: "textarea",
        placeholder: "Thank you for your purchase.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "continueShoppingText",
        label: "نص زر متابعة التسوق",
        type: "text",
        placeholder: "Continue Shopping",
      },
      {
        key: "orderNumberPrefix",
        label: "نص بادئة رقم الطلب",
        type: "text",
        placeholder: "Order Number:",
      },
      {
        key: "supportText",
        label: "نص الدعم الفني",
        type: "text",
        placeholder: "Need help?",
      },
      {
        key: "supportEmail",
        label: "البريد الإلكتروني للدعم",
        type: "text",
        placeholder: "support@example.com",
      },
      {
        key: "statusLabel",
        label: "Order status label",
        type: "text",
        placeholder: "Preparing",
      },
      {
        key: "whatsappSupportLabel",
        label: "WhatsApp button label",
        type: "text",
        placeholder: "WhatsApp Support",
      },
      {
        key: "showTimeline",
        label: "Show timeline",
        type: "checkbox",
      },
      {
        key: "showRecommended",
        label: "Show post-purchase block",
        type: "checkbox",
      },
      {
        key: "showTrackOrder",
        label: "Show track-order card",
        type: "checkbox",
      },
      {
        key: "showReorder",
        label: "Show reorder card",
        type: "checkbox",
      },
      {
        key: "trackOrderTitle",
        label: "Track-order title",
        type: "text",
        placeholder: "Track this order",
      },
      {
        key: "trackOrderDescription",
        label: "Track-order description",
        type: "textarea",
        placeholder: "Check the latest order status using the checkout phone number.",
      },
      {
        key: "trackOrderButtonText",
        label: "Track-order button text",
        type: "text",
        placeholder: "Check order status",
      },
      {
        key: "trackOrderPhoneLabel",
        label: "Track-order phone label",
        type: "text",
        placeholder: "Checkout phone number",
      },
      {
        key: "trackOrderPhonePlaceholder",
        label: "Track-order phone placeholder",
        type: "text",
        placeholder: "01xxxxxxxxx",
      },
      {
        key: "reorderTitle",
        label: "Reorder title",
        type: "text",
        placeholder: "Reorder the same items",
      },
      {
        key: "reorderDescription",
        label: "Reorder description",
        type: "textarea",
        placeholder: "Add the original order items back to cart in one step.",
      },
      {
        key: "reorderButtonText",
        label: "Reorder button text",
        type: "text",
        placeholder: "Add these items again",
      },
      {
        key: "reorderSuccessText",
        label: "Reorder success text",
        type: "text",
        placeholder: "The order items were added back to cart.",
      },
      {
        key: "recommendedTitle",
        label: "Post-purchase title",
        type: "text",
        placeholder: "You may also like",
      },
      {
        key: "recommendedSubtitle",
        label: "Post-purchase description",
        type: "textarea",
        placeholder: "Relevant add-ons after the order is confirmed.",
      },
      {
        key: "recommendedBadge",
        label: "Post-purchase badge",
        type: "text",
        placeholder: "Post-purchase upsell",
      },
      {
        key: "recommendedLimit",
        label: "Suggested products count",
        type: "number",
        placeholder: "4",
      },
      {
        key: "recommendedCtaLabel",
        label: "Add button text",
        type: "text",
        placeholder: "Add to cart",
      },
      {
        key: "recommendedChooseOptionsLabel",
        label: "Choose options text",
        type: "text",
        placeholder: "Choose options",
      },
      {
        key: "recommendedVariant",
        label: "Post-purchase style",
        type: "select",
        options: [
          { value: "standard", label: "قياسي" },
          { value: "boutique-afterglow", label: "بوتيك هادئ" },
        ],
      },
    ],
  },
  "services-grid": {
    label: "شبكة الخدمات والمزايا",
    component: "services-grid",
    pages: ["home", "collections", "services", "shop"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "mixed-highlight", label: "شبكة غير منتظمة" },
    ],
    fields: [
      { key: "badge", label: "شارة القسم", type: "text", placeholder: "✦ خدماتنا" },
      {
        key: "title",
        label: "عنوان القسم",
        type: "text",
        placeholder: "ما يميّزنا",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "وصف مختصر عن مزايا وخدمات العلامة التجارية.",
      },
      {
        key: "columns",
        label: "عدد الأعمدة",
        type: "number",
        placeholder: "3",
      },
    ],
  },
  "features-bar": {
    label: "شريط المزايا المصوّر",
    component: "features-bar",
    pages: ["home", "shop", "pdp", "collections", "contact", "about"],
    variants: [
      { value: "trust-strip", label: "شريط المزايا (أساسي)" },
      { value: "service-clarity", label: "وضوح الخدمة" },
      { value: "delivery-clarity", label: "وضوح التوصيل" },
      { value: "system-assurance", label: "لوحة ثقة احترافية" },
      { value: "butcher-proof-board", label: "لوحة ضمانات جزارة Premium" },
      { value: "kids-guarantee", label: "ضمان الأطفال (مرح)" },
      { value: "store-advantages-pastel", label: "مزايا المتجر الباستيل" },
      { value: "vela-store-advantages", label: "مزايا متجر Vela" },
      { value: "automotive-bento", label: "مواصفات هندسية Bento (2026)" },
    ],
    fields: [
      {
        key: "title",
        label: "العنوان",
        type: "text",
        placeholder: "لماذا تختارنا",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "وصف اختياري يظهر فوق الشريط.",
      },
      {
        key: "image",
        label: "رابط الصورة الجانبية",
        type: "url",
        placeholder: "https://images.unsplash.com/...",
      },
      {
        key: "imageAlt",
        label: "نص بديل للصورة",
        type: "text",
        placeholder: "وصف الصورة",
      },
    ],
  },
  "shopping-intents": {
    label: "مسارات تسوق سريعة",
    component: "shopping-intents",
    pages: ["home", "shop"],
    fields: [
      {
        key: "badge",
        label: "شارة القسم",
        type: "text",
        placeholder: "Shopping Intents",
      },
      {
        key: "title",
        label: "العنوان",
        type: "text",
        placeholder: "ابدأ من الطريق الأقصر للشراء",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "قسم مخصص لمتجر عام يساعد العميل على اختيار المسار المناسب بسرعة.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "items",
        label: "بطاقات المسارات",
        type: "textarea",
        placeholder: "Express Edit|وصل حديثًا|منتجات جديدة تتحرك بسرعة|/shop?sort=newest|primary|جديد",
        helperText: "كل سطر: eyebrow|title|subtitle|link|tone|chip",
      },
    ],
  },
  "offer-bento": {
    label: "بنتو العروض التجارية",
    component: "offer-bento",
    pages: ["home", "shop", "sale"],
    variants: [
      { value: "category-promo", label: "ترويج تصنيفي" },
      { value: "daily-picks", label: "اختيارات يومية" },
      { value: "campaign-stack", label: "Stack حملات" },
      { value: "editorial-columns", label: "أعمدة تحريرية مفتوحة" },
      { value: "combo-deals", label: "صفقات كومبو" },
      { value: "bundle-matrix", label: "مصفوفة باقات تقنية" },
      { value: "boutique-duo", label: "ثنائي بوتيك تحريري" },
      { value: "vela-fashion-mosaic", label: "موزاييك Vela Fashion" },
    ],
    fields: [
      {
        key: "badge",
        label: "شارة القسم",
        type: "text",
        placeholder: "Commerce Boost",
      },
      {
        key: "title",
        label: "العنوان",
        type: "text",
        placeholder: "مساحات بيع أوضح داخل الصفحة",
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "بلوك تجاري يبرز القيمة والعروض والثقة داخل المتجر العام.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "cards",
        label: "بطاقات البنتو",
        type: "textarea",
        placeholder: "Deal Block|منتجات سريعة الدوران|دفع بيعي أوضح للمنتجات المهمة|شاهد المنتجات|/shop?sort=popular|primary|Top Sellers",
        helperText: "كل سطر: label|title|subtitle|ctaText|link|tone|stat|image",
      },
    ],
  },
  "journal-strip": {
    label: "يوميات أو مدونة خفيفة",
    component: "journal-strip",
    pages: ["home", "lookbook", "collections", "blogs", "journal"],
    variants: [
      { value: "editorial-cards", label: "بطاقات تحريرية" },
      { value: "vela-customer-testimonials", label: "شهادات عملاء Vela" }
    ],
    fields: [
      {
        key: "badge",
        label: "شارة القسم",
        type: "text",
        placeholder: "من اليوميات"
      },
      {
        key: "title",
        label: "العنوان",
        type: "text",
        placeholder: "من يوميات البوتيك"
      },
      {
        key: "subtitle",
        label: "الوصف",
        type: "textarea",
        placeholder: "محتوى خفيف يضيف نفسًا تحريريًا بين رفوف المنتجات والنشرة البريدية."
      },
      {
        key: "items",
        label: "بطاقات اليوميات",
        type: "textarea",
        placeholder: "عنوان المقال|ستايل يومي|https://image.jpg|/lookbook|وصف مختصر للبطاقة",
        helperText: "كل سطر: title|meta|image|link|excerpt"
      }
    ]
  },
  "info-content": {
    label: "محتوى نصي",
    component: "info-content",
    fields: [
      {
        key: "badge",
        label: "شارة القسم",
        type: "text",
        placeholder: "معلومات مهمة",
      },
      {
        key: "title",
        label: "العنوان",
        type: "text",
        placeholder: "عنوان الصفحة أو القسم",
      },
      {
        key: "subtitle",
        label: "الوصف المختصر",
        type: "textarea",
        placeholder: "مقدمة قصيرة توضح ما الذي سيجده العميل في هذه الصفحة.",
      },
      {
        key: "contentAlign",
        label: "محاذاة المحتوى",
        type: "select",
        options: [
          { label: "في المنتصف", value: "center" },
          { label: "على الطرف", value: "start" },
        ],
      },
      {
        key: "body",
        label: "المحتوى",
        type: "textarea",
        placeholder:
          "اكتب الفقرة الأولى هنا.\n\nثم افصل بسطر فارغ قبل الفقرة التالية.",
        helperText: "افصل بين الفقرات بسطر فارغ.",
      },
      {
        key: "detailsTitle",
        label: "عنوان التفاصيل",
        type: "text",
        placeholder: "تفاصيل سريعة",
      },
      {
        key: "details",
        label: "عناصر التفاصيل",
        type: "textarea",
        placeholder:
          "مدة التجهيز|من 24 إلى 48 ساعة\nالاستبدال|خلال 14 يومًا من الاستلام",
        helperText: "كل سطر: label|value",
      },
      {
        key: "ctaText",
        label: "نص الزر",
        type: "text",
        placeholder: "ارجع إلى المتجر",
      },
      {
        key: "ctaLink",
        label: "رابط الزر",
        type: "url",
        placeholder: "/shop",
      },
    ],
  },
  "member-registration": {
    label: "تسجيل العضوية",
    component: "member-registration",
    pages: ["registration"],
    fields: [
      {
        key: "title",
        label: "عنوان التسجيل",
        type: "text",
        placeholder: "Member Registration",
      },
      {
        key: "subtitle",
        label: "وصف التسجيل",
        type: "textarea",
        placeholder: "يرجى تقديم معلوماتك الأساسية لإنشاء حساب.",
      },
    ],
  },
  "shop-hero": {
    label: "Hero Banner (Legacy)",
    component: "hero-banner",
    note: "راجع إعدادات hero-banner",
    pages: ["shop"],
    legacy: true,
  },
  "shop-featured-collection": {
    label: "Featured Collection (Legacy)",
    component: "product-grid",
    note: "راجع إعدادات featured-products",
    pages: ["shop"],
    legacy: true,
  },
  "shop-product-grid": {
    label: "Product Grid (Legacy)",
    component: "product-grid",
    note: "راجع إعدادات product-grid",
    pages: ["shop"],
    legacy: true,
  },
  "affiliate-disclosure": {
    label: "Affiliate Disclosure Bar",
    component: "affiliate-disclosure",
    fields: [
      { key: "text", label: "Disclosure text", type: "textarea", placeholder: "Affiliate disclosure text" },
      { key: "linkText", label: "Link text", type: "text", placeholder: "Full disclosure here." },
      { key: "linkHref", label: "Link href", type: "url", placeholder: "/affiliate-disclaimer" },
    ],
  },
  "affiliate-top-picks": {
    label: "Affiliate Top Picks (Amazon)",
    component: "affiliate-top-picks",
    fields: [
      { key: "title", label: "Section title", type: "text", placeholder: "Our Top Picks" },
      { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Affiliate disclosure subtitle" },
      { key: "products", label: "Products (textarea)", type: "textarea", placeholder: "title|price|image|href|badge per line", helperText: "Each line: title|price|image|href|badge" },
    ],
  },
  "article-grid": {
    label: "Article Grid (Blog)",
    component: "article-grid",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "Latest Reviews" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "limit", label: "Limit", type: "number", placeholder: "6" },
    ],
  },
  "affiliate-quiz": {
    label: "Affiliate Quiz Picker",
    component: "affiliate-quiz",
    fields: [
      { key: "title", label: "Quiz title", type: "text", placeholder: "Find Your Perfect Beard Trimmer" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "ctaText", label: "CTA text", type: "text", placeholder: "Start Quiz" },
    ],
  },
  "affiliate-faq": {
    label: "Affiliate FAQ (with FAQPage schema)",
    component: "affiliate-faq",
    fields: [
      { key: "badge", label: "شارة أعلى العنوان", type: "text", placeholder: "الأسئلة الشائعة" },
      { key: "title", label: "Title", type: "text", placeholder: "Frequently Asked Questions" },
      { key: "subtitle", label: "الوصف", type: "textarea", placeholder: "إجابات على الأسئلة الأكثر تكراراً" },
      { key: "faqs", label: "FAQs", type: "textarea", placeholder: "Question|Answer per line" },
    ],
  },
  "affiliate-toc": {
    label: "Table of Contents",
    component: "affiliate-toc",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "Table of Contents" },
      { key: "items", label: "Items", type: "textarea", placeholder: "One item per line" },
    ],
  },
  "affiliate-pro-tip": {
    label: "Pro Tip Box",
    component: "affiliate-pro-tip",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "Pro Tip" },
      { key: "text", label: "Text", type: "textarea", placeholder: "Tip text" },
      { key: "icon", label: "Icon", type: "text", placeholder: "💡" },
    ],
  },
  "affiliate-sources": {
    label: "Sources & Author",
    component: "affiliate-sources",
    fields: [
      { key: "title", label: "Title", type: "text", placeholder: "Sources & References" },
      { key: "items", label: "Sources", type: "textarea", placeholder: "Label|href per line" },
      { key: "updatedAt", label: "Updated date", type: "text", placeholder: "August 11, 2026" },
      { key: "authorName", label: "Author name", type: "text", placeholder: "Jake Morrison" },
    ],
  },
  "affiliate-breadcrumbs": {
    label: "Breadcrumbs (with BreadcrumbList schema)",
    component: "affiliate-breadcrumbs",
    fields: [
      { key: "items", label: "Breadcrumbs", type: "textarea", placeholder: "Home|Guides|Article title" },
    ],
  },
  "affiliate-article-seo": {
    label: "Article SEO (Article + WebSite schema)",
    component: "affiliate-article-seo",
    fields: [
      { key: "headline", label: "Headline", type: "text", placeholder: "Article headline" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Meta description" },
      { key: "image", label: "Hero image URL", type: "url", placeholder: "https://..." },
      { key: "datePublished", label: "Date published", type: "text", placeholder: "2026-08-11" },
      { key: "authorName", label: "Author name", type: "text", placeholder: "Jake Morrison" },
    ],
  },
  "image-hotspot": {
    label: "Image Hotspot (نقاط تفاعلية على الصورة)",
    component: "image-hotspot",
    note: "أضيفي نقاط تفاعلية على صورة المنتج لتسليط الضوء على الخامات والتفاصيل.",
    fields: [
      { key: "title", label: "العنوان", type: "text", placeholder: "استكشفي التفاصيل" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
      { key: "image", label: "رابط الصورة", type: "url", placeholder: "https://..." },
      { key: "imageAlt", label: "وصف الصورة البديل", type: "text" },
      { key: "hotspots", label: "النقاط (x|y|الاسم|النص|الرابط) سطر لكل نقطة", type: "textarea", placeholder: "50|40|القماش|قطن مستورد|/shop" },
    ],
  },
  "before-after": {
    label: "Before/After Image Slider (مقارنة قبل وبعد)",
    component: "before-after",
    note: "مقارنة تفاعلية بين صورتين عبر مقبض قابل للسحب.",
    fields: [
      { key: "title", label: "العنوان", type: "text", placeholder: "قبل وبعد" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
      { key: "beforeImage", label: "صورة قبل", type: "url", placeholder: "https://..." },
      { key: "afterImage", label: "صورة بعد", type: "url", placeholder: "https://..." },
      { key: "beforeLabel", label: "نص قبل", type: "text", placeholder: "قبل" },
      { key: "afterLabel", label: "نص بعد", type: "text", placeholder: "بعد" },
    ],
  },
  "combined-listing": {
    label: "Combined Listing (عرض منتج مدمج)",
    component: "combined-listing",
    note: "اعرضي منتجًا رئيسيًا مع أجزائه المكملة في بلوك واحد.",
    fields: [
      { key: "title", label: "العنوان", type: "text", placeholder: "عرض مدمج" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
      { key: "mainImage", label: "صورة القطعة الرئيسية", type: "url", placeholder: "https://..." },
      { key: "mainTitle", label: "اسم القطعة الرئيسية", type: "text" },
      { key: "mainPrice", label: "سعر القطعة الرئيسية", type: "text", placeholder: "٣٩٩ ج.م" },
      { key: "mainLink", label: "رابط القطعة الرئيسية", type: "text", placeholder: "/shop" },
      { key: "parts", label: "الأجزاء (الاسم|السعر|الصورة|الرابط) سطر لكل جزء", type: "textarea", placeholder: "حزام|٩٩ ج.م|https://...|/shop" },
    ],
  },
  "hover-cards": {
    label: "Hover Cards (هيرو بطاقات ملونة)",
    component: "hover-cards",
    note: "هيرو تحريري بكروت متدرجة لها حافة mask كما في Soft Graceful — تتسع عند المرور وتكشف المنتج.",
    pages: ["home"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "editorial", label: "تحريري" },
      { value: "dark", label: "داكن" },
    ],
    fields: [
      { key: "heading", label: "العنوان", type: "text", placeholder: "Style Made for Every You" },
      { key: "description", label: "الوصف", type: "textarea" },
      { key: "ctaText", label: "نص الزر", type: "text", placeholder: "Shop Now" },
      { key: "ctaLink", label: "رابط الزر", type: "url", placeholder: "/collections" },
      { key: "gradientFrom", label: "لون التدرج البداية", type: "text", placeholder: "#194C21" },
      { key: "gradientTo", label: "لون التدرج النهاية", type: "text", placeholder: "#071009" },
      { key: "cards", label: "البطاقات (العنوان|الوصف|الصورة|نص الزر|الرابط)", type: "textarea", placeholder: "Women in Style|Effortless pieces|https://...|Shop Now|/shop" },
    ],
  },
  "countdown-banner": {
    label: "Countdown Banner (عدّاد تنازلي)",
    component: "countdown",
    note: "قسم عدّاد تنازلي مستقل بخلفية صورة وأرقام أيام/ساعات/دقائق/ثواني حية.",
    pages: ["home", "sale"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "layered", label: "طبقة" },
      { value: "inline", label: "مضمّن" },
    ],
    fields: [
      { key: "heading", label: "العنوان", type: "text", placeholder: "New Season Layers" },
      { key: "description", label: "الوصف", type: "textarea" },
      { key: "image", label: "صورة الخلفية", type: "url", placeholder: "https://..." },
      { key: "ctaText", label: "نص الزر", type: "text", placeholder: "Shop Jacket" },
      { key: "ctaLink", label: "رابط الزر", type: "url", placeholder: "/products/..." },
      { key: "endAt", label: "وقت الانتهاء (ISO أو ملّي ثوانٍ)", type: "text", placeholder: "2026-09-30T00:00:00" },
      { key: "counterBg", label: "لون خلفية العداد", type: "text", placeholder: "#4c3636" },
      { key: "counterText", label: "لون نص العداد", type: "text", placeholder: "#ffffff" },
    ],
  },
  "collection-tab": {
    label: "Collection Tab (تبويبات أقسام)",
    component: "collection-tab",
    note: "شبكة منتجات بأعمدة وتبويبات حسب الموسم أو المناسبة مع أسهم تنقّل.",
    pages: ["home", "shop", "sale", "collections", "about"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "split", label: "مقسّم" },
      { value: "pills", label: "حبوب" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "Style for Every Season" },
      { key: "title", label: "العنوان", type: "text", placeholder: "Style for Every Season" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
      { key: "ctaText", label: "نص الرابط", type: "text", placeholder: "Explore More" },
      { key: "ctaLink", label: "رابط الرابط", type: "url", placeholder: "/shop" },
      { key: "columns", label: "عدد الأعمدة", type: "number", placeholder: "3" },
      { key: "showArrows", label: "إظهار الأسهم", type: "select", options: [{ label: "نعم", value: "true" }, { label: "لا", value: "false" }] },
      { key: "tabs", label: "التبويبات (label|title|subtitle|image|link)", type: "textarea", placeholder: "Winter|Winter Collection|Layered warmth|https://...|/shop" },
    ],
  },
  "background-video": {
    label: "Background Video (فيديو خلفية)",
    component: "background-video",
    note: "قسم فيديو خلفية مع poster وأعمدة متحركة أو محتوى مركزي.",
    pages: ["home", "shop", "pdp"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "full-bleed", label: "عرض كامل" },
      { value: "banners", label: "أعمدة" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "Discover the Story" },
      { key: "title", label: "العنوان", type: "text", placeholder: "Discover the Story Behind Every Collection" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
      { key: "video", label: "رابط الفيديو", type: "url", placeholder: "https://..." },
      { key: "poster", label: "صورة الغلاف", type: "url", placeholder: "https://..." },
      { key: "ctaText", label: "نص الزر", type: "text", placeholder: "Shop Now" },
      { key: "ctaLink", label: "رابط الزر", type: "url", placeholder: "/shop" },
    ],
  },
  "scrolling-cards": {
    label: "Scrolling Cards (كروت متحركة)",
    component: "scrolling-cards",
    note: "كروت أفقية بأيقونات أو صور مع خلفية لونية لكل كارت.",
    pages: ["home"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "layered", label: "طبقة" },
      { value: "style2", label: "نمط 2" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "Why Choose Us" },
      { key: "title", label: "العنوان", type: "text", placeholder: "Trusted Quality" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
      { key: "images", label: "صور الطبقات (سطر لكل صورة — للنمط الطبقي)", type: "textarea", placeholder: "https://...\nhttps://..." },
      { key: "cards", label: "الكروت (title|description|image|icon|bg)", type: "textarea", placeholder: "Premium Fabrics|Soft durable materials|https://...|shield|#f3efea" },
    ],
  },
  "social-gallery": {
    label: "Social Gallery (معرض المجتمع)",
    component: "social-gallery",
    note: "شريط صور Instagram متحرك (marquee) أو شبكة بأيقونة انستغرام عند المرور.",
    pages: ["home", "about", "lookbook"],
    variants: [
      { value: "standard", label: "شريط" },
      { value: "grid", label: "شبكة" },
      { value: "marquee", label: "متحرك" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "Styled By Our Community" },
      { key: "title", label: "العنوان", type: "text", placeholder: "Styled By Our Community" },
      { key: "subtitle", label: "الوصف", type: "text", placeholder: "Instagram @Graceful" },
      { key: "handle", label: "اسم المستخدم", type: "text", placeholder: "@Graceful" },
      { key: "images", label: "الصور (سطر لكل صورة)", type: "textarea", placeholder: "https://...\nhttps://..." },
    ],
  },
  richtext: {
    label: "Rich Text (نص تحريري)",
    component: "richtext",
    note: "بلوك نصي بسيط بشارة وعنوان فرعي مميز.",
    pages: ["home", "collections", "about"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "centered", label: "مركز" },
      { value: "split", label: "مقسّم" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "The Collection" },
      { key: "title", label: "العنوان", type: "text", placeholder: "Inspired by Style, Designed for Everyday Living" },
      { key: "subtitle", label: "العنوان الفرعي", type: "text", placeholder: "Discover Timeless Fashion" },
      { key: "body", label: "المحتوى", type: "textarea" },
      { key: "image", label: "صورة جانبية (يسار)", type: "text", placeholder: "https://..." },
      { key: "secondaryImage", label: "صورة جانبية (يمين)", type: "text", placeholder: "https://..." },
    ],
  },
  "featured-product": {
    label: "Featured Product (منتج مميز)",
    component: "featured-product",
    note: "عرض منتج واحد كبير مع معرض صور مصغّرة وسعر وأزرار.",
    pages: ["home", "collections"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "split", label: "مقسّم" },
      { value: "spotlight", label: "متفرّد" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "Featured Piece" },
      { key: "title", label: "اسم المنتج", type: "text", placeholder: "Classic White Belted Shirt Dress" },
      { key: "subtitle", label: "القسم", type: "text", placeholder: "Women in Style" },
      { key: "description", label: "الوصف", type: "textarea" },
      { key: "image", label: "الصورة الرئيسية", type: "url", placeholder: "https://..." },
      { key: "gallery", label: "معرض الصور (سطر لكل صورة)", type: "textarea" },
      { key: "price", label: "السعر", type: "text", placeholder: "$491.00" },
      { key: "comparePrice", label: "السعر قبل الخصم", type: "text", placeholder: "$565.00" },
      { key: "colors", label: "الألوان (الاسم|#كود — سطر لكل لون)", type: "textarea", placeholder: "White|#ffffff\nBlack|#111111" },
      { key: "sizes", label: "المقاسات (مفصولة بفاصلة)", type: "text", placeholder: "S, M, L, XL, 2XL" },
      { key: "payments", label: "وسائل الدفع (مفصولة بفاصلة)", type: "text", placeholder: "VISA, Mastercard, AMEX, PayPal" },
      { key: "taxesNote", label: "ملاحظة الضرائب/الشحن", type: "text", placeholder: "Taxes included. Shipping calculated at checkout." },
      { key: "ctaText", label: "نص الزر", type: "text", placeholder: "Add to Bag" },
      { key: "ctaLink", label: "رابط الزر", type: "url", placeholder: "/shop" },
    ],
  },
  "review-circle": {
    label: "Review Circle (دائرة المراجعات)",
    component: "review-circle",
    note: "مراجعات بحلقة صور دائرية تقلب بين المستخدمين كما في Soft Graceful — اسم، دور، اقتباس.",
    pages: ["home"],
    variants: [
      { value: "circle", label: "دائرة" },
      { value: "cards", label: "بطاقات" },
      { value: "standard", label: "قياسي" },
    ],
    fields: [
      { key: "title", label: "العنوان", type: "text", placeholder: "The Best Reviews From Clients" },
      { key: "intro", label: "المقدمة", type: "textarea" },
      { key: "reviews", label: "المراجعات (name|role|quote|avatar|rating)", type: "textarea", placeholder: "Mackle Johnathan|Manager|Great quality|https://...|5" },
    ],
  },
  "shop-the-look": {
    label: "Shop The Look (هوتسبوت)",
    component: "shop-the-look",
    note: "صورة أزياء تفاعلية بنقاط Hotspot نبضية تكشف تفاصيل وأسعار المنتج كما في Soft Graceful.",
    pages: ["home", "lookbook"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "spotlight", label: "متفرّد" },
      { value: "full", label: "عرض كامل" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "Shop The Look" },
      { key: "title", label: "العنوان", type: "text", placeholder: "Explore Every Detail of Your Perfect Outfit" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
      { key: "tabs", label: "التبويبات (label|title|image|hotspots)", type: "textarea", placeholder: "Men|Urban Rider Leather Jacket|https://...|60:28:Title:Desc:https://..." },
    ],
  },
  "dental-3d-showcase": {
    label: "معاينة ثلاثية الأبعاد للتركيبات (Dental 3D Showcase)",
    component: "dental-3d-showcase",
    note: "معاينة تفاعلية 360° لتركيبات الأسنان والزيركون مع محاكي درجات الألوان VITA ودورة العمل الرقمية CAD/CAM.",
    pages: ["home", "shop", "pdp", "about"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "interactive-3d", label: "تفاعلي 3D" },
      { value: "workflow-focus", label: "مسار العمل" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "Digital CAD/CAM Laboratory" },
      { key: "title", label: "العنوان", type: "text", placeholder: "معاينة التركيبات ثلاثية الأبعاد بدقة الميكرون" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
      { key: "ctaText", label: "نص زر الإجراء", type: "text", placeholder: "طلب كيت عينات للعيادة 📦" },
      { key: "ctaLink", label: "رابط زر الإجراء", type: "url", placeholder: "/contact" },
    ],
  },
  "car-model-matcher": {
    label: "مطابقة موديل السيارة (Car Model Matcher)",
    component: "car-model-matcher",
    note: "أداة بحث تفاعلية لمطابقة موديل وسنة صنع السيارة والتأكد من توافق باترون الفابريقة.",
    pages: ["home", "shop", "pdp"],
    variants: [
      { value: "standard", label: "قياسي" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "تطابق فابريقة 100%" },
      { key: "title", label: "العنوان", type: "text", placeholder: "تأكد من مطابقة الستارة لموديل سيارتك" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
      { key: "placeholder", label: "نص خانة البحث", type: "text" },
      { key: "fitMessage", label: "رسالة التطابق", type: "text" },
      { key: "customNoteMessage", label: "رسالة التفصيل المخصص", type: "text" },
      { key: "ctaText", label: "نص زر الإجراء", type: "text", placeholder: "اختيار الباقة والمتابعة" },
      { key: "ctaLink", label: "رابط زر الإجراء", type: "url", placeholder: "#pdp-buybox" },
    ],
  },
  "automotive-bento": {
    label: "مواصفات هندسية Bento (Automotive Spec Bento)",
    component: "automotive-bento",
    note: "شبكة بينتو هندسية بمواصفات تقنية وتيليمتري حراري للسيارات بمعايير 2026.",
    pages: ["home", "shop", "pdp", "about"],
    variants: [
      { value: "standard", label: "قياسي" },
      { value: "automotive-bento", label: "بينتو هندسي" },
    ],
    fields: [
      { key: "badge", label: "الشارة", type: "text", placeholder: "المواصفات الفنية والهندسية المعتمدة" },
      { key: "title", label: "العنوان", type: "text", placeholder: "هندسة فائقة مصممة لتحمل حرارة الصيف القاسية" },
      { key: "subtitle", label: "الوصف", type: "textarea" },
    ],
  },
} as const satisfies Record<string, StorefrontSectionManifestEntry>;

export type StorefrontSectionId = keyof typeof STOREFRONT_SECTION_MANIFEST;

export const STOREFRONT_SECTION_IDS = Object.keys(
  STOREFRONT_SECTION_MANIFEST,
) as StorefrontSectionId[];

const STOREFRONT_SECTION_VARIANT_ALIASES = {
  "hero-banner": {
    split: "split-panel",
    fullscreen: "full-bleed",
    "centered-overlay": "centered",
  },
  newsletter: {
    colored: "split-panel",
    dark: "standard",
  },
  "featured-products": {
    grid: "standard",
  },
  "product-grid": {
    grid: "standard",
  },
  "related-products": {
    grid: "standard",
    "minimal-card": "minimal",
    "overlay-card": "overlay",
    "luxury-card": "luxury",
    carousel: "compact",
    "editorial-card": "editorial",
    "list-card": "list",
    "glass-card": "glass",
  },
  "product-gallery": {
    slider: "standard",
    graceful: "atelier-editorial-stage",
    default: "standard",
  },
  "product-info": {
    graceful: "atelier-buybox",
    default: "standard",
  },
  "promo-strip": {
    split: "standard",
    banner: "standard",
  },
  "features-bar": {
    minimal: "trust-strip",
  },
  "featured-collections": {
    editorial: "editorial-categories",
  },
  "shopping-intents": {},
  "offer-bento": {
    grid: "category-promo",
  },
  "journal-strip": {
    carousel: "editorial-cards",
    grid: "editorial-cards",
  },
  "lookbook-showcase": {
    masonry: "standard",
  },
  "story-parallax": {
    editorial: "standard",
  },
  "shop-promo-rail": {
    side: "trust-rail",
  },
  "trusted-badges": {
    row: "minimal",
  },
  "quantity-offers": {
    tiers: "stacked-cards",
  },
  "bulk-savings": {
    inline: "minimal",
  },
  "delivery-proof": {
    timeline: "minimal",
  },
  "conversion-stack": {
    editorial: "editorial",
  },
  "bought-together": {},
  reviews: {
    editorial: "standard",
  },
  "info-content": {
    faq: "standard",
    usage: "standard",
  },
  "size-guide": {
    table: "quick",
  },
  "image-hotspot": {
    default: "standard",
  },
  "before-after": {
    default: "standard",
  },
  "combined-listing": {
    default: "standard",
  },
  "member-registration": {},
  "services-grid": {},
  "shop-hero": {
    legacy: "hero-banner",
  },
  "shop-featured-collection": {
    legacy: "product-grid",
  },
  "shop-product-grid": {
    legacy: "product-grid",
  },
  "dental-3d-showcase": {},
} as const satisfies Partial<Record<StorefrontSectionId, Record<string, string>>>;

const normalizeVariantValue = (variant: string): string =>
  variant.trim().toLowerCase();

export const getStorefrontSectionManifest = (
  sectionType: string,
): StorefrontSectionManifestEntry | undefined =>
  STOREFRONT_SECTION_MANIFEST[sectionType as StorefrontSectionId];

export const getStorefrontSectionLabel = (sectionType: string): string =>
  getStorefrontSectionManifest(sectionType)?.label || sectionType;

export const getStorefrontSectionComponentKey = (sectionType: string): string =>
  getStorefrontSectionManifest(sectionType)?.component || sectionType;

export const isStorefrontSectionKnown = (sectionType: string): boolean =>
  Boolean(getStorefrontSectionManifest(sectionType));

export const getStorefrontSectionVariantValues = (
  sectionType: string,
): string[] =>
  (getStorefrontSectionManifest(sectionType)?.variants || []).map(({ value }) =>
    normalizeVariantValue(value),
  );

export const normalizeStorefrontSectionVariant = (
  sectionType: string,
  variant: string,
): string => {
  const normalizedVariant = normalizeVariantValue(variant);
  const aliases = STOREFRONT_SECTION_VARIANT_ALIASES[
    sectionType as keyof typeof STOREFRONT_SECTION_VARIANT_ALIASES
  ] as Record<string, string> | undefined;

  return aliases?.[normalizedVariant] || normalizedVariant;
};

export const isStorefrontSectionVariantAllowed = (
  sectionType: string,
  variant: string,
): boolean => {
  const normalizedVariant = normalizeStorefrontSectionVariant(sectionType, variant);
  const allowedVariants = getStorefrontSectionVariantValues(sectionType);

  if (!normalizedVariant) {
    return true;
  }

  if (allowedVariants.length === 0) {
    return normalizedVariant === "default" || normalizedVariant === "standard";
  }

  return allowedVariants.includes(normalizedVariant);
};

export const isStorefrontSectionAllowedOnPage = (
  sectionType: string,
  pageKey: string,
): boolean => {
  const section = getStorefrontSectionManifest(sectionType);

  if (!section || !section.pages || section.pages.length === 0) {
    return true;
  }

  return section.pages.includes(pageKey);
};

