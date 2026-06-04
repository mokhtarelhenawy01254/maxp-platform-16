import { describe, expect, it } from 'vitest';

import {
  filterThemePreviewProducts,
  getThemePreviewDataset,
  getThemePreviewProductRecommendations,
  resolveActiveThemePreviewDataset,
  resolveThemeCatalogPreviewKey,
  type ThemePreviewDataset,
} from '../themePreviewData';

describe('themePreviewData', () => {
  const fixtureDataset: ThemePreviewDataset = {
    themeId: 'preview-fixture',
    version: '2026-04-27',
    companyName: 'Fixture Co',
    companySlug: 'fixture-co',
    storeName: 'Fixture Store',
    currency: 'EGP',
    description: 'Fixture dataset for preview helpers.',
    categories: [
      { id: 'desk', name: 'Desk Gear', slug: 'desk-gear' },
      { id: 'audio', name: 'Audio', slug: 'audio' },
    ],
    products: [
      {
        id: 'kb-1',
        slug: 'rgb-keyboard',
        name: 'RGB Keyboard',
        description: 'Mechanical keyboard with RGB profiles.',
        price: 3200,
        images: ['/fixture/rgb-keyboard.png'],
        categoryId: 'desk',
        tags: ['rgb', 'keyboard'],
        createdAt: '2026-04-27T10:00:00.000Z',
        relatedProductIds: ['mouse-1', 'mat-1'],
        bundleProductIds: ['mouse-1', 'mat-1', 'arm-1'],
      },
      {
        id: 'mouse-1',
        slug: 'ultralight-mouse',
        name: 'Ultralight Mouse',
        description: 'Fast sensor for competitive play.',
        price: 1800,
        images: ['/fixture/ultralight-mouse.png'],
        categoryId: 'desk',
        tags: ['mouse'],
      },
      {
        id: 'mat-1',
        slug: 'desk-mat',
        name: 'Desk Mat',
        description: 'Wide desk mat with stitched edges.',
        price: 650,
        images: ['/fixture/desk-mat.png'],
        categoryId: 'desk',
        tags: ['desk'],
      },
      {
        id: 'arm-1',
        slug: 'monitor-arm',
        name: 'Monitor Arm',
        description: 'Dual monitor arm for cleaner setups.',
        price: 2400,
        images: ['/fixture/monitor-arm.png'],
        categoryId: 'desk',
        tags: ['setup'],
      },
      {
        id: 'mic-1',
        slug: 'stream-mic',
        name: 'Stream Mic',
        description: 'USB mic for calls and streaming.',
        price: 2100,
        images: ['/fixture/stream-mic.png'],
        categoryId: 'audio',
        tags: ['audio'],
      },
    ],
  };

  it('returns no active marketplace preview dataset for removed themes', () => {
    expect(
      resolveActiveThemePreviewDataset(
        '?previewTheme=cyber-gear&previewSource=marketplace',
      ),
    ).toBeNull();

    expect(
      resolveActiveThemePreviewDataset(
        '?previewTheme=cyber-gear&previewSource=settings',
      ),
    ).toBeNull();

    expect(
      resolveThemeCatalogPreviewKey(
        '?previewTheme=cyber-gear&previewSource=marketplace',
      ),
    ).toBe('');

    expect(getThemePreviewDataset('cyber-gear')).toBeNull();
  });

  it('filters inline preview products by category and search', () => {
    const deskResults = filterThemePreviewProducts(fixtureDataset, {
      category: 'desk',
      limit: 10,
    });
    expect(deskResults.data.map((product) => product.slug)).toEqual([
      'rgb-keyboard',
      'ultralight-mouse',
      'desk-mat',
      'monitor-arm',
    ]);

    const searchResults = filterThemePreviewProducts(fixtureDataset, {
      search: 'rgb',
      limit: 10,
    });
    expect(searchResults.data.map((product) => product.slug)).toEqual(['rgb-keyboard']);
  });

  it('returns curated bundle recommendations for inline preview PDP data', () => {
    const recommendations = getThemePreviewProductRecommendations(
      fixtureDataset,
      'rgb-keyboard',
      'bundle',
      3,
    );

    expect(recommendations.map((product) => product.slug)).toEqual([
      'ultralight-mouse',
      'desk-mat',
      'monitor-arm',
    ]);
  });
});
