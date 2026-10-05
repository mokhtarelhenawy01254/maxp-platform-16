import { describe, expect, it } from 'vitest';
import {
  getAllRegisteredVariantSections,
  getRegisteredVariant,
  hasRegisteredVariant,
  listRegisteredVariantIds,
  requireRegisteredVariant,
  resolveSectionVariant,
  storefrontVariantRegistry,
} from '../variants';

describe('storefront variant registry', () => {
  it('registers key section families', () => {
    expect(getAllRegisteredVariantSections()).toEqual(
      expect.arrayContaining([
        'HeroBanner',
        'ProductGrid',
        'ConversionStack',
        'ReviewsSection',
        'LookbookShowcase',
        'RelatedProducts',
        'JournalStrip',
      ]),
    );
  });

  it('resolves known live variants', () => {
    expect(hasRegisteredVariant('HeroBanner', 'split-panel')).toBe(true);
    expect(hasRegisteredVariant('HeroBanner', 'retail-command')).toBe(true);
    expect(hasRegisteredVariant('HeroBanner', 'soft-showcase')).toBe(true);
    expect(hasRegisteredVariant('HeroBanner', 'boutique-muse')).toBe(true);
    expect(hasRegisteredVariant('HeroBanner', 'modest-cascade')).toBe(true);
    expect(hasRegisteredVariant('HeroBanner', 'legacy-image-slider')).toBe(true);
    expect(hasRegisteredVariant('HeroBanner', 'butcher-counter')).toBe(true);
    expect(hasRegisteredVariant('HeroBanner', 'butcher-atelier')).toBe(true);
    expect(hasRegisteredVariant('FeaturedCollections', 'tech-decision-lanes')).toBe(true);
    expect(hasRegisteredVariant('FeaturedCollections', 'catalog-pills')).toBe(true);
    expect(hasRegisteredVariant('FeaturedCollections', 'butcher-cut-map')).toBe(true);
    expect(hasRegisteredVariant('FeaturedCollections', 'travel-postcards')).toBe(true);
    expect(hasRegisteredVariant('FeaturedCollections', 'legacy-circle-categories')).toBe(true);
    expect(hasRegisteredVariant('OfferBento', 'bundle-matrix')).toBe(true);
    expect(hasRegisteredVariant('OfferBento', 'boutique-duo')).toBe(true);
    expect(hasRegisteredVariant('ShopCommandBar', 'spec-console')).toBe(true);
    expect(hasRegisteredVariant('ShopCommandBar', 'occasion-planner')).toBe(true);
    expect(hasRegisteredVariant('ShopCommandBar', 'butcher-cut-console')).toBe(true);
    expect(hasRegisteredVariant('FeaturesBar', 'system-assurance')).toBe(true);
    expect(hasRegisteredVariant('FeaturesBar', 'butcher-proof-board')).toBe(true);
    expect(hasRegisteredVariant('ProductInfo', 'command-specs')).toBe(true);
    expect(hasRegisteredVariant('RelatedProducts', 'command-alternatives')).toBe(true);
    expect(hasRegisteredVariant('ReviewsSection', 'command-proof')).toBe(true);
    expect(hasRegisteredVariant('CartItems', 'market-basket')).toBe(true);
    expect(hasRegisteredVariant('CartItems', 'nature-cart')).toBe(true);
    expect(hasRegisteredVariant('OrderSummary', 'market-summary')).toBe(true);
    expect(hasRegisteredVariant('OrderSummary', 'nature-summary')).toBe(true);
    expect(hasRegisteredVariant('CheckoutForm', 'market-checkout')).toBe(true);
    expect(hasRegisteredVariant('CheckoutForm', 'nature-checkout')).toBe(true);
    expect(hasRegisteredVariant('PaymentSection', 'market-payment')).toBe(true);
    expect(hasRegisteredVariant('PaymentSection', 'nature-payment')).toBe(true);
    expect(hasRegisteredVariant('OrderConfirmation', 'market-aftercare')).toBe(true);
    expect(hasRegisteredVariant('OrderConfirmation', 'nature-aftercare')).toBe(true);
    expect(hasRegisteredVariant('OrderConfirmation', 'command-aftercare')).toBe(true);
    expect(hasRegisteredVariant('ProductGrid', 'luxury-card')).toBe(true);
    expect(hasRegisteredVariant('ProductGrid', 'retail-air-grid')).toBe(true);
    expect(hasRegisteredVariant('ProductGrid', 'boutique-shelf')).toBe(true);
    expect(hasRegisteredVariant('ProductGrid', 'legacy-compact-listing')).toBe(true);
    expect(hasRegisteredVariant('ProductGrid', 'butcher-cut-grid')).toBe(true);
    expect(hasRegisteredVariant('ProductGrid', 'butcher-atelier-grid')).toBe(true);
    expect(hasRegisteredVariant('LookbookShowcase', 'boutique-storyboard')).toBe(true);
    expect(hasRegisteredVariant('Newsletter', 'editorial-strip')).toBe(true);
    expect(hasRegisteredVariant('JournalStrip', 'editorial-cards')).toBe(true);
    expect(hasRegisteredVariant('ProductGallery', 'masonry')).toBe(true);
    expect(hasRegisteredVariant('RelatedProducts', 'overlay')).toBe(true);
  });

  it('returns metadata for a known variant', () => {
    expect(getRegisteredVariant('ConversionStack', 'editorial')).toMatchObject({
      section: 'ConversionStack',
      id: 'editorial',
      status: expect.any(String),
    });
  });

  it('keeps variant ids unique within each section family', () => {
    for (const variants of Object.values(storefrontVariantRegistry)) {
      const ids = variants.map((variant) => variant.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('lists variant ids for a section family', () => {
    expect(listRegisteredVariantIds('BoughtTogetherSection')).toEqual([
      'stacked',
      'compact',
      'editorial',
      'complete-look',
      'pairing-rail',
      'gift-pairings',
    ]);
  });

  it('throws on unknown explicit variants instead of silently falling back', () => {
    expect(() =>
      requireRegisteredVariant('HeroBanner', 'not-a-real-variant', 'centered'),
    ).toThrow(/Unknown variant/);
  });

  it('resolves aliases through the centralized section helper', () => {
    expect(resolveSectionVariant('HeroBanner', 'split', 'centered')).toBe('split-panel');
    expect(resolveSectionVariant('Newsletter', 'colored', 'standard')).toBe('split-panel');
    expect(resolveSectionVariant('ProductGallery', 'slider', 'standard')).toBe('standard');
    expect(resolveSectionVariant('RelatedProducts', 'editorial-card', 'standard')).toBe('editorial');
    expect(resolveSectionVariant('RelatedProducts', 'luxury-card', 'standard')).toBe('luxury');
    expect(resolveSectionVariant('RelatedProducts', 'overlay-card', 'standard')).toBe('overlay');
    expect(resolveSectionVariant('LookbookShowcase', 'masonry', 'standard')).toBe('masonry');
    expect(resolveSectionVariant('JournalStrip', 'carousel', 'editorial-cards')).toBe('carousel');
    expect(resolveSectionVariant('JournalStrip', 'grid', 'editorial-cards')).toBe('grid');
  });

  it('safely falls back to defaultVariant when resolveSectionVariant encounters an unknown variant', () => {
    expect(resolveSectionVariant('LookbookShowcase', 'completely-unknown-variant', 'standard')).toBe('standard');
    expect(resolveSectionVariant('JournalStrip', 'invalid-variant', 'editorial-cards')).toBe('editorial-cards');
  });
});
