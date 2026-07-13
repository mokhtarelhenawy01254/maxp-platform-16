import { describe, expect, it } from 'vitest';
import {
  getDefaultRegisteredVariantId,
  hasRegisteredVariant,
} from '../variants';

describe('variant registry implementation batch 2', () => {
  it('keeps default variants for registry-first section families', () => {
    expect(getDefaultRegisteredVariantId('ShopCommandBar')).toBe('default-discovery');
    expect(getDefaultRegisteredVariantId('FeaturedCollections')).toBe('standard-showcase');
    expect(getDefaultRegisteredVariantId('ShopPromoRail')).toBe('trust-rail');
    expect(getDefaultRegisteredVariantId('OfferBento')).toBe('category-promo');
    expect(getDefaultRegisteredVariantId('FeaturesBar')).toBe('trust-strip');
  });

  it('keeps candidate variant ids available for implementation-aware routing', () => {
    expect(hasRegisteredVariant('ShopCommandBar', 'marketplace-dense')).toBe(true);
    expect(hasRegisteredVariant('FeaturedCollections', 'editorial-categories')).toBe(true);
    expect(hasRegisteredVariant('ShopPromoRail', 'campaign-rail')).toBe(true);
    expect(hasRegisteredVariant('OfferBento', 'daily-picks')).toBe(true);
    expect(hasRegisteredVariant('FeaturesBar', 'service-clarity')).toBe(true);
  });
});
