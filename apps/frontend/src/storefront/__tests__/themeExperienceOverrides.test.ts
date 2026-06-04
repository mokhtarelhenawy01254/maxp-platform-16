import { describe, expect, it } from 'vitest';
import { resolveStorefrontTheme } from '../engine/themeResolver';
import { TARGET_THEME_EXPERIENCE_IDS } from '../themes/experienceOverrides';
import type { StorefrontSectionConfig } from '../types/theme.types';

const getSectionType = (section: string | StorefrontSectionConfig) =>
  typeof section === 'string' ? section : section.type;

const getSectionTypes = (
  sections: Array<string | StorefrontSectionConfig> | undefined,
) => (sections || []).map(getSectionType);

const findSection = (
  sections: Array<string | StorefrontSectionConfig> | undefined,
  type: string,
) =>
  (sections || []).find(
    (section) => typeof section !== 'string' && section.type === type,
  ) as StorefrontSectionConfig | undefined;

describe('storefront theme experience overrides', () => {
  it.each(TARGET_THEME_EXPERIENCE_IDS)(
    'ships a richer commerce flow for %s',
    (themeId) => {
      const resolved = resolveStorefrontTheme({ themeId });
      const shopTypes = getSectionTypes(resolved.pages.shop.sections);
      const checkoutTypes = getSectionTypes(resolved.pages.checkout.sections);
      const saleTypes = getSectionTypes(resolved.pages.sale?.sections);
      const collectionsTypes = getSectionTypes(resolved.pages.collections?.sections);
      const thankYouTypes = getSectionTypes(resolved.pages['thank-you']?.sections);

      expect(shopTypes).toContain('product-grid');
      expect(shopTypes).toContain('shop-command-bar');

      expect(checkoutTypes).toEqual(
        expect.arrayContaining(['cart-items', 'checkout-form', 'payment']),
      );

      expect(saleTypes).toContain('product-grid');
      expect(collectionsTypes).toEqual(
        expect.arrayContaining(['featured-collections', 'product-grid']),
      );
      expect(thankYouTypes).toContain('order-confirmation');

      const saleGrid = findSection(resolved.pages.sale?.sections, 'product-grid');
      expect(saleGrid?.settings).toEqual(
        expect.objectContaining({ saleOnly: true }),
      );
    },
  );

  it('keeps khemet-luxe-eg checkout in a sidebar flow without auto-injected cart items', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'khemet-luxe-eg' });
    const checkoutTypes = getSectionTypes(resolved.pages.checkout.sections);

    expect(checkoutTypes).toEqual([
      'checkout-form',
      'payment',
      'order-summary',
    ]);
    expect(resolved.pages.checkout.layoutHint).toBe('sidebar-right');
    expect(findSection(resolved.pages.checkout.sections, 'checkout-form')?.variant).toBe(
      'soft-flow',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'boutique-payment',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.settings).toEqual(
      expect.objectContaining({
        showSummaryCard: false,
        showAssuranceCard: false,
        showNextSteps: false,
      }),
    );
    expect(findSection(resolved.pages.checkout.sections, 'order-summary')?.variant).toBe(
      'boutique-summary',
    );
    expect(findSection(resolved.pages.checkout.sections, 'order-summary')?.settings).toEqual(
      expect.objectContaining({
        showLineItems: true,
        hideCheckoutButton: true,
      }),
    );
  });

  it('keeps the thank-you messaging differentiated across the target themes', () => {
    const titles = TARGET_THEME_EXPERIENCE_IDS.map((themeId) => {
      const resolved = resolveStorefrontTheme({ themeId });
      const confirmation = findSection(
        resolved.pages['thank-you']?.sections,
        'order-confirmation',
      );

      return String(confirmation?.settings?.title || '').trim();
    });

    expect(new Set(titles).size).toBe(TARGET_THEME_EXPERIENCE_IDS.length);
  });

  it('gives cafe-demo a coffee-first commerce journey instead of the generic market fallback', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'cafe-demo' });

    expect(findSection(resolved.pages.shop.sections, 'hero-banner')?.variant).toBe(
      'split-panel',
    );
    expect(findSection(resolved.pages.shop.sections, 'shopping-intents')?.settings).toEqual(
      expect.objectContaining({
        title: 'كل لحظة لها مدخل أوضح',
      }),
    );
    expect(findSection(resolved.pages.shop.sections, 'product-grid')?.settings).toEqual(
      expect.objectContaining({
        title: 'كل منيو Müt Coffee',
      }),
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'compact',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.settings).toEqual(
      expect.objectContaining({
        showSummaryCard: false,
      }),
    );
    expect(
      findSection(resolved.pages.collections?.sections, 'featured-collections')?.settings,
    ).toEqual(
      expect.objectContaining({
        limit: 4,
      }),
    );
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.settings)
      .toEqual(
        expect.objectContaining({
          title: 'طلب القهوة اتثبت',
        }),
      );
  });

  it('gives furniture-demo a room-led premium commerce journey instead of the generic market fallback', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'furniture-demo' });

    expect(findSection(resolved.pages.shop.sections, 'hero-banner')?.variant).toBe(
      'luxury-minimal',
    );
    expect(findSection(resolved.pages.shop.sections, 'product-grid')?.variant).toBe(
      'luxury-card',
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'editorial',
    );
    expect(findSection(resolved.pages.pdp.sections, 'related-products')?.variant).toBe(
      'luxury',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.settings).toEqual(
      expect.objectContaining({
        showSummaryCard: false,
      }),
    );
    expect(
      findSection(resolved.pages.collections?.sections, 'featured-collections')?.settings,
    ).toEqual(
      expect.objectContaining({
        limit: 4,
      }),
    );
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.settings)
      .toEqual(
        expect.objectContaining({
          title: 'تم تسجيل طلب LUXURE',
        }),
      );
  });

  it('gives max-care-go a pharmacy-first mobile commerce journey instead of the generic market fallback', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'max-care-go' });

    expect(findSection(resolved.pages.shop.sections, 'hero-banner')?.variant).toBe(
      'split-panel',
    );
    expect(findSection(resolved.pages.shop.sections, 'shopping-intents')?.settings).toEqual(
      expect.objectContaining({
        title: 'ما الاحتياج الذي تريد حسمه اليوم؟',
      }),
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'market-basket',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'market-payment',
    );
    expect(
      findSection(resolved.pages.prescription?.sections, 'info-content')?.settings,
    ).toEqual(
      expect.objectContaining({
        title: 'ابدأ من الوصفة بدل ما تضيع بين صفحات الدعم والمتجر',
      }),
    );
    expect(findSection(resolved.pages.rx?.sections, 'promo-strip')?.settings).toEqual(
      expect.objectContaining({
        badge: 'Rx Follow-up',
      }),
    );
    expect(
      findSection(resolved.pages.collections?.sections, 'featured-collections')?.settings,
    ).toEqual(
      expect.objectContaining({
        limit: 4,
      }),
    );
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.settings)
      .toEqual(
        expect.objectContaining({
          title: 'تم تثبيت طلب Max Care Go',
        }),
      );
  });

  it('gives elessi-carry-lane a bag-led conversion journey instead of the generic boutique fallback', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'elessi-carry-lane' });

    expect(findSection(resolved.pages.shop.sections, 'shop-command-bar')?.variant).toBe(
      'elessi-bag-toolbar',
    );
    expect(findSection(resolved.pages.shop.sections, 'product-grid')?.variant).toBe(
      'elessi-bag-shop-grid',
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'wardrobe-cart',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'boutique-payment',
    );
    expect(findSection(resolved.pages.sale?.sections, 'product-grid')?.variant).toBe(
      'elessi-bag-shop-grid',
    );
    expect(
      findSection(resolved.pages.collections?.sections, 'featured-collections')?.variant,
    ).toBe('elessi-bag-categories');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant)
      .toBe('soft-thanks');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.settings)
      .toEqual(
        expect.objectContaining({
          title: 'تم تسجيل طلب Carry Lane',
        }),
      );
  });

  it('gives elessi-pedal-lab a bike-led commerce journey instead of a thin technical catalog', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'elessi-pedal-lab' });

    expect(findSection(resolved.pages.shop.sections, 'shopping-intents')?.settings).toEqual(
      expect.objectContaining({
        title: 'أي رحلة أو ترقية تريد حسمها أولًا؟',
      }),
    );
    expect(findSection(resolved.pages.shop.sections, 'shop-command-bar')?.variant).toBe(
      'elessi-bike-toolbar',
    );
    expect(findSection(resolved.pages.shop.sections, 'product-grid')?.variant).toBe(
      'elessi-bike-shop-grid',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'elessi-bike-gallery',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'elessi-bike-buybox',
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'command-cart',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'command-payment',
    );
    expect(findSection(resolved.pages.sale?.sections, 'product-grid')?.variant).toBe(
      'elessi-bike-shop-grid',
    );
    expect(
      findSection(resolved.pages.collections?.sections, 'featured-collections')?.variant,
    ).toBe('elessi-bike-panels');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant)
      .toBe('command-aftercare');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.settings)
      .toEqual(
        expect.objectContaining({
          title: 'تم تثبيت طلب Pedal Lab',
        }),
      );
  });

  it('gives elessi-harvest-fold a grocery-first commerce journey instead of a thin organic catalog', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'elessi-harvest-fold' });

    expect(findSection(resolved.pages.shop.sections, 'shopping-intents')?.settings).toEqual(
      expect.objectContaining({
        title: 'أي رف أو صندوق يقفل طلب البيت أسرع؟',
      }),
    );
    expect(findSection(resolved.pages.shop.sections, 'shop-command-bar')?.variant).toBe(
      'elessi-organic-toolbar',
    );
    expect(findSection(resolved.pages.shop.sections, 'product-grid')?.variant).toBe(
      'elessi-organic-shop-grid',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'elessi-organic-gallery',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'elessi-organic-buybox',
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'nature-cart',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'nature-payment',
    );
    expect(findSection(resolved.pages.sale?.sections, 'product-grid')?.variant).toBe(
      'elessi-organic-shop-grid',
    );
    expect(
      findSection(resolved.pages.collections?.sections, 'featured-collections')?.variant,
    ).toBe('elessi-organic-routes');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant)
      .toBe('nature-aftercare');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.settings)
      .toEqual(
        expect.objectContaining({
          title: 'تم تثبيت طلب Harvest Fold',
        }),
      );
  });

  it('gives elessi-signal-deck a device-led commerce journey instead of a thin tech shelf', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'elessi-signal-deck' });

    expect(findSection(resolved.pages.shop.sections, 'shopping-intents')?.settings).toEqual(
      expect.objectContaining({
        title: 'أي تجهيز تقني تريد حسمه أولًا؟',
      }),
    );
    expect(findSection(resolved.pages.shop.sections, 'shop-command-bar')?.variant).toBe(
      'elessi-digital-toolbar',
    );
    expect(findSection(resolved.pages.shop.sections, 'product-grid')?.variant).toBe(
      'elessi-digital-catalog-grid',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'elessi-digital-gallery',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'elessi-digital-buybox',
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'command-cart',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'command-payment',
    );
    expect(findSection(resolved.pages.sale?.sections, 'product-grid')?.variant).toBe(
      'elessi-digital-catalog-grid',
    );
    expect(
      findSection(resolved.pages.collections?.sections, 'featured-collections')?.variant,
    ).toBe('elessi-digital-departments');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant)
      .toBe('command-aftercare');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.settings)
      .toEqual(
        expect.objectContaining({
          title: 'تم تسجيل طلب Signal Deck',
        }),
      );
  });

  it('gives elessi-tail-supply a pet-routine commerce journey instead of a thin generic pet shelf', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'elessi-tail-supply' });

    expect(findSection(resolved.pages.shop.sections, 'shopping-intents')?.settings).toEqual(
      expect.objectContaining({
        title: 'أي روتين يقفل احتياج الحيوان أسرع؟',
      }),
    );
    expect(findSection(resolved.pages.shop.sections, 'shop-command-bar')?.variant).toBe(
      'elessi-filter-deck',
    );
    expect(findSection(resolved.pages.shop.sections, 'product-grid')?.variant).toBe(
      'elessi-compact-shelf',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'elessi-showroom',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'elessi-pet-buybox',
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'nature-cart',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'nature-payment',
    );
    expect(findSection(resolved.pages.sale?.sections, 'product-grid')?.variant).toBe(
      'elessi-compact-shelf',
    );
    expect(
      findSection(resolved.pages.collections?.sections, 'featured-collections')?.variant,
    ).toBe('elessi-utility-cards');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant)
      .toBe('nature-aftercare');
    expect(findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.settings)
      .toEqual(
        expect.objectContaining({
          title: 'تم تثبيت طلب Tail Supply',
        }),
      );
  });

  it('assigns the market checkout family to representative general-store themes', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'district-market' });

    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'market-basket',
    );
    expect(findSection(resolved.pages.cart.sections, 'order-summary')?.variant).toBe(
      'market-summary',
    );
    expect(findSection(resolved.pages.checkout.sections, 'checkout-form')?.variant).toBe(
      'market-checkout',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'market-payment',
    );
    expect(
      findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant,
    ).toBe('market-aftercare');
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'grid',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'standard',
    );
    expect(findSection(resolved.pages.pdp.sections, 'bought-together')?.variant).toBe(
      'stacked',
    );
    expect(findSection(resolved.pages.pdp.sections, 'related-products')?.variant).toBe(
      'standard',
    );
  });

  it('assigns the nature checkout family to calmer organic themes', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'zen-organic' });

    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'nature-cart',
    );
    expect(findSection(resolved.pages.cart.sections, 'order-summary')?.variant).toBe(
      'nature-summary',
    );
    expect(findSection(resolved.pages.checkout.sections, 'checkout-form')?.variant).toBe(
      'nature-checkout',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'nature-payment',
    );
    expect(
      findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant,
    ).toBe('nature-aftercare');
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'stacked',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'accordion',
    );
    expect(findSection(resolved.pages.pdp.sections, 'bought-together')?.variant).toBe(
      'compact',
    );
    expect(findSection(resolved.pages.pdp.sections, 'reviews')?.variant).toBe(
      'compact',
    );
  });

  it('assigns the command family to technical transaction flows', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'pc-hub-eg' });

    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'command-cart',
    );
    expect(findSection(resolved.pages.checkout.sections, 'checkout-form')?.variant).toBe(
      'command-checkout',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'command-payment',
    );
    expect(
      findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant,
    ).toBe('command-aftercare');
  });

  it('assigns softer boutique flows to fashion themes by default', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'modern-minimal' });

    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'wardrobe-cart',
    );
    expect(findSection(resolved.pages.cart.sections, 'order-summary')?.variant).toBe(
      'boutique-summary',
    );
    expect(findSection(resolved.pages.checkout.sections, 'checkout-form')?.variant).toBe(
      'soft-flow',
    );
    expect(findSection(resolved.pages.checkout.sections, 'payment')?.variant).toBe(
      'boutique-payment',
    );
    expect(
      findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant,
    ).toBe('boutique-aftercare');
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'boutique-portrait-stage',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'boutique-ledger',
    );
    expect(findSection(resolved.pages.pdp.sections, 'bought-together')?.variant).toBe(
      'pairing-rail',
    );
    expect(findSection(resolved.pages.pdp.sections, 'reviews')?.variant).toBe(
      'voice-notes',
    );
  });

  it('keeps playful checkout families for kids themes', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'kids-play' });

    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'playful-basket',
    );
    expect(findSection(resolved.pages.cart.sections, 'order-summary')?.variant).toBe(
      'highlighted',
    );
    expect(findSection(resolved.pages.checkout.sections, 'checkout-form')?.variant).toBe(
      'safe-adventure',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'grid',
    );
    expect(findSection(resolved.pages.pdp.sections, 'reviews')?.variant).toBe(
      'compact',
    );
  });

  it('assigns the command PDP family to technical catalog themes that were still generic', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'skill-lab' });

    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'command-stage',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'command-specs',
    );
    expect(findSection(resolved.pages.pdp.sections, 'related-products')?.variant).toBe(
      'command-alternatives',
    );
    expect(findSection(resolved.pages.pdp.sections, 'reviews')?.variant).toBe(
      'command-proof',
    );
  });

  it('gives pharmacy-demo its own pharmacy identity instead of falling back to a fashion storefront', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'pharmacy-demo' });

    expect(resolved.name).toBe('Pharmacy Demo');
    expect(resolved.header?.brandName).toBe('صيدلية الأسرة');
    expect(findSection(resolved.pages.home.sections, 'hero-banner')?.variant).toBe(
      'split-panel',
    );
    expect(
      findSection(resolved.pages.collections?.sections, 'featured-collections')?.variant,
    ).toBe('fast-nav-grid');
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'accordion',
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'nature-cart',
    );
    expect(findSection(resolved.pages.checkout.sections, 'checkout-form')?.variant).toBe(
      'nature-checkout',
    );
    expect(
      findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant,
    ).toBe('nature-aftercare');
  });

  it('gives cutline-club a streetwear commerce flow instead of the old modern-minimal fallback', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'cutline-club' });

    expect(resolved.name).toBe('Cutline Club');
    expect(resolved.header?.brandName).toBe('Cutline Club');
    expect(findSection(resolved.pages.home.sections, 'hero-banner')?.variant).toBe(
      'split-panel',
    );
    expect(findSection(resolved.pages.shop.sections, 'product-grid')?.variant).toBe(
      'editorial-card',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'grid',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'standard',
    );
    expect(findSection(resolved.pages.cart.sections, 'cart-items')?.variant).toBe(
      'editorial',
    );
    expect(findSection(resolved.pages.checkout.sections, 'checkout-form')?.variant).toBe(
      'split',
    );
    expect(
      findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.settings,
    ).toEqual(
      expect.objectContaining({
        title: 'تم تثبيت طلب Cutline Club',
      }),
    );
  });

  it('gives style-store-eg an accessory-led flow instead of repeating the generic boutique fallback', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'style-store-eg' });

    expect(resolved.name).toBe('Style Store EG');
    expect(resolved.header?.brandName).toBe('Style Store EG');
    expect(
      findSection(resolved.pages.shop.sections, 'shop-promo-rail')?.variant,
    ).toBe('stylist-rail');
    expect(findSection(resolved.pages.shop.sections, 'product-grid')?.variant).toBe(
      'editorial-card',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-gallery')?.variant).toBe(
      'fashion-counter-stage',
    );
    expect(findSection(resolved.pages.pdp.sections, 'product-info')?.variant).toBe(
      'utility-rail',
    );
    expect(
      findSection(resolved.pages.pdp.sections, 'conversion-stack')?.variant,
    ).toBe('couture-minimal');
    expect(
      findSection(resolved.pages['thank-you']?.sections, 'order-confirmation')?.variant,
    ).toBe('soft-thanks');
  });

  it('gives velvet-glow a premium beauty journey across the key commerce pages', () => {
    const resolved = resolveStorefrontTheme({ themeId: 'velvet-glow' });

    expect(String(resolved.tokens?.typography?.bodyFont || '')).toContain('Outfit');

    const homeHero = findSection(resolved.pages.home.sections, 'hero-banner');
    const homeProducts = findSection(
      resolved.pages.home.sections,
      'featured-products',
    );

    expect(homeHero?.variant).toBe('organic-bloom');
    expect(homeProducts?.variant).toBe('editorial-card');

    const shopHero = findSection(resolved.pages.shop.sections, 'hero-banner');
    const shopGrid = findSection(resolved.pages.shop.sections, 'product-grid');
    const shopNewsletter = findSection(
      resolved.pages.shop.sections,
      'newsletter',
    );
    const shopTypes = getSectionTypes(resolved.pages.shop.sections);

    expect(shopHero?.variant).toBe('split-panel');
    expect(shopGrid?.variant).toBe('editorial-card');
    expect(shopNewsletter?.variant).toBe('dark');
    expect(shopTypes).toEqual(
      expect.arrayContaining([
        'shopping-intents',
        'shop-promo-rail',
        'features-bar',
      ]),
    );

    const pdpGallery = findSection(resolved.pages.pdp.sections, 'product-gallery');
    const pdpConversion = findSection(
      resolved.pages.pdp.sections,
      'conversion-stack',
    );
    const pdpReviews = findSection(resolved.pages.pdp.sections, 'reviews');

    expect(pdpGallery?.variant).toBe('masonry');
    expect(pdpConversion?.variant).toBe('seamless');
    expect(pdpReviews?.variant).toBe('editorial');

    const cartTypes = getSectionTypes(resolved.pages.cart.sections);
    const cartItemsSection = findSection(resolved.pages.cart.sections, 'cart-items');

    expect(cartTypes).toEqual(
      expect.arrayContaining(['promo-strip', 'cart-items', 'order-summary']),
    );
    expect(cartItemsSection?.variant).toBe('editorial');

    const checkoutItems = findSection(
      resolved.pages.checkout.sections,
      'cart-items',
    );
    const checkoutPayment = findSection(
      resolved.pages.checkout.sections,
      'payment',
    );

    expect(checkoutItems?.variant).toBe('editorial');
    expect(checkoutPayment?.settings).toEqual(
      expect.objectContaining({ summaryTitle: 'ملخص Velvet Glow' }),
    );

    const confirmation = findSection(
      resolved.pages['thank-you']?.sections,
      'order-confirmation',
    );

    expect(confirmation?.settings).toEqual(
      expect.objectContaining({
        trackOrderTitle: 'تتبعي الطلب بسهولة',
        reorderTitle: 'إعادة شراء سريعة',
      }),
    );
  });
});
