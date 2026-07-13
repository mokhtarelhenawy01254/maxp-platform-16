import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getAllRegisteredVariantSections, hasRegisteredVariant, resolveVariantAlias } from '../variants';
import { cairoStrideBlueprint, shopOrbitBlueprint } from '../blueprints';

const STOREFRONT_ROOT = path.resolve(process.cwd(), 'src/storefront');
const THEMES_DIR = path.join(STOREFRONT_ROOT, 'themes');

const sectionTypeToFamily: Record<string, string> = {
  'hero-banner': 'HeroBanner',
  'product-grid': 'ProductGrid',
  'product-info': 'ProductInfo',
  'conversion-stack': 'ConversionStack',
  countdown: 'ConversionStack',
  'low-stock': 'ConversionStack',
  'delivery-proof': 'ConversionStack',
  'viewer-counter': 'ConversionStack',
  'sold-counter': 'ConversionStack',
  'purchase-fomo': 'ConversionStack',
  'pre-order': 'ConversionStack',
  'back-in-stock': 'ConversionStack',
  'trusted-badges': 'ConversionStack',
  'bulk-savings': 'ConversionStack',
  'quantity-offers': 'QuantityOffers',
  newsletter: 'Newsletter',
  'size-guide': 'SizeGuide',
  reviews: 'ReviewsSection',
  'related-products': 'RelatedProducts',
  'bought-together': 'BoughtTogetherSection',
  'product-gallery': 'ProductGallery',
};

const collectThemeVariants = () => {
  const entries: Array<{ source: string; sectionType: string; variant: string }> = [];
  for (const file of fs.readdirSync(THEMES_DIR)) {
    if (!file.endsWith('.json')) continue;
    const json = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), 'utf8'));
    for (const page of Object.values<any>(json.pages || {})) {
      for (const section of page.sections || []) {
        if (section && typeof section === 'object' && section.type && section.variant) {
          entries.push({ source: file, sectionType: section.type, variant: String(section.variant) });
        }
      }
    }
  }
  return entries;
};

const collectBlueprintVariants = () => {
  const blueprints = [shopOrbitBlueprint, cairoStrideBlueprint];
  const entries: Array<{ source: string; sectionType: string; variant: string }> = [];
  for (const blueprint of blueprints) {
    for (const page of Object.values<any>(blueprint.pages || {})) {
      for (const section of page.sections || []) {
        if (section && typeof section === 'object' && section.type && section.variant) {
          entries.push({ source: blueprint.id, sectionType: section.type, variant: String(section.variant) });
        }
      }
    }
  }
  return entries;
};

describe('variant enforcement', () => {
  it('keeps registry-backed section families available', () => {
    expect(getAllRegisteredVariantSections()).toEqual(
      expect.arrayContaining([
        'HeroBanner',
        'ProductGrid',
        'ProductInfo',
        'ConversionStack',
        'QuantityOffers',
        'Newsletter',
        'SizeGuide',
        'ReviewsSection',
        'RelatedProducts',
        'BoughtTogetherSection',
        'ProductGallery',
      ]),
    );
  });

  it('ensures theme variants map to a registered variant or known alias', () => {
    const unknowns: string[] = [];
    for (const entry of collectThemeVariants()) {
      const family = sectionTypeToFamily[entry.sectionType];
      if (!family) continue;
      const normalized = resolveVariantAlias(family, entry.variant.trim().toLowerCase());
      if (!hasRegisteredVariant(family, normalized)) {
        unknowns.push(`${entry.source}:${entry.sectionType}:${entry.variant}`);
      }
    }
    expect(unknowns).toEqual([]);
  });

  it('ensures exported blueprint variants map to a registered variant or known alias', () => {
    const unknowns: string[] = [];
    for (const entry of collectBlueprintVariants()) {
      const family = sectionTypeToFamily[entry.sectionType];
      if (!family) continue;
      const normalized = resolveVariantAlias(family, entry.variant.trim().toLowerCase());
      if (!hasRegisteredVariant(family, normalized)) {
        unknowns.push(`${entry.source}:${entry.sectionType}:${entry.variant}`);
      }
    }
    expect(unknowns).toEqual([]);
  });
});
