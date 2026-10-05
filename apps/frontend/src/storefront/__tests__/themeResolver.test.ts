import { describe, expect, it } from 'vitest';
import { resolveStorefrontTheme } from '../engine/themeResolver';
import {
  DEFAULT_STOREFRONT_THEME_ID,
  getStorefrontThemePreset,
  STOREFRONT_THEME_PRESETS,
} from '../themes';
import { validateStorefrontTheme } from '../engine/themeValidation';

const getSectionType = (
  section: string | { type: string },
): string => (typeof section === 'string' ? section : section.type);

describe('storefront theme resolver', () => {
  it('returns the default preset when no input is provided', () => {
    const resolved = resolveStorefrontTheme();

    expect(resolved.id).toBe(DEFAULT_STOREFRONT_THEME_ID);
    expect(resolved.name).toBe(
      STOREFRONT_THEME_PRESETS[DEFAULT_STOREFRONT_THEME_ID]!.name,
    );
    expect(resolved.pages.checkout.sections.map(getSectionType)).toContain('cart-items');
  });

  it('loads a named preset from company storefront settings', () => {
    const resolved = resolveStorefrontTheme({
      settings: {
        themeId: 'bold-fashion',
      },
    });

    expect(resolved.id).toBe('bold-fashion');
    expect(resolved.tokens.shape.buttonRadius).toBe('999px');
  });

  it('registers the Solea Femme preset with sale, collections, lookbook, and size guide pages', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'solea-femme',
    });

    expect(resolved.id).toBe('solea-femme');
    expect(resolved.pages.sale?.sections).toEqual([
      expect.objectContaining({ type: 'promo-strip' }),
      expect.objectContaining({ type: 'hero-banner' }),
      expect.objectContaining({
        type: 'product-grid',
        settings: expect.objectContaining({ saleOnly: true }),
      }),
      expect.objectContaining({ type: 'newsletter' }),
    ]);
    expect(resolved.pages.collections?.sections).toEqual([
      expect.objectContaining({ type: 'featured-collections' }),
      expect.objectContaining({ type: 'product-grid' }),
      expect.objectContaining({ type: 'newsletter' }),
    ]);
    expect(resolved.pages.lookbook?.sections).toEqual([
      expect.objectContaining({ type: 'hero-banner' }),
      expect.objectContaining({ type: 'lookbook-showcase' }),
      expect.objectContaining({ type: 'newsletter' }),
    ]);
    expect(resolved.pages['size-guide']?.sections).toEqual([
      expect.objectContaining({ type: 'promo-strip' }),
      expect.objectContaining({ type: 'size-guide' }),
      expect.objectContaining({ type: 'newsletter' }),
    ]);
    expect(resolved.pages.pdp.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'size-guide' }),
      ]),
    );
  });

  it('turns Rose Boutique lookbook into a full boutique destination page', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'rose-boutique-eg',
    });

    expect(resolved.pages.lookbook?.sections).toEqual([
      expect.objectContaining({ type: 'hero-banner', variant: 'boutique-muse' }),
      expect.objectContaining({
        type: 'lookbook-showcase',
        variant: 'boutique-storyboard',
      }),
      expect.objectContaining({
        type: 'featured-products',
        variant: 'boutique-shelf',
      }),
      expect.objectContaining({ type: 'journal-strip', variant: 'editorial-cards' }),
      expect.objectContaining({ type: 'newsletter', variant: 'editorial-strip' }),
    ]);
    expect(resolved.pages.lookbook?.pageGoal).toBe('discovery');
    expect(resolved.pages.pdp.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'product-gallery',
          variant: 'atelier-editorial-stage',
        }),
        expect.objectContaining({
          type: 'product-info',
          variant: 'atelier-buybox',
        }),
      ]),
    );
  });

  it('ships Elegant Luxe with contact and policy pages inside the storefront', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'elegant-luxe',
    });

    expect(resolved.pages.contact?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'info-content' }),
      ]),
    );
    expect(resolved.pages.shipping?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'info-content' }),
      ]),
    );
    expect(resolved.pages.returns?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'info-content' }),
      ]),
    );
    expect(resolved.pages.privacy?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'info-content' }),
      ]),
    );
    expect(resolved.pages.terms?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'info-content' }),
      ]),
    );
  });

  it('resolves allura alias directly to allure preset', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'allura',
    });

    expect(resolved.id).toBe('allura');
    expect(resolved.pages.home).toBeDefined();
    expect(resolved.pages.lookbook).toBeDefined();
    expect(resolved.pages.shop).toBeDefined();
  });

  it('merges company design token overrides on top of the selected preset', () => {
    const resolved = resolveStorefrontTheme({
      theme: 'elegant-luxe',
      settings: {
        designTokens: {
          colors: {
            primary: '200 90% 40%',
          },
        },
      },
      typography: {
        bodyFont: '"IBM Plex Sans Arabic", sans-serif',
      },
    });

    expect(resolved.id).toBe('elegant-luxe');
    expect(resolved.tokens.colors.primary).toBe('200 90% 40%');
    expect(resolved.tokens.typography.bodyFont).toBe('"IBM Plex Sans Arabic", sans-serif');
  });

  it('syncs resolved direction with typography direction overrides', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'legacy-default-old',
      settings: {
        designTokens: {
          typography: {
            direction: 'rtl',
          },
        },
      },
    });

    expect(resolved.direction).toBe('rtl');
    expect(resolved.tokens.typography.direction).toBe('rtl');
  });

  it('returns a diagnostic placeholder when the requested preset does not exist', () => {
    const resolved = resolveStorefrontTheme({
      theme: 'missing-theme',
      colors: {
        primary: '120 10% 10%',
      },
    });

    expect(resolved.id).toBe('missing-theme');
    expect(resolved.name).toContain('missing-theme');
    expect(resolved.tokens.colors.primary).toBe('120 10% 10%');
    expect(resolved.pages.home.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'hero-banner' }),
        expect.objectContaining({ type: 'info-content' }),
      ]),
    );
    expect(resolved.pages.checkout.sections.map(getSectionType)).toContain('cart-items');
    expect(validateStorefrontTheme(resolved)).toEqual([]);
  });

  it('builds a valid placeholder from the central preset getter for unknown theme ids', () => {
    const resolved = getStorefrontThemePreset('missing-theme-direct');

    expect(resolved.id).toBe('missing-theme-direct');
    expect(resolved.name).toContain('missing-theme-direct');
    expect(resolved.pages.shop.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'filters-sidebar' }),
        expect.objectContaining({ type: 'product-grid' }),
      ]),
    );
    expect(resolved.pages.pdp.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'product-gallery' }),
        expect.objectContaining({ type: 'conversion-stack' }),
      ]),
    );
    expect(validateStorefrontTheme(resolved)).toEqual([]);
  });

  it('uses homepage sections coming from storefront payload overrides', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'elegant-luxe',
      sections: [
        {
          id: 'hero',
          type: 'hero-banner',
          settings: {
            title: 'Luxe Capsule 2026',
          },
        },
        {
          id: 'newsletter',
          type: 'newsletter',
          settings: {
            title: 'Stay Close',
          },
        },
      ],
    });

    expect(resolved.pages.home.sections).toEqual([
      {
        id: 'hero',
        type: 'hero-banner',
        settings: {
          title: 'Luxe Capsule 2026',
        },
      },
      {
        id: 'newsletter',
        type: 'newsletter',
        settings: {
          title: 'Stay Close',
        },
      },
    ]);
  });

  it('preserves explicit PDP and checkout page section overrides from the storefront payload', () => {
    const basePages = JSON.parse(
      JSON.stringify(STOREFRONT_THEME_PRESETS['modern-minimal']!.pages),
    );

    const resolved = resolveStorefrontTheme({
      themeId: 'modern-minimal',
      pages: {
        ...basePages,
        pdp: {
          sections: ['reviews', 'product-info', 'product-gallery'],
        },
        checkout: {
          sections: ['payment', 'checkout-form'],
        },
      },
    });

    expect(resolved.pages.pdp.sections).toEqual([
      'reviews',
      'product-info',
      'product-gallery',
    ]);
    expect(resolved.pages.checkout.sections).toEqual([
      'cart-items',
      'payment',
      'checkout-form',
    ]);
  });

  it('allows checkout pages to opt out of auto-injected cart items', () => {
    const basePages = JSON.parse(
      JSON.stringify(STOREFRONT_THEME_PRESETS['modern-minimal']!.pages),
    );

    const resolved = resolveStorefrontTheme({
      themeId: 'modern-minimal',
      pages: {
        ...basePages,
        checkout: {
          sections: ['checkout-form', 'payment', 'order-summary'],
          settings: {
            injectCartItems: false,
          },
        },
      },
    });

    expect(resolved.pages.checkout.sections).toEqual([
      'checkout-form',
      'payment',
      'order-summary',
    ]);
  });

  it('applies page overrides coming from design tokens', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'modern-minimal',
      settings: {
        designTokens: {
          pageOverrides: {
            shop: {
              sections: ['product-grid', 'filters-sidebar'],
              layoutHint: 'commerce-3col',
            },
            checkout: {
              sections: ['checkout-form', 'payment'],
            },
          },
        },
      },
    });

    expect(resolved.pages.shop.sections).toEqual([
      'product-grid',
      'filters-sidebar',
    ]);
    expect(resolved.pages.shop.layoutHint).toBe('commerce-3col');
    expect(resolved.pages.checkout.sections).toEqual([
      'cart-items',
      'checkout-form',
      'payment',
    ]);
  });

  it('preserves safe custom pages coming from design tokens page overrides', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'modern-minimal',
      settings: {
        designTokens: {
          pageOverrides: {
            sale: {
              sections: ['hero-banner', 'product-grid'],
            },
            'about-us': {
              sections: ['hero-banner', 'newsletter'],
            },
          },
        },
      },
    });

    expect(resolved.pages.sale?.sections).toEqual(['hero-banner', 'product-grid']);
    expect(resolved.pages['about-us']?.sections).toEqual([
      'hero-banner',
      'newsletter',
    ]);
  });

  it('preserves section variants and settings inside page overrides', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'modern-minimal',
      settings: {
        designTokens: {
          pageOverrides: {
            shop: {
              sections: [
                {
                  type: 'filters-sidebar',
                  settings: {
                    clearButtonText: 'ابدأ من جديد',
                  },
                },
                {
                  type: 'product-grid',
                  variant: 'overlay-card',
                  settings: {
                    title: 'وصل حديثًا',
                    limit: 6,
                  },
                },
              ],
            },
          },
        },
      },
    });

    expect(resolved.pages.shop.sections).toEqual([
      {
        type: 'filters-sidebar',
        settings: {
          clearButtonText: 'ابدأ من جديد',
        },
      },
      {
        type: 'product-grid',
        variant: 'overlay-card',
        settings: {
          title: 'وصل حديثًا',
          limit: 6,
        },
      },
    ]);
  });

  it('applies content overrides coming from company design tokens on top of preset sections', () => {
    const resolved = resolveStorefrontTheme({
      themeId: 'modern-minimal',
      settings: {
        designTokens: {
          contentOverrides: {
            home: {
              sections: {
                'hero-banner': {
                  title: 'Ramadan Capsule',
                  backgroundImage: 'https://example.com/hero.jpg',
                  ctaLink: '/collections/ramadan',
                },
                newsletter: {
                  title: 'Stay Close',
                  hidden: true,
                },
              },
            },
          },
        },
      },
    });

    const homeSections = resolved.pages.home.sections;
    const heroSection = homeSections.find((section) => getSectionType(section) === 'hero-banner');
    const newsletterSection = homeSections.find((section) => getSectionType(section) === 'newsletter');
    const featuredProductsSection = homeSections.find(
      (section) => getSectionType(section) === 'featured-products',
    );

    expect(heroSection).toEqual(
      expect.objectContaining({
        type: 'hero-banner',
        settings: expect.objectContaining({
          title: 'Ramadan Capsule',
          backgroundImage: 'https://example.com/hero.jpg',
          ctaLink: '/collections/ramadan',
        }),
      }),
    );
    expect(featuredProductsSection).toEqual(
      expect.objectContaining({
        type: 'featured-products',
      }),
    );
    expect(newsletterSection).toEqual(
      expect.objectContaining({
        type: 'newsletter',
        settings: expect.objectContaining({
          title: 'Stay Close',
          hidden: true,
        }),
      }),
    );
  });

  it('validates all registered theme presets', () => {
    Object.values(STOREFRONT_THEME_PRESETS).forEach((theme) => {
      const errors = validateStorefrontTheme(theme);
      expect(errors).toEqual([]);
    });
  });
});
