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
export { extractStorefrontThemePresetId } from './themeResolverCore';

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
