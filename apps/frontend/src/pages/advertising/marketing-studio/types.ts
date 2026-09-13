/**
 * Types for Marketing AI Studio (Cockpit)
 */

export interface MarketingProduct {
  id: string;
  name: string;
  slug?: string;
  price: number;
  cost?: number;
  stock?: number;
  mainImage?: string | null;
  images?: string[];
  variants?: Array<{ id?: string; name?: string; image?: string | null; images?: string[] | null }>;
  category?: string;
}

export interface MarketingCampaignDraft {
  id: string;
  productName: string;
  angleTitle: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  budgetAmount: number;
  currency: string;
  targetAudience: string;
  format: string;
  destinationUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "PENDING_APPROVAL";
}

export interface MarketingQuickPrompt {
  label: string;
  icon?: string;
  generatePrompt: (product?: MarketingProduct | null) => string;
}
