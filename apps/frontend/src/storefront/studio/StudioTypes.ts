export type StudioDeviceMode = "desktop" | "tablet" | "mobile";

export type StudioLeftRailTab =
  | "elements"
  | "layers"
  | "pages"
  | "media"
  | "styles"
  | "variables"
  | "code"
  | "ai"
  | "settings";

export type StudioLeftPanelTab = "layers" | "theme" | "pages" | "elements";

export type StudioInspectorTab =
  | "design"
  | "layout"
  | "content"
  | "interactions"
  | "style"
  | "visibility"
  | "i18n"
  | "analytics"
  | "animation"
  | "classes";

export type StudioStyleState = "normal" | "hover" | "focus" | "active";

export interface StudioStyleClass {
  id: string;
  name: string;
  settings: Record<string, any>;
  states?: {
    hover?: Record<string, any>;
    focus?: Record<string, any>;
    active?: Record<string, any>;
  };
}

export type StudioZoomLevel = number;

export interface StudioDimensions {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type StudioElementType =
  | "heading"
  | "subtitle"
  | "button"
  | "image"
  | "badge"
  | "custom"
  | "video"
  | "marquee"
  | "lottie"
  | "product-price"
  | "product-rating"
  | "product-stock"
  | "add-to-cart"
  | "product-options"
  | "wishlist"
  | "compare"
  | "cart-items"
  | "cart-items-element"
  | "cart-totals"
  | "checkout-button"
  | "coupon";

export interface StudioSelectedElement {
  sectionKey: string;
  type: StudioElementType;
  label: string;
  field: string;
  linkField?: string;
  altField?: string;
  currentText?: string;
  currentLink?: string;
  currentImage?: string;
}

export type StudioPositionMode = "static" | "relative" | "absolute" | "sticky";
export type StudioOverflowMode = "visible" | "hidden" | "auto" | "scroll";
export type StudioBorderStyle = "solid" | "dashed" | "dotted" | "double" | "none";

export interface StudioBorderSideSettings {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  color?: string;
  style?: StudioBorderStyle;
  borderColor?: string;
  borderStyle?: StudioBorderStyle;
}

export interface StudioCornerRadiusSettings {
  topLeft?: number;
  topRight?: number;
  bottomRight?: number;
  bottomLeft?: number;
}

export interface StudioOverlaySettings {
  color?: string;
  opacity?: number;
}

export interface StudioTransformSettings {
  rotate?: number;
  scale?: number;
  translateX?: number;
  translateY?: number;
  transform?: string;
}

export interface ContainerResponsiveSettings {
  direction?: "column" | "row";
  columns?: number;
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  wrap?: boolean;
  paddingTop?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  paddingRight?: number | string;
  [key: string]: unknown;
}

export interface ContainerSettings {
  direction?: "column" | "row";
  gap?: number;
  columns?: number;
  align?: "start" | "center" | "end" | "stretch";
  wrap?: boolean;
  paddingTop?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  paddingRight?: number | string;
  responsive?: {
    mobile?: ContainerResponsiveSettings;
    tablet?: ContainerResponsiveSettings;
    [key: string]: ContainerResponsiveSettings | undefined;
  };
  [key: string]: unknown;
}

export const DEFAULT_CONTAINER_SETTINGS: ContainerSettings = {
  direction: "column",
  gap: 12,
  columns: 1,
  align: "stretch",
  wrap: false,
};

export interface SectionNode {
  type: string;
  key?: string;
  id?: string;
  label?: string;
  hidden?: boolean;
  locked?: boolean;
  classId?: string;
  settings?: Record<string, unknown> | ContainerSettings;
  children?: SectionNode[];
  [key: string]: unknown;
}

export interface SavedStudioSection {
  id: string;
  label: string;
  type: string;
  settings?: Record<string, unknown> | ContainerSettings;
  children?: SectionNode[];
  createdAt?: string;
  [key: string]: unknown;
}

export type StudioSectionShape = SectionNode | Record<string, any>;

export type LoopSourceType = "products" | "collection" | "articles";

export interface StudioLoopSettings {
  source?: LoopSourceType;
  collectionId?: string | number;
  limit?: number;
  columns?: number;
  template?: StudioSectionShape[];
  emptyMessage?: string;
  [key: string]: unknown;
}

export interface StudioLoopSection {
  type: "loop";
  key?: string;
  id?: string;
  label?: string;
  source?: LoopSourceType;
  collectionId?: string | number;
  limit?: number;
  columns?: number;
  template: StudioSectionShape[];
  settings?: StudioLoopSettings;
  [key: string]: unknown;
}

export interface StudioGlobalComponent {
  id: string;
  name: string;
  section: StudioSectionShape;
  createdAt: string;
  updatedAt: string;
}

export interface StudioComponentInstance {
  type: "componentInstance";
  key: string;
  componentId: string;
  label?: string;
  settings?: {
    componentId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface StudioGlobalComponentSettings {
  globalComponents?: StudioGlobalComponent[];
  [key: string]: unknown;
}


export type StudioCommerceElementType =
  | "product-price"
  | "product-rating"
  | "product-stock"
  | "add-to-cart"
  | "product-options"
  | "wishlist"
  | "compare";

export interface StudioCommerceElementDefinition {
  id: string;
  label: string;
  type: StudioCommerceElementType;
  description: string;
  iconName?: string;
}

export const STUDIO_COMMERCE_ELEMENTS: StudioCommerceElementDefinition[] = [
  {
    id: "product-price",
    label: "سعر المنتج",
    type: "product-price",
    description: "عرض سعر البيع والسعر قبل الخصم منسقاً بالعملة",
    iconName: "TagIcon",
  },
  {
    id: "product-rating",
    label: "تقييم المنتج",
    type: "product-rating",
    description: "نجوم التقييم وعدد مراجعات المنتج",
    iconName: "SparklesIcon",
  },
  {
    id: "product-stock",
    label: "شريط الستوك",
    type: "product-stock",
    description: "شريط التوفر والمخزون المتبقي أو غير متوفر",
    iconName: "QueueListIcon",
  },
  {
    id: "add-to-cart",
    label: "أضف للسلة",
    type: "add-to-cart",
    description: "زر إضافة المنتج للسلة مع فحص الخيارات والتوفر",
    iconName: "CursorArrowRaysIcon",
  },
  {
    id: "product-options",
    label: "خيارات المنتج",
    type: "product-options",
    description: "محدد المقاس واللون والمتغيرات المتاحة",
    iconName: "Squares2X2Icon",
  },
  {
    id: "wishlist",
    label: "المفضلة",
    type: "wishlist",
    description: "زر إضافة وحفظ المنتج في قائمة الرغبات",
    iconName: "BookmarkIcon",
  },
  {
    id: "compare",
    label: "المقارنة",
    type: "compare",
    description: "زر مقارنة مواصفات المنتج مع منتجات أخرى",
    iconName: "ArrowPathIcon",
  },
];

export type StudioCartElementType =
  | "cart-items"
  | "cart-items-element"
  | "cart-totals"
  | "checkout-button"
  | "coupon";

export interface StudioCartElementDefinition {
  id: string;
  label: string;
  type: StudioCartElementType;
  description: string;
  iconName?: string;
}


export type StudioFxElementType = "marquee" | "lottie" | "video";

export interface StudioFxElementDefinition {
  id: string;
  label: string;
  type: StudioFxElementType;
  description: string;
  iconName?: string;
}

export const STUDIO_FX_ELEMENTS: StudioFxElementDefinition[] = [
  {
    id: "marquee",
    label: "شريط متحرك",
    type: "marquee",
    description: "شريط نصوص وشعارات متحركة انسيابية مع دعم RTL وإيقاف عند التحويم",
    iconName: "ArrowPathIcon",
  },
  {
    id: "lottie",
    label: "أنيميشن Lottie",
    type: "lottie",
    description: "أنيميشن تفاعلي متجاوب خفيف يعتمد على ملفات JSON مع دعم الصور البديلة",
    iconName: "SparklesIcon",
  },
  {
    id: "video",
    label: "فيديو",
    type: "video",
    description: "مشغل فيديو مدمج مع دعم YouTube/Vimeo/MP4 وغلاف Poster والتحكم التلقائي",
    iconName: "PlayCircleIcon",
  },
];
export const STUDIO_CART_ELEMENTS: StudioCartElementDefinition[] = [
  {
    id: "cart-items",
    label: "بنود السلة",
    type: "cart-items-element",
    description: "عرض منتجات السلة مع تعديل الكمية وحذف المنتجات",
    iconName: "ShoppingBagIcon",
  },
  {
    id: "cart-totals",
    label: "إجمالي السلة",
    type: "cart-totals",
    description: "ملخص المجموع الفرعي والشحن والخصم والإجمالي النهائي",
    iconName: "CalculatorIcon",
  },
  {
    id: "checkout-button",
    label: "زر إتمام الطلب",
    type: "checkout-button",
    description: "زر التوجه لصفحة الدفع وإتمام الطلب",
    iconName: "CreditCardIcon",
  },
  {
    id: "coupon",
    label: "كود الخصم",
    type: "coupon",
    description: "حقل إدخال وتفعيل كوبون الخصم",
    iconName: "TagIcon",
  },
];

export interface StudioQuickElement {
  id: string;
  label: string;
  type: string;
  iconName: string;
  defaultSettings?: Record<string, unknown>;
}

export interface StudioPageDefinition {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const STUDIO_PAGES: StudioPageDefinition[] = [
  { id: "home", label: "الرئيسية", icon: "🏠", description: "واجهة المتجر والبنرات الأساسية" },
  { id: "shop", label: "المتجر والكتالوج", icon: "🛍️", description: "شبكة المنتجات والتصنيفات والتصفية" },
  { id: "pdp", label: "صفحة المنتج", icon: "📦", description: "تفاصيل السلعة، الصور، والـ Buybox" },
  { id: "cart", label: "السلة", icon: "🛒", description: "عربة التسوق، الهدايا، والشحن المجاني" },
  { id: "checkout", label: "إتمام الطلب", icon: "💳", description: "صفحة الدفع، بيانات الشحن، والتأكيد" },
  { id: "thank-you", label: "تم الطلب", icon: "✅", description: "تأكيد الطلب ورقم المتابعة والملخص" },
  { id: "collections", label: "المجموعات", icon: "🗂️", description: "كتالوج التشكيلات والمجموعات المميزة" },
  { id: "sale", label: "العروض", icon: "🏷️", description: "عروض التخفيضات والخصومات والباقات الخاصة" },
  { id: "shipping", label: "الشحن والتوصيل", icon: "🚚", description: "سياسة ومواعيد وتكاليف التوصيل" },
  { id: "returns", label: "سياسة الاستبدال والاسترجاع", icon: "🔄", description: "شروط وإجراءات طلب الاسترجاع والاستبدال" },
  { id: "contact", label: "تواصل معنا", icon: "📞", description: "معلومات وبيانات التواصل وساعات العمل" },
  { id: "privacy", label: "الخصوصية", icon: "🔒", description: "سياسة حماية البيانات وخصوصية العملاء" },
  { id: "terms", label: "الشروط والأحكام", icon: "📜", description: "شروط الاستخدام وأحكام الشراء والإرجاع" },
  { id: "registration", label: "تسجيل حساب", icon: "👤", description: "صفحة إنشاء حساب عميل جديد والتسجيل" },
];

export type StudioSectionCategoryId =
  | "all"
  | "hero"
  | "products"
  | "promotions"
  | "trust"
  | "content"
  | "navigation"
  | "pdp"
  | "checkout"
  | "elements"
  | "specialized";

export interface StudioSectionCategory {
  id: StudioSectionCategoryId;
  title: string;
  icon: string;
  description: string;
  types: string[];
}

export const STUDIO_SECTION_CATEGORIES: StudioSectionCategory[] = [
  {
    id: "all",
    title: "جميع الأقسام",
    icon: "⚡",
    description: "استعراض كافة الأقسام والمكونات الجاهزة في المنصة",
    types: [],
  },
  {
    id: "hero",
    title: "البنرات والواجهات الرئيسية",
    icon: "✨",
    description: "بنرات متحركة، صور عريضة، وفيديوهات تقديمية",
    types: ["hero-banner", "hero-sidebar", "hover-cards", "background-video", "shop-hero"],
  },
  {
    id: "products",
    title: "شبكات وعروض المنتجات",
    icon: "🛍️",
    description: "الأكثر مبيعاً، المنتجات المميزة، والكتالوج المصغر",
    types: [
      "featured-products",
      "product-grid",
      "featured-product",
      "combined-listing",
      "collection-tab",
      "scrolling-cards",
      "shop-featured-collection",
      "shop-product-grid",
      "shop-the-look",
      "look-mosaic",
      "look-planner",
      "look-progress",
    ],
  },
  {
    id: "promotions",
    title: "العروض والمؤقتات الترويجية",
    icon: "🔥",
    description: "أشرطة الخصم، مؤقتات العد التنازلي، وباقات التوفير",
    types: [
      "countdown-banner",
      "promo-strip",
      "offer-bento",
      "quantity-offers",
      "bulk-savings",
      "shop-promo-rail",
      "countdown",
      "low-stock",
      "viewer-counter",
      "sold-counter",
      "purchase-fomo",
      "pre-order",
      "back-in-stock",
    ],
  },
  {
    id: "trust",
    title: "الموثوقية والضمان والمراجعات",
    icon: "🛡️",
    description: "آراء العملاء، شارات الأمان، ومميزات الشحن السريع",
    types: [
      "trusted-badges",
      "features-bar",
      "review-circle",
      "delivery-proof",
      "services-grid",
      "reviews",
    ],
  },
  {
    id: "content",
    title: "القصص والمدونات والمحتوى",
    icon: "📖",
    description: "نبذة عن المتجر، الأسئلة الشائعة، ومقالات المدونة",
    types: [
      "richtext",
      "info-content",
      "story-parallax",
      "lookbook-showcase",
      "tiktok-feed",
      "social-gallery",
      "before-after",
      "image-hotspot",
      "article-grid",
    ],
  },
  {
    id: "navigation",
    title: "التصنيفات والفوتر",
    icon: "🧭",
    description: "شريط الفئات المصورة، القوائم السريعة، وتذييل الصفحة",
    types: [
      "featured-collections",
      "shopping-intents",
      "journal-strip",
      "recently-viewed",
      "marketplace-magazine",
      "filters-sidebar",
      "shop-command-bar",
      "newsletter",
    ],
  },
  {
    id: "pdp",
    title: "صفحات وتفاصيل المنتجات",
    icon: "📦",
    description: "تفاصيل المنتجات، معارض الصور، شراء بنقرة واحدة وحزم العينات",
    types: [
      "product-info",
      "product-gallery",
      "pdp-checkout",
      "size-guide",
      "bought-together",
      "conversion-stack",
      "dental-3d-showcase",
      "dental-sample-kit",
      "related-products",
      "product-price",
      "product-rating",
      "product-stock",
      "add-to-cart",
      "product-options",
      "wishlist",
      "compare",
    ],
  },
  {
    id: "checkout",
    title: "السلة والدفع وإنهاء الطلب",
    icon: "💳",
    description: "بنود السلة، حاسبة الإجمالي، شريط الكوبونات ونماذج الدفع السريع",
    types: [
      "cart-items",
      "order-summary",
      "checkout-form",
      "payment",
      "order-confirmation",
      "cart-items-element",
      "cart-totals",
      "checkout-button",
      "coupon",
    ],
  },
  {
    id: "elements",
    title: "العناصر والوحدات التأسيسية",
    icon: "🧱",
    description: "الحاويات، الحلقات، الأزرار، النصوص، والفواصل وتكاملات مصر",
    types: [
      "container",
      "loop",
      "heading",
      "text",
      "image",
      "button",
      "icon",
      "divider",
      "spacer",
      "video",
      "marquee",
      "lottie",
      "whatsapp-cta",
      "payment-methods",
      "shipping-partners",
      "cod-badge",
    ],
  },
  {
    id: "specialized",
    title: "القطاعات المخصصة والأفلييت",
    icon: "🎯",
    description: "مطابقة الموديلات، كيت الأسنان، التوافق القانوني وأدوات التسويق بالعمولة",
    types: [
      "car-model-matcher",
      "automotive-bento",
      "shoe-fit-finder",
      "tech-grid",
      "affiliate-disclosure",
      "affiliate-top-picks",
      "affiliate-quiz",
      "affiliate-faq",
      "affiliate-toc",
      "affiliate-pro-tip",
      "affiliate-sources",
      "affiliate-breadcrumbs",
      "affiliate-article-seo",
      "cookie-consent",
      "privacy-policy",
      "terms-of-use",
      "marketing-consent",
      "member-registration",
      "dental-sample-kit",
    ],
  },
];

export type PageStyleDensity = "compact" | "normal" | "airy";

export interface PageStyleScope {
  accent?: string;
  fontFamily?: string;
  density?: PageStyleDensity;
  radius?: number;
  preset?: string;
  baseFontSize?: number;
  lineHeight?: number;
  headingWeight?: number;
  bodyWeight?: number;
  letterSpacing?: number | string;
}

export type PageStylesMap = Record<string, PageStyleScope>;

export interface PageStylePreset {
  id: "editorial" | "bold" | "minimal" | "dark-luxe" | "loud" | "calm" | (string & {});
  label: string;
  description: string;
  accent: string;
  fontFamily: string;
  density: PageStyleDensity;
  radius: number;
  badgeText?: string;
}

export const PAGE_STYLE_PRESETS: PageStylePreset[] = [
  {
    id: "editorial",
    label: "تحريري راقٍ (Editorial)",
    description: "كريمي وخط سيريف فخم ومسافات متسعة",
    accent: "#8B5E3C",
    fontFamily: "'Playfair Display', 'Amiri', 'Georgia', serif",
    density: "airy",
    radius: 4,
    badgeText: "سيريف هوائي",
  },
  {
    id: "bold",
    label: "جريء وقوي (Bold)",
    description: "أسود وليموني مشع عالي التباين وزوايا حادة",
    accent: "#CCFF00",
    fontFamily: "'Syne', 'Changa', 'Impact', sans-serif",
    density: "normal",
    radius: 0,
    badgeText: "ليموني حاد",
  },
  {
    id: "minimal",
    label: "مينيمال تقني (Minimal)",
    description: "أبيض وأزرق ملكي بهندسة مضغوطة نظيفة",
    accent: "#2563EB",
    fontFamily: "'Inter', 'IBM Plex Sans Arabic', sans-serif",
    density: "compact",
    radius: 8,
    badgeText: "أزرق مضغوط",
  },
  {
    id: "dark-luxe",
    label: "فخامة داكنة (Dark Luxe)",
    description: "فحمي ملكي ولمسات ذهبية وزوايا ناعمة",
    accent: "#D4AF37",
    fontFamily: "'Cinzel', 'Marcellus', 'Cairo', serif",
    density: "normal",
    radius: 12,
    badgeText: "فحمي ذهبي",
  },
  {
    id: "loud",
    label: "صاخب وحيوي (Loud)",
    description: "أحمر ناري وأصفر وطاقة شبابية مرحة",
    accent: "#EF4444",
    fontFamily: "'Cabinet Grotesk', 'Rubik', sans-serif",
    density: "compact",
    radius: 16,
    badgeText: "أحمر دائري",
  },
  {
    id: "calm",
    label: "سكينة وطمأنينة (Calm)",
    description: "تركواز مائي ورمادي فاتح وتوازن مريح",
    accent: "#0D9488",
    fontFamily: "'Plus Jakarta Sans', 'Almarai', sans-serif",
    density: "airy",
    radius: 20,
    badgeText: "تركواز هوائي",
  },
];



export type {
  ThemeBuilderTemplateType,
  ThemeBuilderTargetType,
  ThemeBuilderCondition,
  ThemeBuilderTemplate,
  ThemeBuilderPageContent,
  ResolveTemplateParams,
} from "./utils/themeBuilder";

export type {
  StudioExportedPageData,
  StudioPageDiff,
  StudioImportValidation,
  StudioImportResult,
  ExportPageOptions,
} from "./utils/studioPageExportImport";

export interface StudioPrePublishSnapshot {
  id: string;
  name: "pre-publish";
  createdAt: string;
  snapshot: Record<string, unknown>;
}

/**
 * CMT-1: تعليقات على الكانفس.
 * تُحفظ داخل نفس settings blob (designTokens.comments) — صفر backend وصفر schema.
 * المؤلف = اسم المستخدم فقط (صفر PII: لا بريد ولا هاتف).
 */
export interface StudioCommentAnchor {
  /** نسبة أفقية داخل القسم (0-100) */
  x: number;
  /** نسبة رأسية داخل القسم (0-100) */
  y: number;
}

export interface StudioComment {
  id: string;
  pageKey: string;
  sectionKey: string | null;
  anchor?: StudioCommentAnchor;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

export interface StudioCommentsSettings {
  comments?: StudioComment[];
  [key: string]: unknown;
}
