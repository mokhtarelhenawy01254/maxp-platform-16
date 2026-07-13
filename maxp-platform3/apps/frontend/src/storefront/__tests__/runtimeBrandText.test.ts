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
});
