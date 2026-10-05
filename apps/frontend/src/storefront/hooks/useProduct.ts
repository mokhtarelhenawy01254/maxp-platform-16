import { useQuery, useQueryClient } from '@tanstack/react-query';
import { resolvePreviewSource, resolvePreviewThemeId } from '../preview/previewContext';
import {
  findThemePreviewProduct,
  resolveActiveThemePreviewDataset,
  resolveThemeCatalogPreviewKey,
} from '../preview/themePreviewData';
import { getCompanyId, getStorefrontScope, storefrontFetch } from '../../utils/storefrontApi';
import { Product, normalizeStorefrontProduct } from './useProducts';
import { resolveLegacyProductSlugAlias } from '../utils/productSlugAliases';

let _globalPresentationSlug: string | null = null;

export const setGlobalPresentationSlug = (slug: string | null) => {
  _globalPresentationSlug = slug;
};

export const getGlobalPresentationSlug = () => _globalPresentationSlug;

export const resolveStorefrontProductPreviewMode = (): boolean =>
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('productPreview') === '1' ||
   new URLSearchParams(window.location.search).get('preview') === '1');

export const resolveStorefrontProductPreviewProductId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const previewProductId = new URLSearchParams(window.location.search)
    .get('previewProductId')
    ?.trim();

  return previewProductId || null;
};

export const getStorefrontProductQueryKey = (
  idOrSlug: string | undefined,
  storefrontScope = getStorefrontScope(),
  isPreviewMode = resolveStorefrontProductPreviewMode(),
  previewKey = resolveThemeCatalogPreviewKey(),
  presentationSlug?: string,
) =>
  [
    'storefront',
    'product',
    storefrontScope,
    idOrSlug,
    isPreviewMode ? 'preview' : 'public',
    previewKey,
    presentationSlug || '_default',
  ] as const;

const getStoredUserCompanyId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawUser = window.localStorage.getItem('user');
    if (!rawUser) {
      return null;
    }

    const parsedUser = JSON.parse(rawUser) as { companyId?: string | null };
    return typeof parsedUser?.companyId === 'string' && parsedUser.companyId.trim()
      ? parsedUser.companyId
      : null;
  } catch {
    return null;
  }
};

const getPreviewApiBaseUrl = async (): Promise<string> => {
  const { getApiUrl } = await import('../../config/environment');
  return getApiUrl().replace(/\/$/, '');
};

const getPreviewRequestHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const { tokenManager } = await import('../../utils/tokenManager');
  const token = tokenManager.getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const companyId = getCompanyId() || getStoredUserCompanyId();
  if (companyId) {
    headers['X-Company-Id'] = companyId;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.trim().toLowerCase();
    const parts = hostname.split('.');
    const isIpAddress = parts.length === 4 && parts.every((part) => /^\d+$/.test(part));
    const reservedSubdomains = new Set(['www', 'app', 'admin', 'api', 'dev', 'staging', 'mail']);

    if (!isIpAddress && parts.length >= 3 && !reservedSubdomains.has(parts[0] || '')) {
      const subdomain = parts[0] || '';
      if (subdomain) {
        headers['X-Company-Subdomain'] = subdomain;
        headers['X-Subdomain'] = subdomain;
        headers['X-Company-Slug'] = subdomain;
      }
    }
  }

  return headers;
};

const fetchPreviewProductFromAdminApi = async (
  idOrSlug: string,
): Promise<Product | null> => {
  try {
    const [apiBaseUrl, headers] = await Promise.all([
      getPreviewApiBaseUrl(),
      getPreviewRequestHeaders(),
    ]);

    // If no access token is available (e.g. running on a merchant's store subdomain),
    // skip the admin API to prevent 401 errors and proceed directly to public storefront fetch.
    if (!headers.Authorization) {
      return null;
    }

    const response = await fetch(
      `${apiBaseUrl}/products/${encodeURIComponent(idOrSlug)}`,
      {
        headers,
        credentials: 'include',
      },
    );
    const payload = await response.json().catch(() => null);
    const previewProduct = payload?.data;

    if (response.ok && payload?.success && previewProduct) {
      return normalizeStorefrontProduct(previewProduct);
    }

    if ([401, 403, 404].includes(response.status)) {
      return null;
    }

    throw new Error(payload?.message || 'Failed to fetch preview product');
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : 'Failed to fetch preview product',
    );
  }
};

