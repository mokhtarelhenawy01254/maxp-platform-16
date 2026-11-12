// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { resolveStorefrontThemeFromPreset } from '../engine/themeResolverCore';
import marketplaceAvenueAr from '../themes/marketplace-avenue-ar.json';
import {
  findActiveMarketplaceContext,
  isCategoryUrlMatch,
  resolveMarketplaceDepartments,
} from '../utils/marketplaceCategories';
import { MarketplaceCategoryHeader } from '../components/MarketplaceCategoryHeader';
import type { Category } from '../hooks/useCategories';
import type { StorefrontTheme } from '../types/theme.types';

const mockDbCategories: Category[] = [
  {
    id: 'cat-tools',
    name: 'أدوات وتحسين المنزل',
    nameEn: 'Tools & Improvement',
    slug: 'tools-improvement',
    image: '/uploads/products/tools.jpg',
    parentId: null,
    sortOrder: 1,
  },
  {
    id: 'cat-power',
    name: 'أدوات كهربائية',
    nameEn: 'Power Tools',
    slug: 'power-tools',
    image: 'https://m.media-amazon.com/images/I/power.jpg',
    parentId: 'cat-tools',
    sortOrder: 1,
  },
  {
    id: 'cat-hand',
    name: 'عدة يدوية',
    nameEn: 'Hand Tools',
    slug: 'hand-tools',
    image: 'https://m.media-amazon.com/images/I/hand.jpg',
    parentId: 'cat-tools',
    sortOrder: 2,
  },
  {
    id: 'cat-beauty',
    name: 'العناية الشخصية',
    nameEn: 'Beauty & Care',
    slug: 'beauty-care',
    image: '/uploads/products/beauty.jpg',
    parentId: null,
    sortOrder: 2,
  },
  {
    id: 'cat-dryers',
    name: 'مجففات شعر',
    nameEn: 'Hair Dryers',
    slug: 'hair-dryers',
    image: 'https://m.media-amazon.com/images/I/dryer.jpg',
    parentId: 'cat-beauty',
    sortOrder: 1,
  },
];

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: marketplaceAvenueAr as unknown as StorefrontTheme,
  }),
}));

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: mockDbCategories,
    isLoading: false,
    error: null,
  }),
}));

describe('Marketplace Avenue WoodMart category header & resolver', () => {
  it('preserves baseTheme header.dropdowns when DB overrides supply empty dropdowns: []', () => {
    const resolved = resolveStorefrontThemeFromPreset(
      {
        themeId: 'marketplace-avenue-ar',
        designTokens: {
          header: {
            brandName: 'Bto3 E3lanat',
            dropdowns: [],
            i18n: {
              en: {
                brandName: 'Bto3 E3lanat',
                dropdowns: [],
              },
            },
          },
        },
      } as any,
      marketplaceAvenueAr as unknown as StorefrontTheme,
      { presetId: 'marketplace-avenue-ar' },
    );

    expect(resolved.header?.brandName).toBe('Bto3 E3lanat');
    expect(Array.isArray(resolved.header?.dropdowns)).toBe(true);
    expect(resolved.header?.dropdowns?.length).toBeGreaterThan(0);
    expect((resolved.header as any)?.i18n?.en?.dropdowns?.length).toBeGreaterThan(0);
  });

  it('synthesizes hierarchical departments from DB categories when theme dropdowns are absent', () => {
    const emptyHeaderTheme = {
      ...(marketplaceAvenueAr as unknown as StorefrontTheme),
      header: {
        ...marketplaceAvenueAr.header,
        dropdowns: [],
      },
    } as StorefrontTheme;

    const deps = resolveMarketplaceDepartments(emptyHeaderTheme, mockDbCategories, true);
    expect(deps).toHaveLength(2);
    expect(deps[0]?.slug).toBe('tools-improvement');
    expect(deps[0]?.items.map((i) => i.slug)).toEqual(['power-tools', 'hand-tools']);
  });

  it('resolves active parent department and circular children correctly (by slug or DB ID)', () => {
    const deps = resolveMarketplaceDepartments(
      marketplaceAvenueAr as unknown as StorefrontTheme,
      mockDbCategories,
      true,
    );

    const ctxParent = findActiveMarketplaceContext(deps, 'tools-improvement', mockDbCategories, true);
    expect(ctxParent.matchedDepartment?.label).toBe('أدوات وتحسين المنزل');
    expect(ctxParent.activeSubcategory).toBeUndefined();
    expect(ctxParent.activeHeadingTitle).toBe('أدوات وتحسين المنزل');
    expect(ctxParent.circularItems.length).toBeGreaterThan(0);
    expect(ctxParent.circularItems[0]?.image).toBe('https://m.media-amazon.com/images/I/power.jpg');

    const ctxChild = findActiveMarketplaceContext(deps, 'power-tools', mockDbCategories, true);
    expect(ctxChild.matchedDepartment?.label).toBe('أدوات وتحسين المنزل');
    expect(ctxChild.activeSubcategory?.label).toBe('أدوات كهربائية');
    expect(ctxChild.activeHeadingTitle).toBe('أدوات كهربائية');
    expect(ctxChild.circularItems.find((i) => i.slug === 'power-tools')?.active).toBe(true);

    expect(isCategoryUrlMatch('/shop?category=tools-improvement', 'cat-tools', mockDbCategories)).toBe(true);
  });

  it('renders WoodMart Marketplace 2 category title, breadcrumb below it, and circular subcategories', () => {
    render(
      <MemoryRouter initialEntries={['/shop?category=beauty-care']}>
        <MarketplaceCategoryHeader />
      </MemoryRouter>,
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('العناية الشخصية');

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumb).toHaveTextContent('الرئيسية');
    expect(breadcrumb).toHaveTextContent('المتجر');
    expect(breadcrumb).toHaveTextContent('العناية الشخصية');

    expect(screen.getByText('مجففات شعر')).toBeInTheDocument();
  });
});
