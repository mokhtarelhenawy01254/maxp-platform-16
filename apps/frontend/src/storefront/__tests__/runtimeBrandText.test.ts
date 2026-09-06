import { describe, expect, it } from 'vitest';
import {
  createStorefrontThemeTextReplacer,
  sanitizeStorefrontThemeTextValue,
} from '../utils/runtimeBrandText';
import type { StorefrontTheme } from '../types/theme.types';

const theme = {
  id: 'khemet-luxe-eg',
  name: 'KHEMET LUXE',
  direction: 'rtl',
  header: {
    brandName: 'KHEMET LUXE',
  },
  pages: {},
} as StorefrontTheme;

const floraSettings = {
  storefront: {
    settings: {
      storeName: 'Flora',
    },
  },
  company: {
    name: 'Flora',
  },
};

describe('runtime storefront brand text helpers', () => {
  it('replaces preset brand names with the runtime store name for applied storefronts', () => {
    const { replaceThemeBrandText } = createStorefrontThemeTextReplacer({
      theme,
      settings: floraSettings,
    });

    expect(replaceThemeBrandText('سلة KHEMET LUXE')).toBe('سلة Flora');
    expect(
      replaceThemeBrandText('في KHEMET LUXE نرى الحذاء امتدادًا للهوية.'),
    ).toBe('في Flora نرى الحذاء امتدادًا للهوية.');
  });

  it('sanitizes nested section settings without changing non-string values', () => {
    const { replaceThemeBrandText } = createStorefrontThemeTextReplacer({
      theme,
      settings: floraSettings,
    });

    expect(
      sanitizeStorefrontThemeTextValue(
        {
          title: 'قصة KHEMET LUXE',
          cards: [{ title: 'KHEMET LUXE Club', active: true }],
          count: 3,
        },
        replaceThemeBrandText,
      ),
    ).toEqual({
      title: 'قصة Flora',
      cards: [{ title: 'Flora Club', active: true }],
      count: 3,
    });
  });

  it('keeps preset brand text in theme preview mode', () => {
    const { replaceThemeBrandText } = createStorefrontThemeTextReplacer({
      theme,
      settings: floraSettings,
      isThemePreview: true,
    });

    expect(replaceThemeBrandText('سلة KHEMET LUXE')).toBe('سلة KHEMET LUXE');
  });

  it('replaces any leaked Swan references with runtime store name for non-Swan stores', () => {
    const tatoSettings = {
      storefront: {
        settings: {
          storeName: 'TA TI',
        },
      },
      company: {
        name: 'TATO',
      },
    };

    const { replaceThemeBrandText } = createStorefrontThemeTextReplacer({
      theme,
      settings: tatoSettings,
    });

    expect(replaceThemeBrandText('ليه تختاري Swan؟')).toBe('ليه تختاري TATO؟');
    expect(replaceThemeBrandText('انضمي إلى عائلة Swan')).toBe('انضمي إلى عائلة TATO؟'.replace('؟', ''));
    expect(replaceThemeBrandText('خطوتك القادمة تبدأ من KHEMET LUXE')).toBe('خطوتك القادمة تبدأ من TATO');
    expect(replaceThemeBrandText('خطوتك القادمة تبدأ من TA TI')).toBe('خطوتك القادمة تبدأ من TATO');
  });

  it('preserves Swan brand name when the store itself is Swan', () => {
    const swanSettings = {
      storefront: {
        settings: {
          storeName: 'Swan',
        },
      },
      company: {
        name: 'Swan',
      },
    };

    const { replaceThemeBrandText } = createStorefrontThemeTextReplacer({
      theme,
      settings: swanSettings,
    });

    expect(replaceThemeBrandText('ليه تختاري Swan؟')).toBe('ليه تختاري Swan؟');
    expect(replaceThemeBrandText('خطوتك القادمة تبدأ من KHEMET LUXE')).toBe('خطوتك القادمة تبدأ من Swan');
  });
});
