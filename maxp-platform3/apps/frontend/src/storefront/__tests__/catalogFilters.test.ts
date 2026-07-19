import { describe, expect, it } from 'vitest';
import {
  applyCatalogFilters,
  clearCatalogFilters,
  getCatalogProductQuery,
  resolvePriceRangeValue,
  resolveSortValue,
} from '../utils/catalogFilters';

describe('catalogFilters', () => {
  it('maps selected filters to storefront product query params', () => {
    const nextParams = applyCatalogFilters(new URLSearchParams('companyId=abc123'), {
      categoryId: 'cat-9',
      sortValue: 'price-desc',
      priceRangeValue: '50-100',
    });

    expect(nextParams.toString()).toContain('companyId=abc123');
    expect(getCatalogProductQuery(nextParams)).toEqual({
      category: 'cat-9',
      sortBy: 'price',
      sortOrder: 'desc',
      minPrice: 50,
      maxPrice: 100,
    });
  });

  it('resolves UI state from backend-oriented search params', () => {
    const params = new URLSearchParams('sortBy=createdAt&sortOrder=desc&minPrice=100');

    expect(resolveSortValue(params)).toBe('newest');
    expect(resolvePriceRangeValue(params)).toBe('over-100');
  });

  it('clears catalog params while preserving unrelated query params', () => {
    const nextParams = clearCatalogFilters(new URLSearchParams(
      'companyId=abc123&category=shirts&sortBy=price&sortOrder=asc&minPrice=25&maxPrice=50',
    ));

    expect(nextParams.toString()).toBe('companyId=abc123');
  });
});
