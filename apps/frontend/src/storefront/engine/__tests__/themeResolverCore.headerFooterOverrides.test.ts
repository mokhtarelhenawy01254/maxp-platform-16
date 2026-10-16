/**
 * Regression — company header/footer designTokens overrides must reach the runtime theme.
 *
 * Bug (2026-10-16, store «للأكل مزاج»):
 * settings.storefront = { themeId, designTokens: { header, footer, pages }, ... }
 * The homepage sections (designTokens.pages) applied, but the theme header stayed
 * "Fastly" (preset brandName) and the announcement rail stayed "شحن لطلبات اكثر من 200 ريال".
 *
 * Root cause: extractTokens() only maps colors/typography/shape/productCard/layout,
 * so normalizeThemeOverrides() found no header/footer in ANY source and the preset
 * values won via deepMerge fallback.
 */
import { resolveStorefrontThemeFromPreset } from '../themeResolverCore';

const BASE_THEME = {
  id: 'fastly-eg',
  name: 'Fastly',
  direction: 'rtl',
  header: {
    variant: 'legacy-default-old',
    brandName: 'Fastly',
    announcementText: 'شحن للطلبات اكثر من 200 ريال',
    navigation: [],
  },
  footer: {
    variant: 'legacy-default-old',
    description: '',
    copyrightText: 'fastly . جميع الحقوق محفوظة . © 2026',
    navigation: [],
  },
  pages: { home: { sections: [{ type: 'product-grid', settings: { title: 'أحدث الاضافات' } }] } },
} as const;

const STOREFRONT_INPUT = {
  themeId: 'fastly-eg',
  designTokens: {
    header: {
      brandName: 'للأكل مزاج',
      logoUrl: '',
      announcementText: 'وجبة الخبر تنزل كل يوم — الدفع كاش عند الاستلام',
    },
    footer: {
      brandName: 'للأكل مزاج',
      description: 'مطبخ بيتي مصري',
      copyrightText: 'للأكل مزاج © 2026 — مطبخ بيتي',
    },
    pages: {
      home: { sections: [{ type: 'info-content', settings: { title: 'إزاي تطلب؟' } }] },
    },
  },
  settings: {
    themeId: 'fastly-eg',
    storeName: 'للأكل مزاج',
    currency: 'EGP',
  },
} as const;

describe('themeResolverCore — company header/footer overrides merge into runtime theme', () => {
  test('REGRESSION: designTokens.header beats preset header brandName', () => {
    const theme = resolveStorefrontThemeFromPreset(
      STOREFRONT_INPUT,
      JSON.parse(JSON.stringify(BASE_THEME)),
      { presetId: 'fastly-eg' },
    );
    expect(theme.header?.brandName).toBe('للأكل مزاج');
    expect(theme.header?.announcementText).toContain('وجبة الخبر');
  });

  test('REGRESSION: designTokens.footer beats preset footer texts', () => {
    const theme = resolveStorefrontThemeFromPreset(
      STOREFRONT_INPUT,
      JSON.parse(JSON.stringify(BASE_THEME)),
      { presetId: 'fastly-eg' },
    );
    expect(theme.footer?.copyrightText).toContain('مطبخ بيتي');
    expect(theme.footer?.brandName).toBe('للأكل مزاج');
  });

  test('preset header is preserved when the company sends no override', () => {
    const theme = resolveStorefrontThemeFromPreset(
      { themeId: 'fastly-eg', settings: { themeId: 'fastly-eg' } },
      JSON.parse(JSON.stringify(BASE_THEME)),
      { presetId: 'fastly-eg' },
    );
    expect(theme.header?.brandName).toBe('Fastly');
  });
});
