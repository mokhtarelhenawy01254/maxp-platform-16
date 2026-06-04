import { formatStorefrontCurrency } from './currency';
import type { ProductsParams } from '../hooks/useProducts';

export type CatalogSortValue =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'newest';

export type CatalogPriceRangeValue =
  | 'under-25'
  | '25-50'
  | '50-100'
  | 'over-100';

interface SortOption {
  label: string;
  value: CatalogSortValue;
}

interface PriceRangeOption {
  value: CatalogPriceRangeValue;
  minPrice?: number;
  maxPrice?: number;
}

type StorefrontTextDirection = 'rtl' | 'ltr';

export const SORT_OPTIONS: SortOption[] = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Newest', value: 'newest' },
];

const RTL_SORT_OPTIONS: SortOption[] = [
  { label: 'الترتيب المقترح', value: 'featured' },
  { label: 'السعر: من الأقل إلى الأعلى', value: 'price-asc' },
  { label: 'السعر: من الأعلى إلى الأقل', value: 'price-desc' },
  { label: 'وصل حديثًا', value: 'newest' },
];

const RTL_CATEGORY_LABELS: Record<string, string> = {
  accessories: 'اكسسوارات',
  "women's clothing": 'ملابس نسائية',
  'womens clothing': 'ملابس نسائية',
  'women clothing': 'ملابس نسائية',
  "men's clothing": 'ملابس رجالية',
  'mens clothing': 'ملابس رجالية',
  'men clothing': 'ملابس رجالية',
  outerwear: 'جاكيتات ومعاطف',
  footwear: 'أحذية',
  shoes: 'أحذية',
  'home essentials': 'احتياجات البيت',
  'best sellers': 'الأكثر طلبًا',
  'new arrivals': 'وصل حديثًا',
  kitchen: 'المطبخ',
  bathroom: 'الحمام',
  storage: 'التنظيم',
};

const normalizeCatalogLabel = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ');

export const getCatalogSortOptions = (
  direction: StorefrontTextDirection = 'ltr',
): SortOption[] => (direction === 'rtl' ? RTL_SORT_OPTIONS : SORT_OPTIONS);

export const localizeCatalogCategoryLabel = (
  label: string,
  direction: StorefrontTextDirection = 'ltr',
): string => {
  if (direction !== 'rtl') {
    return label;
  }

  return RTL_CATEGORY_LABELS[normalizeCatalogLabel(label)] || label;
};

export const PRICE_RANGE_OPTIONS: PriceRangeOption[] = [
  { value: 'under-25', maxPrice: 25 },
  { value: '25-50', minPrice: 25, maxPrice: 50 },
  { value: '50-100', minPrice: 50, maxPrice: 100 },
  { value: 'over-100', minPrice: 100 },
];

export const getCatalogPriceRangeOptions = (
  currency?: string | null,
  locale = 'en-US',
  direction: StorefrontTextDirection = 'ltr',
): Array<PriceRangeOption & { label: string }> =>
  PRICE_RANGE_OPTIONS.map((option) => {
    if (option.value === 'under-25' && option.maxPrice !== undefined) {
      return {
        ...option,
        label:
          direction === 'rtl'
            ? `أقل من ${formatStorefrontCurrency(option.maxPrice, currency, locale)}`
            : `Under ${formatStorefrontCurrency(option.maxPrice, currency, locale)}`,
      };
    }

    if (
      (option.value === '25-50' || option.value === '50-100') &&
      option.minPrice !== undefined &&
      option.maxPrice !== undefined
    ) {
      return {
        ...option,
        label: `${formatStorefrontCurrency(option.minPrice, currency, locale)} - ${formatStorefrontCurrency(option.maxPrice, currency, locale)}`,
      };
    }

    if (option.value === 'over-100' && option.minPrice !== undefined) {
      return {
        ...option,
        label:
          direction === 'rtl'
            ? `أكثر من ${formatStorefrontCurrency(option.minPrice, currency, locale)}`
            : `Over ${formatStorefrontCurrency(option.minPrice, currency, locale)}`,
      };
    }

    return {
      ...option,
      label: '',
    };
  });

