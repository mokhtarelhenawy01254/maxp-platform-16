import { describe, expect, it } from 'vitest';
import {
  filterCatalogCategoriesBySlugs,
  parseCatalogCategorySlugs,
  resolveCatalogCategoryBySlug,
  resolveCatalogCategoryByToken,
} from '../utils/catalogCategories';

const CATEGORIES = [
  { id: 'footwear', name: 'Footwear', slug: 'footwear' },
  { id: 'women', name: "Women's Clothing", slug: 'womens-clothing' },
  { id: 'outerwear', name: 'Outerwear', slug: 'outerwear' },
];

const KHEMET_CATEGORIES = [
  { id: 'shoes', name: 'Shoes', slug: 'shoes' },
  { id: 'womens-shoes', name: "Women's Shoes", slug: 'womens-shoes' },
  { id: 'slippers', name: 'Slippers', slug: 'slippers' },
];

const SWAN_CATEGORIES = [
  { id: 'swan-shoes', name: 'A7dhya 7rymy', slug: 'a7dhya-7rymy' },
];

describe('catalogCategories', () => {
  it('parses slug lists from strings and arrays', () => {
    expect(parseCatalogCategorySlugs('footwear | outerwear, footwear')).toEqual([
      'footwear',
      'outerwear',
    ]);

    expect(
      parseCatalogCategorySlugs(['Footwear', "Women's Clothing", 'footwear']),
    ).toEqual(['footwear', 'womens-clothing']);
  });

  it('resolves categories by slug or label', () => {
    expect(resolveCatalogCategoryBySlug(CATEGORIES, 'footwear')?.id).toBe(
      'footwear',
    );
    expect(
      resolveCatalogCategoryBySlug(CATEGORIES, "Women's Clothing")?.id,
    ).toBe('women');
  });

  it('resolves header category tokens by id, slug, and legacy aliases', () => {
    expect(resolveCatalogCategoryByToken(KHEMET_CATEGORIES, 'womens-shoes')?.id).toBe(
      'womens-shoes',
    );
    expect(resolveCatalogCategoryByToken(KHEMET_CATEGORIES, 'sneakers')?.id).toBe(
      'womens-shoes',
    );
    expect(resolveCatalogCategoryByToken(KHEMET_CATEGORIES, 'flats')?.id).toBe(
      'shoes',
    );
  });

  it('resolves Swan footwear header aliases to the live category slug', () => {
    expect(resolveCatalogCategoryByToken(SWAN_CATEGORIES, 'sneakers')?.id).toBe(
      'swan-shoes',
    );
    expect(resolveCatalogCategoryByToken(SWAN_CATEGORIES, 'flats')?.id).toBe(
      'swan-shoes',
    );
  });

  it('filters categories by slug list while preserving requested order', () => {
    expect(
      filterCatalogCategoriesBySlugs(CATEGORIES, ['outerwear', 'footwear']).map(
        (category) => category.id,
      ),
    ).toEqual(['outerwear', 'footwear']);
  });
});
