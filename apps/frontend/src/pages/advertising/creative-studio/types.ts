import type { MarketingProduct } from "../marketing-studio/types";

export type AspectRatioType = "1:1" | "9:16" | "16:9";

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
