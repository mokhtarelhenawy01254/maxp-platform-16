import type { MarketingProduct } from "../marketing-studio/types";

export type AspectRatioType = "1:1" | "9:16" | "16:9";

export interface ImageModelOption {
  id: string;
  nameAr: string;
  nameEn: string;
  badge?: string;
}

export const ALLOWED_IMAGE_MODELS: ImageModelOption[] = [
  { id: "openai/gpt-image-2", nameAr: "OpenAI GPT Image 2", nameEn: "GPT Image 2", badge: "موصى به" },
  { id: "google/gemini-3.1-flash-image", nameAr: "Gemini 3.1 Flash Image", nameEn: "Gemini 3.1 Flash", badge: "سريع" },
  { id: "google/gemini-3-pro-image", nameAr: "Gemini 3 Pro Image", nameEn: "Gemini 3 Pro", badge: "برو" },
  { id: "openai/gpt-5.4-image-2", nameAr: "OpenAI GPT 5.4 Image", nameEn: "GPT 5.4 Image" },
  { id: "openai/gpt-image-1-mini", nameAr: "OpenAI GPT Image Mini", nameEn: "GPT Image Mini" },
  { id: "x-ai/grok-imagine-image-quality", nameAr: "xAI Grok Imagine", nameEn: "Grok Imagine" },
];

export interface CreativePreset {
  id: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  category: "podium" | "luxury" | "lifestyle" | "cyber" | "seasonal" | "studio";
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
