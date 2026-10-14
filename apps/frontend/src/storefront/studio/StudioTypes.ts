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

export type StudioZoomLevel = 0.5 | 0.75 | 1 | 1.25;

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
    types: ["hero-banner", "hero", "split-hero", "cinematic-banner", "grid-hero"],
  },
  {
    id: "products",
    title: "شبكات وعروض المنتجات",
    icon: "🛍️",
    description: "الأكثر مبيعاً، المنتجات المميزة، والكتالوج المصغر",
    types: ["featured-products", "product-grid", "flash-sale", "product-slider", "recent-products"],
  },
  {
    id: "promotions",
    title: "العروض والمؤقتات الترويجية",
    icon: "🔥",
    description: "أشرطة الخصم، مؤقتات العد التنازلي، وباقات التوفير",
    types: ["sale-countdown", "promotion-banner", "deal-of-the-day", "coupon-strip", "offer-bento", "shoppable-reels", "flash-sale-timer"],
  },
  {
    id: "trust",
    title: "الموثوقية والضمان والمراجعات",
    icon: "🛡️",
    description: "آراء العملاء، شارات الأمان، ومميزات الشحن السريع",
    types: ["trust-badges", "customer-reviews", "testimonials-slider", "press-features", "features-bar"],
  },
  {
    id: "content",
    title: "القصص والمدونات والمحتوى",
    icon: "📖",
    description: "نبذة عن المتجر، الأسئلة الشائعة، ومقالات المدونة",
    types: ["rich-text", "about-story", "story-parallax", "faq-accordion", "blog-feed", "video-showcase"],
  },
  {
    id: "navigation",
    title: "التصنيفات والفوتر",
    icon: "🧭",
    description: "شريط الفئات المصورة، القوائم السريعة، وتذييل الصفحة",
    types: ["featured-collections", "category-grid", "brand-strip", "footer-section", "newsletter"],
  },
];
