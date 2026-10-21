import type { StorefrontTheme } from '../types/theme.types';
import { DEFAULT_STOREFRONT_THEME_ID } from './themeDefaults';
import {
  extractStorefrontThemePresetId,
  resolveStorefrontThemeFromPreset,
  type StorefrontThemeInput,
} from './themeResolverCore';

export type { StorefrontThemeInput } from './themeResolverCore';
export {
  extractStorefrontThemePresetId,
  resolveStorefrontThemeFromPreset,
  resolvePageStyleVars,
  resolveActivePageKeyFromPath,
  extractPageStyles,
  PAGE_STYLE_DENSITY_GAPS,
  PAGE_STYLE_PRESETS,
} from './themeResolverCore';
import { resolveStorefrontThemeId, getStorefrontThemePreset, normalizeStorefrontThemeCommercePages } from '../themes';

const RUNTIME_THEME_ASSET_LOADERS: Record<string, () => Promise<string>> = {
  [DEFAULT_STOREFRONT_THEME_ID]: () =>
    import('../themes/modern-minimal.json?url').then((module) => module.default),
  'khemet-luxe-eg': () =>
    import('../themes/khemet-luxe-eg.json?url').then((module) => module.default),
  'khemet-fashion-eg': () =>
    import('../themes/khemet-fashion-eg.json?url').then((module) => module.default),
  'redline-auto': () =>
    import('../themes/redline-auto.json?url').then((module) => module.default),
};

const ALL_THEME_URL_LOADERS = import.meta.glob<string>('../themes/*.json', {
  query: '?url',
  import: 'default',
});

const cloneThemePresetData = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const themeAssetPromiseCache = new Map<string, Promise<StorefrontTheme>>();

const loadThemeJsonAsset = async (assetUrl: string): Promise<StorefrontTheme> => {
  const existing = themeAssetPromiseCache.get(assetUrl);
  if (existing) {
    return cloneThemePresetData(await existing);
  }

  const fetchPromise = (async () => {
    const response = await fetch(assetUrl);
    if (!response.ok) {
      throw new Error(`Failed to load storefront theme asset: ${response.status}`);
    }
    return (await response.json()) as StorefrontTheme;
  })();

  themeAssetPromiseCache.set(assetUrl, fetchPromise);
  return cloneThemePresetData(await fetchPromise);
};

const resolveThemeAssetLoader = (
  themeId: string,
): (() => Promise<string>) | null => {
  const normalizedThemeId =
    typeof themeId === 'string' && themeId.trim()
      ? themeId.trim()
      : DEFAULT_STOREFRONT_THEME_ID;
  const canonicalThemeId = resolveStorefrontThemeId(normalizedThemeId);

  if (RUNTIME_THEME_ASSET_LOADERS[canonicalThemeId]) {
    return RUNTIME_THEME_ASSET_LOADERS[canonicalThemeId];
  }

  const globKey = `../themes/${canonicalThemeId}.json`;
  if (ALL_THEME_URL_LOADERS[globKey]) {
    return ALL_THEME_URL_LOADERS[globKey];
  }

  return null;
};

const loadRuntimeThemePreset = async (
  themeId: string,
): Promise<StorefrontTheme | null> => {
  const loadAssetUrl = resolveThemeAssetLoader(themeId);
  if (!loadAssetUrl) {
    return null;
  }

  return loadThemeJsonAsset(await loadAssetUrl());
};

export const hasRuntimeStorefrontThemePreset = (themeId: string): boolean =>
  Boolean(resolveThemeAssetLoader(themeId));

export const preloadRuntimeStorefrontTheme = async (
  themeId: string,
): Promise<void> => {
  try {
    await loadRuntimeThemePreset(themeId);
  } catch {
    // Ignore preload failures; runtime resolver will fall back cleanly
  }
};

export const resolveRuntimeStorefrontTheme = async (
  input?: StorefrontThemeInput,
): Promise<StorefrontTheme> => {
  const presetId = extractStorefrontThemePresetId(input);

  try {
    const baseTheme = await loadRuntimeThemePreset(presetId);
    if (baseTheme) {
      return resolveStorefrontThemeFromPreset(input, baseTheme, { presetId, normalizeTheme: normalizeStorefrontThemeCommercePages });
    }
  } catch {
    // Fall back to the default theme asset below if the requested preset is unavailable.
  }

  try {
    const defaultTheme = await loadRuntimeThemePreset(DEFAULT_STOREFRONT_THEME_ID);
    if (defaultTheme) {
      return resolveStorefrontThemeFromPreset(input, defaultTheme, {
        presetId: DEFAULT_STOREFRONT_THEME_ID,
        normalizeTheme: normalizeStorefrontThemeCommercePages,
      });
    }
  } catch {
    // Ignore secondary fallback errors
  }

  try {
    const staticBase = getStorefrontThemePreset(presetId);
    if (staticBase) {
      return resolveStorefrontThemeFromPreset(input, staticBase, { presetId, normalizeTheme: normalizeStorefrontThemeCommercePages });
    }
  } catch {
    // Ignore static fallback errors
  }

  return resolveStorefrontThemeFromPreset(
    input,
    {
      id: presetId || DEFAULT_STOREFRONT_THEME_ID,
      name: presetId || 'Storefront',
      pages: {
        home: { sections: [] },
        shop: { sections: [] },
        product: { sections: [] },
        cart: { sections: [] },
        checkout: { sections: [] },
      },
    } as unknown as StorefrontTheme,
    { presetId },
  );
};
