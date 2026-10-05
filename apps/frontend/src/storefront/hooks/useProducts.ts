import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStorefrontScope } from '../../utils/storefrontApi';
import { resolvePreviewSource, resolvePreviewThemeId } from '../preview/previewContext';
import {
  filterThemePreviewProducts,
  resolveActiveThemePreviewDataset,
  resolveThemeCatalogPreviewKey,
} from '../preview/themePreviewData';
import {
  fetchStorefrontProducts as fetchStorefrontProductsFromApi,
  getStorefrontProductsQueryKey,
  type ProductsParams,
  type ProductsResponse,
} from '../services/storefrontProducts';

export {
  getStorefrontProductsQueryKey,
  normalizeStorefrontProduct,
  normalizeStorefrontProductVariant,
  type Product,
  type ProductVariant,
  type ProductsParams,
  type ProductsResponse,
} from '../services/storefrontProducts';

interface UseProductsOptions {
  enabled?: boolean;
}

const getActivePreviewThemeId = (): string => {
  if (typeof window === 'undefined') return '';
  const searchParams = new URLSearchParams(window.location.search);
  const fromTheme = searchParams.get('theme')?.trim();
  const fromPreviewTheme = searchParams.get('previewTheme')?.trim();
  const fromMarketplace = resolvePreviewSource() === 'marketplace' ? resolvePreviewThemeId() : '';
  return fromTheme || fromPreviewTheme || fromMarketplace || '';
};

export const resolveStorefrontProductsPreviewKey = (): string => {
  const themePreviewKey = resolveThemeCatalogPreviewKey();
  if (themePreviewKey) {
    return themePreviewKey;
  }

  const activeThemeId = getActivePreviewThemeId();
  return activeThemeId ? `preview:${activeThemeId}` : '';
};

export const fetchStorefrontProducts = async (
  params: ProductsParams = {},
  companyIdOverride?: string | null,
): Promise<ProductsResponse> => {
  const previewDataset = resolveActiveThemePreviewDataset();
  if (previewDataset) {
    return filterThemePreviewProducts(previewDataset, params);
  }

  const activeThemeId = getActivePreviewThemeId();

  // 1. Try fetching real products from API
  try {
    const apiResult = await fetchStorefrontProductsFromApi(params, companyIdOverride);
    if (apiResult.data && apiResult.data.length > 0) {
      return apiResult;
    }
  } catch (error) {
    if (!activeThemeId) {
      throw error;
    }
  }

  // 2. Fallback to marketplace preview products if in editor or theme preview
  if (activeThemeId) {
    const { getMarketplacePreviewProducts } = await import(
      '../preview/marketplaceSampleData'
    );
    const previewData = getMarketplacePreviewProducts(
      params,
      activeThemeId,
    );
    if (previewData && previewData.data.length > 0) {
      return previewData;
    }
  }

  return {
    data: [],
    pagination: { total: 0, page: 1, limit: 12, pages: 0 },
  };
};

export const useProducts = (
  params: ProductsParams = {},
  companyIdOverride?: string | null,
  options: UseProductsOptions = {},
) => {
  const storefrontScope = getStorefrontScope(companyIdOverride);
  const enabled = options.enabled ?? true;
  const previewKey = resolveStorefrontProductsPreviewKey();

  const { data, isLoading, error } = useQuery<ProductsResponse>({
    queryKey: getStorefrontProductsQueryKey(params, storefrontScope, previewKey),
    queryFn: () => fetchStorefrontProducts(params, companyIdOverride),
    staleTime: 60 * 1000,
    enabled,
  });

  return useMemo(() => ({
    products: data?.data || [],
    pagination: data?.pagination || { total: 0, page: 1, limit: 12, pages: 1 },
    isLoading,
    error: error as Error | null,
  }), [data, isLoading, error]);
};
