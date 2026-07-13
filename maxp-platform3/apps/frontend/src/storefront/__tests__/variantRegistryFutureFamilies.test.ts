import { describe, expect, it } from 'vitest';
import {
  getDefaultRegisteredVariantId,
  hasRegisteredVariant,
  listRegisteredVariantIds,
} from '../variants';

describe('variant registry future-ready families', () => {
  it('registers baseline default variants for planned section families', () => {
    expect(getDefaultRegisteredVariantId('OfferBento')).toBe('category-promo');
    expect(getDefaultRegisteredVariantId('FeaturedCollections')).toBe('standard-showcase');
    expect(getDefaultRegisteredVariantId('FeaturesBar')).toBe('trust-strip');
    expect(getDefaultRegisteredVariantId('ShopCommandBar')).toBe('default-discovery');
    expect(getDefaultRegisteredVariantId('ShopPromoRail')).toBe('trust-rail');
  });

  it('keeps candidate variants queryable for future implementation passes', () => {
    expect(listRegisteredVariantIds('OfferBento')).toEqual(
      expect.arrayContaining(['category-promo', 'daily-picks', 'campaign-stack']),
    );
    expect(listRegisteredVariantIds('ShopCommandBar')).toEqual(
      expect.arrayContaining(['default-discovery', 'marketplace-dense', 'minimal-toolbar']),
    );
  });

  it('allows registry checks for planned section families', () => {
    expect(hasRegisteredVariant('FeaturesBar', 'trust-strip')).toBe(true);
    expect(hasRegisteredVariant('ShopPromoRail', 'trust-rail')).toBe(true);
    expect(hasRegisteredVariant('FeaturedCollections', 'standard-showcase')).toBe(true);
  });
});
