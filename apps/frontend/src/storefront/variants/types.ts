export type StorefrontVariantStatus =
  | 'active'
  | 'implemented-now'
  | 'candidate'
  | 'future-system-expansion';

export type StorefrontVariantDensity = 'low' | 'low-medium' | 'medium' | 'medium-high' | 'high';

export interface StorefrontVariantDefinition {
  id: string;
  section: string;
  purpose: string;
  bestPages: string[];
  bestArchetypes: string[];
  rtlSuitability: 'low' | 'medium' | 'medium-high' | 'high';
  density: StorefrontVariantDensity;
  tone: string;
  status: StorefrontVariantStatus;
  notes?: string;
}

export type StorefrontVariantRegistry = Record<string, readonly StorefrontVariantDefinition[]>;
