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
  String(settings?.company?.name || settings?.storefront?.settings?.storeName || '').trim();

const getThemeBrandNames = (theme: StorefrontTheme): string[] => {
  const names = [theme.header?.brandName, theme.name];
  if (theme.id?.includes('khemet')) {
    names.push('KHEMET LUXE', 'Khemet Luxe');
  }
  return Array.from(
    new Set(
      names
        .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        .map((value) => value.trim()),
    ),
  );
};

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
    settings?.company?.name ||
    runtimeStoreName ||
    theme.header?.brandName ||
    theme.name;
  const shouldReplaceThemeBrand =
    !isThemePreview &&
    Boolean(displayStoreName);

  const isSwanStore =
    runtimeStoreName.trim().toLowerCase() === 'swan' ||
    displayStoreName.trim().toLowerCase() === 'swan';

  const replacementCandidates = Array.from(
    new Set([
      ...themeBrandNames,
      ...(!isSwanStore ? ['Swan'] : []),
      'TA TI',
      'TATI',
    ]),
  );

  const replaceThemeBrandText = (value?: string | null): string => {
    if (!value) {
      return '';
    }

    if (!shouldReplaceThemeBrand) {
      return value;
    }

    return replacementCandidates.reduce((text, brandName) => {
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

const NON_BRAND_REPLACEABLE_KEYS = new Set([
  'type',
  'variant',
  'id',
  'key',
  'image',
  'imageUrl',
  'src',
  'url',
  'href',
  'to',
  'link',
  'ctaLink',
  'secondaryCtaLink',
  'panelImage',
  'beforeImage',
  'afterImage',
  'logoUrl',
  'className',
  'customClass',
  'icon',
]);

const isUrlOrTechnicalString = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    trimmed.startsWith('/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  );
};

export const sanitizeStorefrontThemeTextValue = (
  value: unknown,
  replaceThemeBrandText: (value?: string | null) => string,
): unknown => {
  if (typeof value === 'string') {
    if (isUrlOrTechnicalString(value)) {
      return value;
    }
    return replaceThemeBrandText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeStorefrontThemeTextValue(item, replaceThemeBrandText));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        NON_BRAND_REPLACEABLE_KEYS.has(key)
          ? item
          : sanitizeStorefrontThemeTextValue(item, replaceThemeBrandText),
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
