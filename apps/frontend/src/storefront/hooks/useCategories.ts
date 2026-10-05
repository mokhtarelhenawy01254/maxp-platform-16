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

const getActivePreviewThemeId = (): string => {
  if (typeof window === 'undefined') return '';
  const searchParams = new URLSearchParams(window.location.search);
  const fromTheme = searchParams.get('theme')?.trim();
  const fromPreviewTheme = searchParams.get('previewTheme')?.trim();
  const fromMarketplace = resolvePreviewSource() === 'marketplace' ? resolvePreviewThemeId() : '';
  return fromTheme || fromPreviewTheme || fromMarketplace || '';
};

const resolveStorefrontCategoriesPreviewKey = (): string => {
  const themePreviewKey = resolveThemeCatalogPreviewKey();
  if (themePreviewKey) {
    return themePreviewKey;
  }

  const activeThemeId = getActivePreviewThemeId();
  return activeThemeId ? `preview:${activeThemeId}` : '';
};

export const fetchStorefrontCategories = async (
  companyIdOverride?: string | null,
): Promise<Category[]> => {
  const previewDataset = resolveActiveThemePreviewDataset();
  if (previewDataset) {
    return previewDataset.categories;
  }

  const activeThemeId = getActivePreviewThemeId();

  // 1. Try fetching real categories from API
  try {
    const response = await storefrontFetch('/products/categories', {
      companyId: companyIdOverride,
    });
    if (response.success && Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
  } catch (error) {
    if (!activeThemeId) {
      throw error;
    }
  }

  // 2. Fallback to marketplace preview categories if in editor or theme preview
  if (activeThemeId) {
    const { getMarketplacePreviewCategories } = await import(
      '../preview/marketplaceSampleData'
    );
    const previewCategories = getMarketplacePreviewCategories(activeThemeId);
    if (previewCategories && previewCategories.length > 0) {
      return previewCategories;
    }
  }

  return [];
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
