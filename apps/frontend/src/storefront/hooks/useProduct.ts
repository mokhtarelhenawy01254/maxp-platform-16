import { useQuery } from '@tanstack/react-query';
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
  const endpoint = presentationSlug
    ? `/products/${encodeURIComponent(idOrSlug)}/${encodeURIComponent(presentationSlug)}`
    : `/products/${encodeURIComponent(idOrSlug)}`;
  const response = await storefrontFetch(endpoint);
  if (response.success) {
    const product = normalizeStorefrontProduct(response.data);
    if (response.data?.canonicalSlug) {
      (product as any)._canonicalSlug = response.data.canonicalSlug;
    }
    if (response.data?.presentation) {
      (product as any)._presentation = response.data.presentation;
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

export const fetchStorefrontProduct = async (
  idOrSlug: string,
  isPreviewMode = resolveStorefrontProductPreviewMode(),
  presentationSlug?: string,
): Promise<Product> => {
  const resolvedPresentationSlug = presentationSlug || getGlobalPresentationSlug();
  if (!idOrSlug) {
    throw new Error('Product ID or Slug is required');
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

  const marketplacePreviewThemeId =
    resolvePreviewSource() === 'marketplace' ? resolvePreviewThemeId() : '';
  if (marketplacePreviewThemeId) {
    const { getMarketplacePreviewProduct } = await import(
      '../preview/marketplaceSampleData'
    );
    const previewMarketplaceProduct =
      getMarketplacePreviewProduct(requestIdOrSlug, marketplacePreviewThemeId) ||
      getMarketplacePreviewProduct(idOrSlug, marketplacePreviewThemeId);
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

    return fetchPublicStorefrontProduct(requestIdOrSlug, resolvedPresentationSlug);
  }

  return fetchPublicStorefrontProduct(requestIdOrSlug, resolvedPresentationSlug);
};

interface UseProductOptions {
  enabled?: boolean;
  presentationSlug?: string;
}

export const useProduct = (
  idOrSlug: string | undefined,
  options: UseProductOptions = {},
) => {
  const isPreviewMode = resolveStorefrontProductPreviewMode();
  const storefrontScope = getStorefrontScope();
  const previewKey = resolveStorefrontProductPreviewKey();
  const requestIdOrSlug = resolveProductSlugForStorefrontRequest(
    idOrSlug,
    storefrontScope,
  );
  const presentationSlug = options.presentationSlug || getGlobalPresentationSlug();

  const { data: product, isLoading, error, refetch } = useQuery<Product>({
    queryKey: getStorefrontProductQueryKey(
      requestIdOrSlug,
      storefrontScope,
      isPreviewMode,
      previewKey,
      presentationSlug,
    ),
    queryFn: () => fetchStorefrontProduct(requestIdOrSlug!, isPreviewMode, presentationSlug),
    enabled: Boolean(requestIdOrSlug) && (options.enabled ?? true),
    staleTime: 60 * 1000,
  });

  return {
    product: product || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