const CATALOG_FILTER_PARAM_KEYS = [
  'category',
  'minPrice',
  'maxPrice',
  'sortBy',
  'sortOrder',
  'search',
] as const;

const parseNumberParam = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : undefined;
};

const deleteCatalogFilterParams = (params: URLSearchParams) => {
  CATALOG_FILTER_PARAM_KEYS.forEach((key) => params.delete(key));
};

export const resolveSortValue = (
  searchParams: URLSearchParams,
): CatalogSortValue => {
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  if (sortBy === 'price' && sortOrder === 'asc') {
    return 'price-asc';
  }

  if (sortBy === 'price' && sortOrder === 'desc') {
    return 'price-desc';
  }

  if (sortBy === 'createdAt' && sortOrder === 'desc') {
    return 'newest';
  }

  return 'featured';
};

export const resolvePriceRangeValue = (
  searchParams: URLSearchParams,
): CatalogPriceRangeValue | null => {
  const minPrice = parseNumberParam(searchParams.get('minPrice'));
  const maxPrice = parseNumberParam(searchParams.get('maxPrice'));

  const match = PRICE_RANGE_OPTIONS.find((option) => (
    option.minPrice === minPrice && option.maxPrice === maxPrice
  ));

  return match?.value || null;
};

export const getCatalogProductQuery = (
  searchParams: URLSearchParams,
): ProductsParams => ({
  category: searchParams.get('category') || undefined,
  search: searchParams.get('search') || undefined,
  sortBy: searchParams.get('sortBy') || undefined,
  sortOrder:
    searchParams.get('sortOrder') === 'asc' ||
    searchParams.get('sortOrder') === 'desc'
      ? (searchParams.get('sortOrder') as 'asc' | 'desc')
      : undefined,
  minPrice: parseNumberParam(searchParams.get('minPrice')),
  maxPrice: parseNumberParam(searchParams.get('maxPrice')),
});

export const applyCatalogFilters = (
  searchParams: URLSearchParams,
  updates: {
    categoryId?: string | null;
    sortValue?: CatalogSortValue;
    priceRangeValue?: CatalogPriceRangeValue | null;
    searchTerm?: string | null;
  },
): URLSearchParams => {
  const nextParams = new URLSearchParams(searchParams);

  if ('categoryId' in updates) {
    if (!updates.categoryId || updates.categoryId === 'all') {
      nextParams.delete('category');
    } else {
      nextParams.set('category', updates.categoryId);
    }
  }

  if ('sortValue' in updates) {
    nextParams.delete('sortBy');
    nextParams.delete('sortOrder');

    if (updates.sortValue === 'price-asc') {
      nextParams.set('sortBy', 'price');
      nextParams.set('sortOrder', 'asc');
    } else if (updates.sortValue === 'price-desc') {
      nextParams.set('sortBy', 'price');
      nextParams.set('sortOrder', 'desc');
    } else if (updates.sortValue === 'newest') {
      nextParams.set('sortBy', 'createdAt');
      nextParams.set('sortOrder', 'desc');
    }
  }

  if ('priceRangeValue' in updates) {
    nextParams.delete('minPrice');
    nextParams.delete('maxPrice');

    const selectedRange = PRICE_RANGE_OPTIONS.find(
      (option) => option.value === updates.priceRangeValue,
    );

    if (selectedRange?.minPrice !== undefined) {
      nextParams.set('minPrice', String(selectedRange.minPrice));
    }

    if (selectedRange?.maxPrice !== undefined) {
      nextParams.set('maxPrice', String(selectedRange.maxPrice));
    }
  }

  if ('searchTerm' in updates) {
    nextParams.delete('search');

    if (updates.searchTerm && updates.searchTerm.trim()) {
      nextParams.set('search', updates.searchTerm.trim());
    }
  }

  return nextParams;
};

export const clearCatalogFilters = (
  searchParams: URLSearchParams,
): URLSearchParams => {
  const nextParams = new URLSearchParams(searchParams);
  deleteCatalogFilterParams(nextParams);
  return nextParams;
};
