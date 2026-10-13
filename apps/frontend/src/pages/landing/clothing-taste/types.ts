export interface PlatformToolItem {
  id: string;
  name: string;
  category: "store" | "inventory" | "shipping" | "operations" | "marketing";
  description: string;
  standalonePrice: number;
  keyFeature: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  pricePeriod: string;
  popular: boolean;
  features: string[];
  ctaText: string;
  action: "free-register" | "payg-register" | "bundle-checkout";
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}
