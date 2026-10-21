import {
  getStorefrontThemePreset,
  normalizeStorefrontThemeCommercePages,
} from '../themes';
import type { StorefrontTheme } from '../types/theme.types';
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
  extractPageStyles,
  PAGE_STYLE_DENSITY_GAPS,
  PAGE_STYLE_PRESETS,
} from './themeResolverCore';

export const resolveStorefrontTheme = (
  input?: StorefrontThemeInput,
): StorefrontTheme => {
  const presetId = extractStorefrontThemePresetId(input);
  const baseTheme = getStorefrontThemePreset(presetId);
  return resolveStorefrontThemeFromPreset(input, baseTheme, {
    presetId,
    normalizeTheme: normalizeStorefrontThemeCommercePages,
  });
};