const fetchPublicStorefrontProduct = async (
  idOrSlug: string,
  presentationSlug?: string,
): Promise<Product> => {
  const isPreview = resolveStorefrontProductPreviewMode();
  const queryParam = isPreview ? '?preview=1' : '';
  const endpoint = presentationSlug
    ? `/products/${encodeURIComponent(idOrSlug)}/${encodeURIComponent(presentationSlug)}${queryParam}`
    : `/products/${encodeURIComponent(idOrSlug)}${queryParam}`;
  const response = await storefrontFetch(endpoint);
  if (response.success) {
    const product = normalizeStorefrontProduct(response.data);

    // اللينك القديم لمنتج محوّل (تحويل مكرر لعرض تقديمي): نوجّه المتصفح
    // للينك الكنسوني عشان الـ reviews/المشاركة/السلة تشتغل على الـ slug الصحيح.
    const redirectedFrom = response.data?.redirectedFrom;
    const canonicalSlug = response.data?.canonicalSlug || response.data?.slug;
    const canonicalPresentation = response.data?.presentation?.slug;
    if (
      redirectedFrom &&
      canonicalSlug &&
      typeof window !== 'undefined' &&
      !resolveStorefrontProductPreviewMode()
    ) {
      const pathPrefix = window.location.pathname.includes('/store/')
        ? '/store'
        : window.location.pathname.includes('/shop/')
          ? '/shop'
          : '';
      const targetPath = canonicalPresentation
        ? `${pathPrefix}/products/${encodeURIComponent(canonicalSlug)}/${encodeURIComponent(canonicalPresentation)}`
        : `${pathPrefix}/products/${encodeURIComponent(canonicalSlug)}`;
      const currentPath = window.location.pathname;
      if (currentPath !== targetPath) {
        // replace يعمل update للـ URL + تحميل من غير ما يضيف entry في الـ history
        window.location.replace(targetPath);
      }
    }

    return product;
  }

  throw new Error(response.message || 'Failed to fetch product');
};

const resolveProductSlugForStorefrontRequest = (
  idOrSlug: string | undefined,
  storefrontScope = getStorefrontScope(),
): string | undefined => {
  if (!idOrSlug) {
    return idOrSlug;
  }

  return (
    resolveLegacyProductSlugAlias(idOrSlug, {
      companyId: getCompanyId() || storefrontScope,
      companySlug: storefrontScope,
      hostname:
        typeof window === 'undefined'
          ? storefrontScope
          : window.location.hostname,
    }) || idOrSlug
  );
};

const resolveStorefrontProductPreviewKey = (): string => {
  const themePreviewKey = resolveThemeCatalogPreviewKey();
  if (themePreviewKey) {
    return themePreviewKey;
  }

  const marketplacePreviewThemeId =
    resolvePreviewSource() === 'marketplace' ? resolvePreviewThemeId() : '';
  return marketplacePreviewThemeId ? `marketplace:${marketplacePreviewThemeId}` : '';
};

const getActivePreviewThemeId = (): string => {
  if (typeof window === 'undefined') return '';
  const searchParams = new URLSearchParams(window.location.search);
  const fromTheme = searchParams.get('theme')?.trim();
  const fromPreviewTheme = searchParams.get('previewTheme')?.trim();
  const fromMarketplace = resolvePreviewSource() === 'marketplace' ? resolvePreviewThemeId() : '';
  return fromTheme || fromPreviewTheme || fromMarketplace || '';
};

