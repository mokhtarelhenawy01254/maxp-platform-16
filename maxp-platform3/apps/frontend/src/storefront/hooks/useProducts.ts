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

export const resolveStorefrontProductsPreviewKey = (): string => {
  const themePreviewKey = resolveThemeCatalogPreviewKey();
  if (themePreviewKey) {
    return themePreviewKey;
  }

  const marketplacePreviewThemeId =
    resolvePreviewSource() === 'marketplace' ? resolvePreviewThemeId() : '';
  return marketplacePreviewThemeId ? `marketplace:${marketplacePreviewThemeId}` : '';
};

export const fetchStorefrontProducts = async (
  params: ProductsParams = {},
  companyIdOverride?: string | null,
): Promise<ProductsResponse> => {
  const previewDataset = resolveActiveThemePreviewDataset();
  if (previewDataset) {
    return filterThemePreviewProducts(previewDataset, params);
  }

  const marketplacePreviewThemeId =
    resolvePreviewSource() === 'marketplace' ? resolvePreviewThemeId() : '';
  if (marketplacePreviewThemeId) {
    const { getMarketplacePreviewProducts } = await import(
      '../preview/marketplaceSampleData'
    );
    const previewData = getMarketplacePreviewProducts(
      params,
      marketplacePreviewThemeId,
    );
    if (previewData) {
      return previewData;
    }
  }

  return fetchStorefrontProductsFromApi(params, companyIdOverride);
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
