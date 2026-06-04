import {
  isMarketplaceThemePreview,
  resolvePreviewSource,
  resolvePreviewThemeId,
} from './previewContext';

export interface ThemePreviewCategory {
  id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

export interface ThemePreviewProductVariant {
  id: string;
  name: string;
  price?: number | null;
  comparePrice?: number | null;
  sku?: string;
  image?: string;
  attributes?: Record<string, string> | null;
  attributeValues?: Record<string, string> | string | null;
}

export interface ThemePreviewProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  images: string[];
  mainImage?: string;
  slug: string;
  categoryId?: string;
  category?: ThemePreviewCategory;
  createdAt?: string;
  tags?: string[];
  productVariants?: ThemePreviewProductVariant[];
  variants?: ThemePreviewProductVariant[];
  relatedProductIds?: string[];
  bundleProductIds?: string[];
  [key: string]: unknown;
}

export interface ThemePreviewDataset {
  themeId: string;
  version: string;
  companyName: string;
  companySlug: string;
  storeName: string;
  currency: string;
  description: string;
  logo?: string | null;
  categories: ThemePreviewCategory[];
  products: ThemePreviewProduct[];
}

interface ThemePreviewQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
}

interface ThemePreviewProductsResponse {
  data: ThemePreviewProduct[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

type RecommendationMode = 'related' | 'bundle';

const buildCategoryMap = (
  categories: ThemePreviewCategory[],
): Record<string, ThemePreviewCategory> =>
  categories.reduce<Record<string, ThemePreviewCategory>>((accumulator, category) => {
    accumulator[category.id] = category;
    accumulator[category.slug] = category;
    return accumulator;
  }, {});

const THEME_PREVIEW_DATASETS: Record<string, ThemePreviewDataset> = {};

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value: string): string =>
  value.trim().toLowerCase();

const normalizeProduct = (
  product: ThemePreviewProduct,
  categoryMap: Record<string, ThemePreviewCategory>,
): ThemePreviewProduct => {
  const category =
    (product.categoryId && categoryMap[product.categoryId]) ||
    (product.category?.id && categoryMap[product.category.id]) ||
    product.category;
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : product.mainImage
      ? [product.mainImage]
      : category?.image
        ? [category.image]
        : [];

  const normalizedProduct = {
    ...product,
    categoryId: category?.id || product.categoryId,
    category,
    images,
    mainImage: images[0],
  };

  if (!normalizedProduct.productVariants && Array.isArray(normalizedProduct.variants)) {
    normalizedProduct.productVariants = normalizedProduct.variants;
  }

  if (!normalizedProduct.variants && Array.isArray(normalizedProduct.productVariants)) {
    normalizedProduct.variants = normalizedProduct.productVariants;
  }

  return normalizedProduct;
};

const normalizeDataset = (dataset: ThemePreviewDataset): ThemePreviewDataset => {
  const categoryMap = buildCategoryMap(dataset.categories);

  return {
    ...dataset,
    categories: dataset.categories.map((category) => ({ ...category })),
    products: dataset.products.map((product) => normalizeProduct(product, categoryMap)),
  };
};

const matchesCategory = (
  product: ThemePreviewProduct,
  categoryValue: string,
): boolean => {
  const normalizedValue = normalizeText(categoryValue);
  return [
    product.categoryId,
    product.category?.id,
    product.category?.slug,
    product.category?.name,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .some((value) => normalizeText(value) === normalizedValue);
};

const matchesSearch = (
  product: ThemePreviewProduct,
  searchValue: string,
): boolean => {
  const normalizedSearch = normalizeText(searchValue);
  const haystack = [
    product.name,
    product.description,
    product.category?.name || '',
    ...(Array.isArray(product.tags) ? product.tags : []),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedSearch);
};

const sortProducts = (
  products: ThemePreviewProduct[],
  params: ThemePreviewQueryParams,
): ThemePreviewProduct[] => {
  const sortedProducts = [...products];
  const sortBy = String(params.sortBy || '').trim();
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';

  if (sortBy === 'price') {
    sortedProducts.sort((left, right) =>
      sortOrder === 'asc' ? left.price - right.price : right.price - left.price,
    );
    return sortedProducts;
  }

  if (sortBy === 'createdAt') {
    sortedProducts.sort((left, right) => {
      const leftTime = Date.parse(String(left.createdAt || 0));
      const rightTime = Date.parse(String(right.createdAt || 0));
      return sortOrder === 'asc' ? leftTime - rightTime : rightTime - leftTime;
    });
    return sortedProducts;
  }

  return sortedProducts;
};

const buildPagination = (
  total: number,
  page: number,
  limit: number,
): ThemePreviewProductsResponse['pagination'] => ({
  total,
  page,
  limit,
  pages: total === 0 ? 0 : Math.ceil(total / limit),
});

export const getThemePreviewDataset = (
  themeId: string,
): ThemePreviewDataset | null => {
  const dataset = THEME_PREVIEW_DATASETS[themeId];
  return dataset ? normalizeDataset(dataset) : null;
};

export const resolveActiveThemePreviewDataset = (
  search?: string,
): ThemePreviewDataset | null => {
  if (!isMarketplaceThemePreview(search)) {
    return null;
  }

  const themeId = resolvePreviewThemeId(search);
  return themeId ? getThemePreviewDataset(themeId) : null;
};

export const resolveThemeCatalogPreviewKey = (search?: string): string => {
  const dataset = resolveActiveThemePreviewDataset(search);
  return dataset ? `${dataset.themeId}:${dataset.version}` : '';
};

export const filterThemePreviewProducts = (
  dataset: ThemePreviewDataset,
  params: ThemePreviewQueryParams = {},
): ThemePreviewProductsResponse => {
  const page = Number.isFinite(Number(params.page)) && Number(params.page) > 0
    ? Math.round(Number(params.page))
    : 1;
  const limit = Number.isFinite(Number(params.limit)) && Number(params.limit) > 0
    ? Math.round(Number(params.limit))
    : 12;

  const filteredProducts = sortProducts(
    dataset.products.filter((product) => {
      if (params.category && !matchesCategory(product, params.category)) {
        return false;
      }

      if (params.search && !matchesSearch(product, params.search)) {
        return false;
      }

      if (typeof params.minPrice === 'number' && product.price < params.minPrice) {
        return false;
      }

      if (typeof params.maxPrice === 'number' && product.price > params.maxPrice) {
        return false;
      }

      return true;
    }),
    params,
  );

  const offset = (page - 1) * limit;

  return {
    data: filteredProducts.slice(offset, offset + limit),
    pagination: buildPagination(filteredProducts.length, page, limit),
  };
};

export const findThemePreviewProduct = (
  dataset: ThemePreviewDataset,
  idOrSlug: string,
): ThemePreviewProduct | null => {
  const normalizedValue = normalizeText(idOrSlug);

  return (
    dataset.products.find((product) =>
      normalizeText(product.id) === normalizedValue ||
      normalizeText(product.slug) === normalizedValue,
    ) || null
  );
};

export const getThemePreviewProductRecommendations = (
  dataset: ThemePreviewDataset,
  productIdOrSlug: string,
  mode: RecommendationMode,
  limit = 4,
): ThemePreviewProduct[] => {
  const seedProduct = findThemePreviewProduct(dataset, productIdOrSlug);
  if (!seedProduct) {
    return [];
  }

  const preferredIds =
    mode === 'bundle'
      ? seedProduct.bundleProductIds || []
      : seedProduct.relatedProductIds || [];
  const preferredProducts = preferredIds
    .map((productId) => findThemePreviewProduct(dataset, productId))
    .filter((product): product is ThemePreviewProduct => Boolean(product))
    .filter((product) => product.id !== seedProduct.id);

  const fallbackProducts = dataset.products.filter(
    (product) =>
      product.id !== seedProduct.id &&
      product.categoryId === seedProduct.categoryId &&
      !preferredProducts.some((candidate) => candidate.id === product.id),
  );

  return [...preferredProducts, ...fallbackProducts].slice(0, Math.max(1, limit));
};

export const applyThemePreviewSettingsPatch = <
  T extends {
    company?: Record<string, any>;
    storefront?: Record<string, any>;
    storefrontSettings?: Record<string, any>;
  },
>(
  settings: T,
  previewThemeId: string,
  previewSource: string = resolvePreviewSource(),
): T => {
  const dataset = getThemePreviewDataset(previewThemeId);

  if (!dataset || previewSource !== 'marketplace') {
    return settings;
  }

  const company = isRecord(settings.company) ? settings.company : {};
  const companySettings = isRecord(company.settings) ? company.settings : {};
  const storefront = isRecord(settings.storefront) ? settings.storefront : {};
  const storefrontRuntimeSettings = isRecord(storefront.settings) ? storefront.settings : {};
  const publicStorefrontSettings = isRecord(settings.storefrontSettings)
    ? settings.storefrontSettings
    : {};
  const resolvedCurrency =
    String(
      storefrontRuntimeSettings['currency'] ||
      publicStorefrontSettings['currency'] ||
      company['currency'] ||
      dataset.currency,
    ).trim() || dataset.currency;

  return {
    ...settings,
    company: {
      ...company,
      name: dataset.companyName,
      slug: dataset.companySlug,
      logo: dataset.logo ?? company.logo ?? null,
      currency: resolvedCurrency,
      settings: {
        ...companySettings,
        description: dataset.description,
      },
    },
    storefront: {
      ...storefront,
      settings: {
        ...storefrontRuntimeSettings,
        storeName: dataset.storeName,
        currency: resolvedCurrency,
        description: dataset.description,
      },
    },
    storefrontSettings: {
      ...publicStorefrontSettings,
      storeName: dataset.storeName,
      description: dataset.description,
      currency: resolvedCurrency,
      companySlug: dataset.companySlug,
    },
  };
};
