import { StorefrontProduct, ProductCategory } from "./StorefrontTypes";

/**
 * 🛠️ Preview System Types
 * Strict interfaces for the template preview & mockup engine.
 */

export interface BlueprintData {
  capturedAt: string;
  originCompanyId: string;
  settings: Record<string, unknown>;
  categories: ProductCategory[];
  products: Record<string, unknown>[]; // Raw products from blueprint
}

export interface PreviewDemoData {
  products: StorefrontProduct[];
  categories: ProductCategory[];
  isBlueprint: boolean;
}

export interface PreviewTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  content: {
    sections: Array<Record<string, unknown> | string>;
    settings: Record<string, unknown>;
    designTokens?: Record<string, unknown>;
    demoDataBlueprint?: BlueprintData;
    pages?: Array<{
      slug: string;
      pageType: string;
      sections: Array<Record<string, unknown> | string>;
      [key: string]: unknown;
    }>;
  };
  isSystem?: boolean;
  isPremium?: boolean;
}

export interface PreviewShellConfig {
  variant: "default" | "minimal" | "editorial" | "bold" | "grill";
  logoGlyph?: string;
  navLabel?: string;
}
