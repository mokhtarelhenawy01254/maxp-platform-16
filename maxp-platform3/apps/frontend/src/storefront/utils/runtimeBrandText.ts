import type { StorefrontSectionConfig, StorefrontTheme } from '../types/theme.types';

type RuntimeStorefrontSettings = {
  storefront?: {
    settings?: Record<string, unknown> | null;
  } | null;
  company?: {
    name?: string | null;
  } | null;
} | null;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getRuntimeStoreName = (settings?: RuntimeStorefrontSettings): string =>
  String(settings?.storefront?.settings?.storeName || settings?.company?.name || '').trim();

const getThemeBrandNames = (theme: StorefrontTheme): string[] =>
  [theme.header?.brandName, theme.name]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map((value) => value.trim());

export const createStorefrontThemeTextReplacer = ({
  theme,
  settings,
  isThemePreview = false,
}: {
  theme: StorefrontTheme;
  settings?: RuntimeStorefrontSettings;
  isThemePreview?: boolean;
}) => {
  const runtimeStoreName = getRuntimeStoreName(settings);
  const themeBrandNames = getThemeBrandNames(theme);
  const displayStoreName =
    (isThemePreview && theme.header?.brandName) ||
    runtimeStoreName ||
    theme.header?.brandName ||
    settings?.company?.name ||
    theme.name;
  const shouldReplaceThemeBrand =
    !isThemePreview &&
    Boolean(runtimeStoreName) &&
    themeBrandNames.some((brandName) => brandName !== runtimeStoreName);

  const replaceThemeBrandText = (value?: string | null): string => {
    if (!value) {
      return '';
    }

    if (!shouldReplaceThemeBrand) {
      return value;
    }

    return themeBrandNames.reduce((text, brandName) => {
      if (!brandName || brandName === displayStoreName) {
        return text;
      }

      return text.replace(new RegExp(escapeRegExp(brandName), 'g'), displayStoreName);
    }, value);
  };

  return {
    displayStoreName,
    replaceThemeBrandText,
    shouldReplaceThemeBrand,
  };
};

export const sanitizeStorefrontThemeTextValue = (
  value: unknown,
  replaceThemeBrandText: (value?: string | null) => string,
): unknown => {
  if (typeof value === 'string') {
    return replaceThemeBrandText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeStorefrontThemeTextValue(item, replaceThemeBrandText));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeStorefrontThemeTextValue(item, replaceThemeBrandText),
      ]),
    );
  }

  return value;
};

export const sanitizeStorefrontSectionConfig = (
  section: StorefrontSectionConfig,
  replaceThemeBrandText: (value?: string | null) => string,
): StorefrontSectionConfig =>
  sanitizeStorefrontThemeTextValue(section, replaceThemeBrandText) as StorefrontSectionConfig;
