import type { MarketingProduct } from "../marketing-studio/types";

export type AspectRatioType = "1:1" | "9:16" | "4:5" | "16:9";

export type CreativeModality = "lifestyle" | "on_model" | "direct_response" | "packshot";

export type ShadowType = "contact" | "directional" | "subtle" | "none";

export type ProductCategory =
  | "shoes"
  | "skincare"
  | "perfume"
  | "electronics"
  | "apparel"
  | "watches"
  | "food"
  | "home"
  | "custom";

export interface BrandLogoSettings {
  url: string | null;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size: "sm" | "md" | "lg";
  opacity: number; // 0.1 to 1.0
  show: boolean;
}

export interface BrandKitSettings {
  isLocked: boolean;
  primaryColor: string;
  accentColor: string;
  aestheticMood: "minimalist-luxury" | "bold-vibrant" | "organic-earthy" | "cyber-dark" | "soft-pastel";
}

export type BatchCountType = 1 | 2 | 4;

export interface ProductTransformSettings {
  x: number; // percentage offset (-50 to 50)
  y: number; // percentage offset (-50 to 50)
  scale: number; // 0.5 to 1.5
  rotation: number; // -45 to 45 degrees
  shadowType: ShadowType;
}

export interface CreativeAngleSuggestion {
  id: string;
  titleAr: string;
  badge: string;
  rationale: string;
  prompt: string;
  modality: CreativeModality;
}

export interface ImageModelOption {
  id: string;
  nameAr: string;
  nameEn: string;
  badge?: string;
  latencyP95?: string;
  description?: string;
  supportsProductReference?: boolean;
  resolution?: string;
}

export const ALLOWED_IMAGE_MODELS: ImageModelOption[] = [
  {
    id: "openai/gpt-image-2",
    nameAr: "OpenAI GPT Image 2",
    nameEn: "GPT Image 2",
    badge: "موصى به للتجارة",
    latencyP95: "18-24s",
    description: "الأعلى في تجسيد الملمس والخامات الواقعية ودعم إدخال مراجع المنتجات والإعلانات المركبة.",
    supportsProductReference: true,
    resolution: "2048x2048",
  },
  {
    id: "google/gemini-3.1-flash-image",
    nameAr: "Gemini 3.1 Flash Image",
    nameEn: "Gemini 3.1 Flash",
    badge: "فائق السرعة",
    latencyP95: "4-7s",
    description: "توليد فوري فائق السرعة واقتصادي جداً، ممتاز للاختبار وتوليد الأفكار اللحظية.",
    supportsProductReference: true,
    resolution: "1024x1024",
  },
  {
    id: "google/gemini-3-pro-image",
    nameAr: "Gemini 3 Pro Image",
    nameEn: "Gemini 3 Pro",
    badge: "دقة سينمائية",
    latencyP95: "12-16s",
    description: "تراكيب بصرية متطورة مع توزيع إضاءة سينمائية وخلفيات فنية غنية بالتفاصيل.",
    supportsProductReference: true,
    resolution: "2048x2048",
  },
  {
    id: "x-ai/grok-imagine-image-quality",
    nameAr: "xAI Grok Imagine",
    nameEn: "Grok Imagine",
    badge: "طاقة بصرية",
    latencyP95: "9-13s",
    description: "خلفيات بصرية جريئة بألوان مشبعة وتباين عالي تناسب إعلانات الشباب والسوشيال ميديا.",
    supportsProductReference: false,
    resolution: "1024x1024",
  },
  {
    id: "openai/gpt-5.4-image-2",
    nameAr: "OpenAI GPT 5.4 Image",
    nameEn: "GPT 5.4 Image",
    badge: "الجيل القادم",
    latencyP95: "25-30s",
    description: "نموذج الجيل القادم لإنتاج صور فوتوغرافية فائقة الواقعية بجودة إعلانات الوكالات العالمية.",
    supportsProductReference: true,
    resolution: "2048x2048",
  },
  {
    id: "openai/gpt-image-1-mini",
    nameAr: "OpenAI GPT Image Mini",
    nameEn: "GPT Image Mini",
    latencyP95: "8-11s",
    description: "إصدار خفيف واقتصادي لتوليد المسودات الأولية السريعة.",
    supportsProductReference: false,
    resolution: "1024x1024",
  },
];

export interface CreativePreset {
  id: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  category: CreativeModality;
  promptModifier: string;
  lightingStyle: string;
  previewGradient: string;
  badgeColor?: string;
}

export interface CanvasOverlaySettings {
  headline: string;
  subheadline: string;
  price: number | null;
  originalPrice?: number | null;
  currency: string;
  discountBadge: string;
  callToAction: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  textPosition: "top-left" | "top-right" | "top-center" | "bottom-left" | "bottom-right" | "bottom-center";
  showBadge: boolean;
  showPrice: boolean;
  showCta: boolean;
  showProductLayer: boolean; // toggle whether the cut-out product sits on top
  isBackgroundRemoved: boolean; // whether smart chroma cut-out is active
  productTransform: ProductTransformSettings;
  logo: BrandLogoSettings;
}

export interface CreativeGenerationState {
  isGenerating: boolean;
  activeBackgroundUrl: string | null;
  cutoutProductUrl: string | null;
  aspectRatio: AspectRatioType;
  selectedPresetId: string;
  customPrompt: string;
  overlay: CanvasOverlaySettings;
}

export type { MarketingProduct };
