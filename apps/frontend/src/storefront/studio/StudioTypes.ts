export type StudioDeviceMode = "desktop" | "tablet" | "mobile";

export type StudioLeftRailTab =
  | "elements"
  | "layers"
  | "pages"
  | "media"
  | "styles"
  | "code"
  | "ai"
  | "settings";

export type StudioLeftPanelTab = "layers" | "theme" | "pages" | "elements";

export type StudioInspectorTab = "design" | "layout" | "content" | "interactions" | "style" | "visibility";

export type StudioZoomLevel = number;

export interface StudioDimensions {
  x: number;
  y: number;
  w: number;
  h: number;
}

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
  { id: "sale", label: "العروض", icon: "🏷️", description: "عروض التخفيضات والخصومات والباقات الخاصة" },
  { id: "collections", label: "المجموعات", icon: "🗂️", description: "كتالوج التشكيلات والمجموعات المميزة" },
  { id: "size-guide", label: "دليل المقاسات", icon: "📐", description: "جدول المقاسات وإرشادات اختيار القياس المناسب" },
  { id: "shipping", label: "الشحن والتوصيل", icon: "🚚", description: "سياسة ومواعيد وتكاليف التوصيل" },
  { id: "privacy", label: "الخصوصية", icon: "🔒", description: "سياسة حماية البيانات وخصوصية العملاء" },
  { id: "terms", label: "الشروط والأحكام", icon: "📜", description: "شروط الاستخدام وأحكام الشراء والإرجاع" },
];

export interface StudioSectionCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  types: string[];
}

export const STUDIO_SECTION_CATEGORIES: StudioSectionCategory[] = [
  {
    id: "hero",
    title: "البنرات والواجهات الرئيسية",
    icon: "✨",
    description: "بنرات متحركة، صور عريضة، وفيديوهات تقديمية",
    types: ["hero-banner", "hero-sidebar", "hover-cards", "background-video"],
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
      "filters-sidebar",
      "shop-command-bar",
      "newsletter",
    ],
  },
];
