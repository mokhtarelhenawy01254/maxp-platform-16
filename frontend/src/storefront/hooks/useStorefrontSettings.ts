import { useQuery } from '@tanstack/react-query';
import { getStorefrontScope, storefrontFetch } from '../../utils/storefrontApi';
import type { StorefrontSettings as PublicStorefrontSettings } from '../../services/storefrontSettingsService';
import {
  resolvePreviewSource,
  resolvePreviewThemeId,
} from '../preview/previewContext';
import { applyThemePreviewSettingsPatch } from '../preview/themePreviewData';

export interface StorefrontSettings {
  company: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    currency: string;
    settings: Record<string, unknown>;
  };
  storefront: {
    themeId?: string;
    apps?: Record<
      string,
      {
        enabled: boolean;
        status?: string;
        settings?: Record<string, unknown>;
      }
    >;
    designTokens?: {
      colors?: Record<string, string>;
      typography?: Record<string, string>;
      shape?: Record<string, string>;
    };
    storefrontFeatures: {
      quickViewEnabled: boolean;
      comparisonEnabled: boolean;
      wishlistEnabled: boolean;
      recentlyViewedEnabled?: boolean;
      advancedFiltersEnabled: boolean;
      productCardStyle: string;
      gridAddToCartIcon: string;
      gridDiscountBanner: boolean;
    };
    settings: {
      storeName: string;
      currency: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  storefrontSettings?: PublicStorefrontSettings;
  templateId: string | null;
  lastUpdated: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export { resolvePreviewThemeId } from '../preview/previewContext';

const DEFAULT_STOREFRONT_FEATURES = {
  quickViewEnabled: true,
  comparisonEnabled: false,
  wishlistEnabled: true,
  recentlyViewedEnabled: true,
  advancedFiltersEnabled: true,
  productCardStyle: 'default',
  gridAddToCartIcon: 'bag',
  gridDiscountBanner: true,
} satisfies StorefrontSettings['storefront']['storefrontFeatures'];

const applyPreviewTheme = (
  settings: StorefrontSettings,
  previewThemeId: string,
  previewSource: string,
): StorefrontSettings => {
  if (!previewThemeId) {
    return settings;
  }

  const currentStorefrontSettings: Record<string, unknown> = isRecord(settings.storefront?.settings)
    ? settings.storefront.settings
    : {};
  const previewStorefrontSettings = {
    themeId: previewThemeId,
    storeName:
      typeof currentStorefrontSettings["storeName"] === 'string' &&
      currentStorefrontSettings["storeName"].trim()
        ? currentStorefrontSettings["storeName"]
        : settings.company?.name || 'Storefront',
    currency:
      typeof currentStorefrontSettings["currency"] === 'string' &&
      currentStorefrontSettings["currency"].trim()
        ? currentStorefrontSettings["currency"]
        : settings.company?.currency || 'EGP',
  };

  const previewSettings = {
    ...settings,
    storefront: {
      ...settings.storefront,
      themeId: previewThemeId,
      // Clear out stale design tokens and pages to let the preset theme values shine through
      designTokens: {},
      pages: undefined,
      sections: undefined,
      settings: previewStorefrontSettings,
      isPreview: true,
    },
  };

  return applyThemePreviewSettingsPatch(
    previewSettings,
    previewThemeId,
    previewSource,
  );
};

export const buildPreviewStorefrontSettingsFallback = import.meta.env.PROD
  ? async (): Promise<StorefrontSettings | null> => null
  : async (
      previewThemeId: string,
      previewSource: string,
    ): Promise<StorefrontSettings | null> => {
  if (!previewThemeId || previewSource !== 'marketplace') {
    return null;
  }

  const [{ hasStorefrontThemePreset, getStorefrontThemePreset }, { hasMarketplacePreviewDataset }] =
    await Promise.all([
      import('../themes'),
      import('../preview/marketplaceSampleData'),
    ]);

  if (
    !hasStorefrontThemePreset(previewThemeId) ||
    !hasMarketplacePreviewDataset(previewThemeId)
  ) {
    return null;
  }

  const presetTheme = getStorefrontThemePreset(previewThemeId);
  const fallbackSettings: StorefrontSettings = {
    company: {
      id: `preview-${previewThemeId}`,
      name: presetTheme.name,
      slug: previewThemeId,
      logo: null,
      currency: 'EGP',
      settings: {},
    },
    storefront: {
      themeId: previewThemeId,
      apps: {},
      designTokens: {},
      storefrontFeatures: DEFAULT_STOREFRONT_FEATURES,
      settings: {
        storeName: presetTheme.name,
        currency: 'EGP',
      },
      isPreview: true,
    },
    storefrontSettings: {
      storeName: presetTheme.name,
      currency: 'EGP',
      companySlug: previewThemeId,
      description:
        presetTheme.seo?.description ||
        'Preview storefront settings generated from the local theme preset.',
    } as PublicStorefrontSettings,
    templateId: null,
    lastUpdated: new Date().toISOString(),
  };

  return applyPreviewTheme(fallbackSettings, previewThemeId, previewSource);
};

export const getStorefrontSettingsQueryKey = (
  storefrontScope = getStorefrontScope(),
  previewThemeId = resolvePreviewThemeId(),
  previewSource = resolvePreviewSource(),
) => ['storefront', 'settings', storefrontScope, previewSource, previewThemeId] as const;

export const fetchStorefrontSettings = async (
  previewThemeId = resolvePreviewThemeId(),
  previewSource = resolvePreviewSource(),
): Promise<StorefrontSettings> => {
  if (previewSource === 'marketplace' && previewThemeId) {
    const previewFallback = await buildPreviewStorefrontSettingsFallback(
      previewThemeId,
      previewSource,
    );
    if (previewFallback) {
      return previewFallback;
    }
  }

  try {
    const response = await storefrontFetch('/storefront/settings');
    if (response.success) {
      const companyId = response.data?.company?.id;
      if (typeof window !== 'undefined' && typeof companyId === 'string' && companyId.trim()) {
        try {
          window.localStorage.setItem('storefront_companyId', companyId);
        } catch {
          // Ignore storage failures in restricted browser contexts.
        }
      }

      return applyPreviewTheme(response.data, previewThemeId, previewSource);
    }

    const previewFallback = await buildPreviewStorefrontSettingsFallback(
      previewThemeId,
      previewSource,
    );
    if (previewFallback) {
      return previewFallback;
    }

    throw new Error(response.message || 'Failed to fetch settings');
  } catch (error) {
    const previewFallback = await buildPreviewStorefrontSettingsFallback(
      previewThemeId,
      previewSource,
    );
    if (previewFallback) {
      return previewFallback;
    }

    throw error;
  }
};

interface UseStorefrontSettingsOptions {
  enabled?: boolean;
}

export const useStorefrontSettings = (
  options: UseStorefrontSettingsOptions = {},
) => {
  const storefrontScope = getStorefrontScope();
  const previewThemeId = resolvePreviewThemeId();
  const previewSource = resolvePreviewSource();

  const { data: settings, isLoading, error } = useQuery<StorefrontSettings>({
    queryKey: getStorefrontSettingsQueryKey(
      storefrontScope,
      previewThemeId,
      previewSource,
    ),
    queryFn: () => fetchStorefrontSettings(previewThemeId, previewSource),
    enabled: options.enabled ?? true,
    staleTime: Infinity, // Settings change infrequently, keep them until hard refresh or explicit invalidation
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
  });

  return {
    settings: settings || null,
    isLoading,
    error: error as Error | null,
    previewThemeId: previewThemeId || null,
  };
};