export const fetchStorefrontProduct = async (
  idOrSlug: string,
  isPreviewMode = resolveStorefrontProductPreviewMode(),
  presentationSlug?: string,
): Promise<Product> => {
  const resolvedPresentationSlug = presentationSlug || getGlobalPresentationSlug();
  if (!idOrSlug) {
    throw new Error('Product ID or Slug is required');
  }

  const activeThemeId = getActivePreviewThemeId();
  const isExplicitPreview = idOrSlug.startsWith('preview:');
  const previewThemeFromSlug = isExplicitPreview
    ? idOrSlug.replace('preview:', '').trim()
    : '';
  const effectivePreviewThemeId = previewThemeFromSlug || activeThemeId;

  if (isExplicitPreview && effectivePreviewThemeId) {
    const { getMarketplacePreviewProducts } = await import(
      '../preview/marketplaceSampleData'
    );
    const sampleProducts = getMarketplacePreviewProducts(
      { limit: 1 },
      effectivePreviewThemeId,
    );
    if (sampleProducts?.data?.[0]) {
      return sampleProducts.data[0];
    }
  }

  const requestIdOrSlug = resolveProductSlugForStorefrontRequest(idOrSlug) || idOrSlug;
  const previewDataset = resolveActiveThemePreviewDataset();
  if (previewDataset) {
    const previewProduct =
      findThemePreviewProduct(previewDataset, requestIdOrSlug) ||
      findThemePreviewProduct(previewDataset, idOrSlug) ||
      previewDataset.products[0] ||
      null;
    if (previewProduct) {
      return previewProduct;
    }
  }

  if (effectivePreviewThemeId) {
    const { getMarketplacePreviewProduct } = await import(
      '../preview/marketplaceSampleData'
    );
    const previewMarketplaceProduct =
      getMarketplacePreviewProduct(requestIdOrSlug, effectivePreviewThemeId) ||
      getMarketplacePreviewProduct(idOrSlug, effectivePreviewThemeId);
    if (previewMarketplaceProduct) {
      return previewMarketplaceProduct;
    }
  }

  if (isPreviewMode) {
    const previewProduct = await fetchPreviewProductFromAdminApi(
      resolveStorefrontProductPreviewProductId() || requestIdOrSlug,
    );
    if (previewProduct) {
      return previewProduct;
    }

    try {
      return await fetchPublicStorefrontProduct(requestIdOrSlug, resolvedPresentationSlug);
    } catch (err) {
      if (effectivePreviewThemeId) {
        const { getMarketplacePreviewProducts } = await import(
          '../preview/marketplaceSampleData'
        );
        const sampleProducts = getMarketplacePreviewProducts(
          { limit: 1 },
          effectivePreviewThemeId,
        );
        if (sampleProducts?.data?.[0]) {
          return sampleProducts.data[0];
        }
      }
      throw err;
    }
  }

  try {
    return await fetchPublicStorefrontProduct(requestIdOrSlug, resolvedPresentationSlug);
  } catch (err) {
    if (effectivePreviewThemeId) {
      const { getMarketplacePreviewProducts } = await import(
        '../preview/marketplaceSampleData'
      );
      const sampleProducts = getMarketplacePreviewProducts(
        { limit: 1 },
        effectivePreviewThemeId,
      );
      if (sampleProducts?.data?.[0]) {
        return sampleProducts.data[0];
      }
    }
    throw err;
  }
};

interface UseProductOptions {
  enabled?: boolean;
  presentationSlug?: string;
}

export const useProduct = (
  idOrSlug: string | undefined,
  options: UseProductOptions = {},
) => {
  const activeThemeId = getActivePreviewThemeId();
  const effectiveRawId = idOrSlug?.trim() || (activeThemeId ? `preview:${activeThemeId}` : undefined);
  const isPreviewMode = resolveStorefrontProductPreviewMode();
  const storefrontScope = getStorefrontScope();
  const previewKey = resolveStorefrontProductPreviewKey();
  const requestIdOrSlug = effectiveRawId?.startsWith('preview:')
    ? effectiveRawId
    : resolveProductSlugForStorefrontRequest(
        effectiveRawId,
        storefrontScope,
      );
  const presentationSlug = options.presentationSlug || getGlobalPresentationSlug();
  const queryClient = useQueryClient();

  const queryKey = getStorefrontProductQueryKey(
    requestIdOrSlug,
    storefrontScope,
    isPreviewMode,
    previewKey,
    presentationSlug,
  );

  const { data: product, isLoading, error, refetch } = useQuery<Product>({
    queryKey,
    queryFn: () => fetchStorefrontProduct(requestIdOrSlug!, isPreviewMode, presentationSlug),
    enabled: Boolean(requestIdOrSlug) && (options.enabled ?? true),
    staleTime: 0,
    placeholderData: () => {
      if (!requestIdOrSlug) return undefined;
      const cached = queryClient.getQueryData<Product>(queryKey);
      if (cached) return cached;

      const cachedProductsList = queryClient.getQueriesData<{ data?: Product[] }>({
        queryKey: ['storefront', 'products', storefrontScope],
      });
      for (const [, res] of cachedProductsList) {
        if (Array.isArray(res?.data)) {
          const match = res.data.find(
            (p) => p.id === requestIdOrSlug || p.slug === requestIdOrSlug,
          );
          if (match && match.metadata) return match;
        }
      }
      return undefined;
    },
  });

  return {
    product: product || null,
    isLoading: isLoading && !product,
    error: error as Error | null,
    refetch,
  };
};
