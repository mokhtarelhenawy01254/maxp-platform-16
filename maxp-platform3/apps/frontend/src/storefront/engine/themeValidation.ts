import {
  StorefrontSectionConfig,
  StorefrontPageLayout,
  StorefrontTheme,
  StorefrontThemeColors,
  StorefrontThemeShape,
  StorefrontThemeTypography,
} from '../types/theme.types';
import {
  isStorefrontSectionAllowedOnPage,
  isStorefrontSectionKnown,
  isStorefrontSectionVariantAllowed,
} from '../sections/manifest';

const COLOR_KEYS: Array<keyof StorefrontThemeColors> = [
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'accentForeground',
  'background',
  'foreground',
  'muted',
  'mutedForeground',
  'border',
  'card',
  'cardForeground',
  'ring',
];

const TYPOGRAPHY_KEYS: Array<keyof StorefrontThemeTypography> = [
  'headingFont',
  'bodyFont',
  'baseSize',
];

const SHAPE_KEYS: Array<keyof StorefrontThemeShape> = [
  'borderRadius',
  'buttonRadius',
];

const REQUIRED_PAGE_KEYS: Array<keyof StorefrontTheme['pages']> = [
  'home',
  'shop',
  'pdp',
  'cart',
  'checkout',
];

const PAGE_LAYOUT_HINTS: readonly StorefrontPageLayout[] = [
  'stack',
  'sidebar-left',
  'sidebar-right',
  'product-detail',
  'commerce-3col',
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isValidSectionEntry = (
  value: string | StorefrontSectionConfig | unknown,
): boolean => {
  if (isNonEmptyString(value)) {
    return true;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const section = value as StorefrontSectionConfig;
  return isNonEmptyString(section.type);
};

const getSectionType = (
  value: string | StorefrontSectionConfig,
): string => (isNonEmptyString(value) ? value.trim() : value.type.trim());

const getSectionVariant = (
  value: string | StorefrontSectionConfig,
): string | null => {
  if (isNonEmptyString(value)) {
    return null;
  }

  if (isNonEmptyString(value.variant)) {
    return value.variant.trim();
  }

  if (isObjectRecord(value.settings) && isNonEmptyString(value.settings.variant)) {
    return value.settings.variant.trim();
  }

  return null;
};

export const validateStorefrontTheme = (
  theme: Partial<StorefrontTheme> | null | undefined,
): string[] => {
  const errors: string[] = [];

  if (!theme || typeof theme !== 'object') {
    return ['Theme payload must be an object.'];
  }

  if (!isNonEmptyString(theme.id)) {
    errors.push('Theme id is required.');
  }

  if (!isNonEmptyString(theme.name)) {
    errors.push('Theme name is required.');
  }

  for (const key of COLOR_KEYS) {
    if (!isNonEmptyString(theme.tokens?.colors?.[key])) {
      errors.push(`Theme color "${key}" is required.`);
    }
  }

  for (const key of TYPOGRAPHY_KEYS) {
    if (!isNonEmptyString(theme.tokens?.typography?.[key])) {
      errors.push(`Theme typography "${key}" is required.`);
    }
  }

  for (const key of SHAPE_KEYS) {
    if (!isNonEmptyString(theme.tokens?.shape?.[key])) {
      errors.push(`Theme shape "${key}" is required.`);
    }
  }

  const themePageKeys = Object.keys(theme.pages || {}) as Array<keyof StorefrontTheme['pages']>;
  const pageKeys = Array.from(new Set([...REQUIRED_PAGE_KEYS, ...themePageKeys]));

  for (const pageKey of pageKeys) {
    const pageConfig = theme.pages?.[pageKey];
    const layoutHint = pageConfig?.layoutHint;

    if (layoutHint && !PAGE_LAYOUT_HINTS.includes(layoutHint)) {
      errors.push(`Theme page "${pageKey}" contains unsupported layout "${layoutHint}".`);
    }

    const sections = theme.pages?.[pageKey]?.sections;
    if (!Array.isArray(sections) || sections.length === 0) {
      errors.push(`Theme page "${pageKey}" must define at least one section.`);
      continue;
    }

    const invalidSection = sections.find((sectionId) => !isValidSectionEntry(sectionId));
    if (invalidSection !== undefined) {
      errors.push(`Theme page "${pageKey}" contains an invalid section id.`);
      continue;
    }

    for (const section of sections as Array<string | StorefrontSectionConfig>) {
      const sectionType = getSectionType(section);

      if (!isStorefrontSectionKnown(sectionType)) {
        errors.push(
          `Theme page "${pageKey}" contains unknown section "${sectionType}".`,
        );
        continue;
      }

      if (!isStorefrontSectionAllowedOnPage(sectionType, String(pageKey))) {
        errors.push(
          `Theme page "${pageKey}" cannot use section "${sectionType}".`,
        );
      }

      const sectionVariant = getSectionVariant(section);
      if (
        sectionVariant &&
        !isStorefrontSectionVariantAllowed(sectionType, sectionVariant)
      ) {
        errors.push(
          `Theme page "${pageKey}" section "${sectionType}" uses unsupported variant "${sectionVariant}".`,
        );
      }
    }
  }

  return errors;
};
