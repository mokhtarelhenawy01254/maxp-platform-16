import type { StorefrontTheme } from '../types/theme.types';
import { DEFAULT_STOREFRONT_THEME_ID } from './themeDefaults';
import {
  extractStorefrontThemePresetId,
  resolveStorefrontThemeFromPreset,
  type StorefrontThemeInput,
} from './themeResolverCore';

export type { StorefrontThemeInput } from './themeResolverCore';
export { extractStorefrontThemePresetId } from './themeResolverCore';

const RUNTIME_THEME_ASSET_LOADERS: Record<string, () => Promise<string>> = {
  [DEFAULT_STOREFRONT_THEME_ID]: () =>
    import('../themes/modern-minimal.json?url').then((module) => module.default),
  'khemet-luxe-eg': () =>
    import('../themes/khemet-luxe-eg.json?url').then((module) => module.default),
};

const cloneThemePresetData = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const loadThemeJsonAsset = async (assetUrl: string): Promise<StorefrontTheme> => {
  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`Failed to load storefront theme asset: ${response.status}`);
  }

  return cloneThemePresetData((await response.json()) as StorefrontTheme);
};

const loadRuntimeThemePreset = async (
  themeId: string,
): Promise<StorefrontTheme | null> => {
  const normalizedThemeId =
    typeof themeId === 'string' && themeId.trim()
      ? themeId.trim()
      : DEFAULT_STOREFRONT_THEME_ID;
  const loadAssetUrl = RUNTIME_THEME_ASSET_LOADERS[normalizedThemeId];

  if (!loadAssetUrl) {
    return null;
  }

  return loadThemeJsonAsset(await loadAssetUrl());
};

export const hasRuntimeStorefrontThemePreset = (themeId: string): boolean =>
  Boolean(RUNTIME_THEME_ASSET_LOADERS[themeId]);

export const resolveRuntimeStorefrontTheme = async (
  input?: StorefrontThemeInput,
): Promise<StorefrontTheme> => {
  const presetId = extractStorefrontThemePresetId(input);

  try {
    const baseTheme = await loadRuntimeThemePreset(presetId);
    if (baseTheme) {
      return resolveStorefrontThemeFromPreset(input, baseTheme, { presetId });
    }
  } catch {
    // Fall back to the full registry below so storefronts keep rendering if an asset is unavailable.
  }

  const { resolveStorefrontTheme } = await import('./themeResolver');
  return resolveStorefrontTheme(input);
};
