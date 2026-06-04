import { useQuery } from '@tanstack/react-query';
import { getStorefrontScope, storefrontFetch } from '../../utils/storefrontApi';
import { resolvePreviewSource, resolvePreviewThemeId } from '../preview/previewContext';
import {
  resolveActiveThemePreviewDataset,
  resolveThemeCatalogPreviewKey,
} from '../preview/themePreviewData';

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

export const getStorefrontCategoriesQueryKey = (
  storefrontScope = getStorefrontScope(),
  previewKey = resolveThemeCatalogPreviewKey(),
) => ['storefront', 'categories', storefrontScope, previewKey] as const;

const resolveStorefrontCategoriesPreviewKey = (): string => {
  const themePreviewKey = resolveThemeCatalogPreviewKey();
  if (themePreviewKey) {
    return themePreviewKey;
  }

  const marketplacePreviewThemeId =
    resolvePreviewSource() === 'marketplace' ? resolvePreviewThemeId() : '';
  return marketplacePreviewThemeId ? `marketplace:${marketplacePreviewThemeId}` : '';
};

export const fetchStorefrontCategories = async (
  companyIdOverride?: string | null,
): Promise<Category[]> => {
  const previewDataset = resolveActiveThemePreviewDataset();
  if (previewDataset) {
    return previewDataset.categories;
  }

  const marketplacePreviewThemeId =
    resolvePreviewSource() === 'marketplace' ? resolvePreviewThemeId() : '';
  if (marketplacePreviewThemeId) {
    const { getMarketplacePreviewCategories } = await import(
      '../preview/marketplaceSampleData'
    );
    const previewCategories = getMarketplacePreviewCategories(
      marketplacePreviewThemeId,
    );
    if (previewCategories) {
      return previewCategories;
    }
  }

  const response = await storefrontFetch('/products/categories', {
    companyId: companyIdOverride,
  });
  if (response.success) {
    return response.data;
  }
  throw new Error(response.message || 'Failed to fetch categories');
};

export const useCategories = (
  companyIdOverride?: string | null,
  options?: { enabled?: boolean },
) => {
  const storefrontScope = getStorefrontScope(companyIdOverride);
  const previewKey = resolveStorefrontCategoriesPreviewKey();

  const { data: categories, isLoading, error } = useQuery<Category[]>({
    queryKey: getStorefrontCategoriesQueryKey(storefrontScope, previewKey),
    queryFn: () => fetchStorefrontCategories(companyIdOverride),
    enabled: options?.enabled !== false,
    staleTime: 60 * 60 * 1000,
  });

  return { categories: categories || [], isLoading, error: error as Error | null };
};
