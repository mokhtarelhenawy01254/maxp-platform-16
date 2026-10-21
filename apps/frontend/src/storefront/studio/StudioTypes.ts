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

export interface StudioSelectedElement {
  sectionKey: string;
  type: "heading" | "subtitle" | "button" | "image" | "badge" | "custom";
  label: string;
  field: string;
  linkField?: string;
  altField?: string;
  currentText?: string;
  currentLink?: string;
  currentImage?: string;
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

export type PageStyleDensity = "compact" | "normal" | "airy";

export interface PageStyleScope {
  accent?: string;
  fontFamily?: string;
  density?: PageStyleDensity;
  radius?: number;
  preset?: string;
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

