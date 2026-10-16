import type {
  StorefrontTheme,
  StorefrontContentAlign,
  StorefrontThemeColors,
  StorefrontSectionConfig,
  StorefrontThemeLayoutTokens,
  StorefrontThemeShape,
  StorefrontThemeTypography,
  StorefrontThemeProductCardTokens,
  StorefrontHeaderConfig,
  StorefrontFooterConfig,
  StorefrontSEOConfig,
} from '../types/theme.types';
import { DEFAULT_STOREFRONT_THEME_ID } from './themeDefaults';
import { applyStorefrontContentOverrides } from '../utils/contentOverrides';
import { applyStorefrontPageOverrides } from '../utils/pageOverrides';

type PartialTokens = {
  colors?: Partial<StorefrontThemeColors>;
  typography?: Partial<StorefrontThemeTypography>;
  shape?: Partial<StorefrontThemeShape>;
  productCard?: Partial<StorefrontThemeProductCardTokens>;
  layout?: Partial<StorefrontThemeLayoutTokens>;
  header?: Partial<StorefrontHeaderConfig>;
  footer?: Partial<StorefrontFooterConfig>;
};

export type StorefrontThemeInput = Partial<StorefrontTheme> & {
  theme?: string;
  themeId?: string;
  sections?: Array<string | StorefrontSectionConfig>;
  colors?: Partial<StorefrontThemeColors>;
  typography?: Partial<StorefrontThemeTypography>;
  shape?: Partial<StorefrontThemeShape>;
  productCard?: Partial<StorefrontThemeProductCardTokens>;
  designTokens?: PartialTokens & {
    contentOverrides?: unknown;
    pageOverrides?: unknown;
    seo?: Partial<StorefrontSEOConfig>;
  };
  contentOverrides?: unknown;
  pageOverrides?: unknown;
  settings?: {
    theme?: string;
    themeId?: string;
    designTokens?: PartialTokens & {
      contentOverrides?: unknown;
    };
    contentOverrides?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const deepMerge = <T extends object>(
  target: T,
  source: Partial<T> | Record<string, unknown>,
): T => {
  const output = { ...(target as Record<string, unknown>) };

  Object.entries(source as Record<string, unknown>).forEach(([key, value]) => {
    const currentValue = output[key];
    if (isRecord(currentValue) && isRecord(value)) {
      output[key] = deepMerge(currentValue, value);
      return;
    }

    if (value !== undefined) {
      output[key] = value;
    }
  });

  return output as T;
};

const pickNonEmptyStrings = <T extends object>(
  source: unknown,
  keys: Array<Extract<keyof T, string>>,
): Partial<T> => {
  if (!isRecord(source)) {
    return {};
  }

  return keys.reduce((acc, key) => {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      (acc as Record<string, unknown>)[key] = value;
    }
    return acc;
  }, {} as Partial<T>);
};

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

const SHAPE_KEYS: Array<keyof StorefrontThemeShape> = [
  'borderRadius',
  'buttonRadius',
];

const PRODUCT_CARD_KEYS: Array<keyof StorefrontThemeProductCardTokens> = [
  'borderRadius',
  'boxShadow',
  'hoverShadow',
  'badgeRadius',
  'buttonRadius',
  'surfaceOpacity',
];

const pickLayoutTokens = (
  source: unknown,
): Partial<StorefrontThemeLayoutTokens> => {
  if (!isRecord(source)) {
    return {};
  }

  const contentAlign =
    source['contentAlign'] === 'center' || source['contentAlign'] === 'start'
      ? (source['contentAlign'] as StorefrontContentAlign)
      : undefined;

  return contentAlign ? { contentAlign } : {};
};

const pickTypographyTokens = (
  source: unknown,
): Partial<StorefrontThemeTypography> => {
  if (!isRecord(source)) {
    return {};
  }

  const headingFont =
    typeof source['headingFont'] === 'string' && source['headingFont'].trim()
      ? source['headingFont']
      : typeof source['fontFamilyHeading'] === 'string' &&
          source['fontFamilyHeading'].trim()
        ? source['fontFamilyHeading']
        : undefined;

  const bodyFont =
    typeof source['bodyFont'] === 'string' && source['bodyFont'].trim()
      ? source['bodyFont']
      : typeof source['fontFamilyBody'] === 'string' &&
          source['fontFamilyBody'].trim()
        ? source['fontFamilyBody']
        : undefined;

  const baseSize =
    typeof source['baseSize'] === 'string' && source['baseSize'].trim()
      ? source['baseSize']
      : typeof source['fontSizeBase'] === 'string' &&
          source['fontSizeBase'].trim()
        ? source['fontSizeBase']
        : undefined;

  const direction =
    source['direction'] === 'rtl' || source['direction'] === 'ltr'
      ? source['direction']
      : undefined;

  return {
    ...(headingFont ? { headingFont } : {}),
    ...(bodyFont ? { bodyFont } : {}),
    ...(baseSize ? { baseSize } : {}),
    ...(direction ? { direction } : {}),
  };
};

const extractTokens = (source: unknown): PartialTokens => {
  if (!isRecord(source)) {
    return {};
  }

  return {
    colors: pickNonEmptyStrings<StorefrontThemeColors>(source['colors'], COLOR_KEYS),
    typography: pickTypographyTokens(source['typography']),
    shape: pickNonEmptyStrings<StorefrontThemeShape>(source['shape'], SHAPE_KEYS),
    productCard: pickNonEmptyStrings<StorefrontThemeProductCardTokens>(source['productCard'], PRODUCT_CARD_KEYS),
    layout: pickLayoutTokens(source['layout']),
  };
};

const hasValues = (value: object | undefined): boolean =>
  Boolean(value && Object.keys(value).length > 0);

const normalizeSections = (
  sections: unknown,
): Array<string | StorefrontSectionConfig> | undefined => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return undefined;
  }

  const normalizedSections = sections
    .map((section) => {
      if (typeof section === 'string' && section.trim()) {
        return section;
      }

      if (!isRecord(section)) {
        return null;
      }

      const type = section['type'];
      if (typeof type !== 'string' || type.trim().length === 0) {
        return null;
      }

      return section as StorefrontSectionConfig;
    })
    .filter((section): section is string | StorefrontSectionConfig => Boolean(section));

  return normalizedSections.length > 0 ? normalizedSections : undefined;
};

const extractContentOverrides = (input?: StorefrontThemeInput): Record<string, unknown> => {
  const inputRecord: Record<string, unknown> = isRecord(input) ? input : {};
  const settings = isRecord(inputRecord["settings"])
    ? (inputRecord["settings"] as Record<string, unknown>)
    : {};
  const topLevelDesignTokens = isRecord(inputRecord["designTokens"])
    ? (inputRecord["designTokens"] as Record<string, unknown>)
    : {};
  const settingsDesignTokens = isRecord(settings?.["designTokens"])
    ? (settings["designTokens"] as Record<string, unknown>)
    : {};

  return {
    ...(isRecord(settingsDesignTokens["contentOverrides"])
      ? (settingsDesignTokens["contentOverrides"] as Record<string, unknown>)
      : {}),
    ...(isRecord(topLevelDesignTokens["contentOverrides"])
      ? (topLevelDesignTokens["contentOverrides"] as Record<string, unknown>)
      : {}),
    ...(isRecord(settings["contentOverrides"])
      ? (settings["contentOverrides"] as Record<string, unknown>)
      : {}),
    ...(isRecord(inputRecord["contentOverrides"])
      ? (inputRecord["contentOverrides"] as Record<string, unknown>)
      : {}),
  };
};

const mergeSinglePageConfig = (
  base: unknown,
  incoming: unknown,
): Record<string, unknown> => {
  const baseRec = isRecord(base) ? (base as Record<string, unknown>) : {};
  const incomingRec = isRecord(incoming) ? (incoming as Record<string, unknown>) : {};

  const merged: Record<string, unknown> = {
    ...baseRec,
    ...incomingRec,
  };

  const baseSections = Array.isArray(baseRec["sections"]) ? baseRec["sections"] : null;
  const incomingSections = Array.isArray(incomingRec["sections"]) ? incomingRec["sections"] : null;

  if (baseSections && incomingSections) {
    merged["sections"] =
      baseSections.length > incomingSections.length ? baseSections : incomingSections;
  } else if (baseSections) {
    merged["sections"] = baseSections;
  } else if (incomingSections) {
    merged["sections"] = incomingSections;
  }

  return merged;
};

const extractPageOverrides = (input?: StorefrontThemeInput): Record<string, unknown> => {
  const inputRecord: Record<string, unknown> = isRecord(input) ? input : {};
  const settings = isRecord(inputRecord["settings"])
    ? (inputRecord["settings"] as Record<string, unknown>)
    : {};
  const topLevelDesignTokens = isRecord(inputRecord["designTokens"])
    ? (inputRecord["designTokens"] as Record<string, unknown>)
    : {};
  const settingsDesignTokens = isRecord(settings?.["designTokens"])
    ? (settings["designTokens"] as Record<string, unknown>)
    : {};

  const sources: Array<Record<string, unknown>> = [
    isRecord(settingsDesignTokens["pages"]) ? (settingsDesignTokens["pages"] as Record<string, unknown>) : {},
    isRecord(topLevelDesignTokens["pages"]) ? (topLevelDesignTokens["pages"] as Record<string, unknown>) : {},
    isRecord(settings["pages"]) ? (settings["pages"] as Record<string, unknown>) : {},
    isRecord(inputRecord["pages"]) && !Array.isArray(inputRecord["pages"]) ? (inputRecord["pages"] as Record<string, unknown>) : {},
    isRecord(settingsDesignTokens["pageOverrides"]) ? (settingsDesignTokens["pageOverrides"] as Record<string, unknown>) : {},
    isRecord(topLevelDesignTokens["pageOverrides"]) ? (topLevelDesignTokens["pageOverrides"] as Record<string, unknown>) : {},
    isRecord(settings["pageOverrides"]) ? (settings["pageOverrides"] as Record<string, unknown>) : {},
    isRecord(inputRecord["pageOverrides"]) ? (inputRecord["pageOverrides"] as Record<string, unknown>) : {},
  ];

  const result: Record<string, unknown> = {};
  for (const source of sources) {
    for (const [key, pageVal] of Object.entries(source)) {
      if (isRecord(pageVal)) {
        result[key] = mergeSinglePageConfig(result[key], pageVal);
      }
    }
  }

  return result;
};

const SEO_KEYS: Array<keyof StorefrontSEOConfig> = [
  'titleTemplate',
  'description',
  'defaultOgImage',
  'faviconUrl',
];

const pickSEOFields = (source: unknown): Partial<StorefrontSEOConfig> => {
  if (!isRecord(source)) return {};
  return SEO_KEYS.reduce((acc, key) => {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      (acc as Record<string, unknown>)[key] = value;
    }
    return acc;
  }, {} as Partial<StorefrontSEOConfig>);
};

const extractSEOConfig = (input?: StorefrontThemeInput): Partial<StorefrontSEOConfig> => {
  if (!input) return {};

  const settings = isRecord(input.settings) ? input.settings : undefined;
  const topLevelDesignTokens = isRecord(input.designTokens) ? input.designTokens : undefined;
  const settingsDesignTokens = isRecord(settings?.["designTokens"])
    ? (settings?.["designTokens"] as Record<string, unknown>)
    : undefined;

  return {
    ...pickSEOFields(settingsDesignTokens?.["seo"]),
    ...pickSEOFields(topLevelDesignTokens?.["seo"]),
    ...pickSEOFields(settings?.["seo"]),
    ...pickSEOFields(input.seo),
  };
};

export const extractStorefrontThemePresetId = (
  input?: StorefrontThemeInput,
): string => {
  const settings = isRecord(input?.settings) ? input?.settings : undefined;
  const settingsTheme =
    typeof settings?.['theme'] === 'string' ? settings['theme'] : undefined;
  const settingsThemeId =
    typeof settings?.['themeId'] === 'string' ? settings['themeId'] : undefined;
  const candidateIds = [
    input?.theme,
    input?.themeId,
    settingsTheme,
    settingsThemeId,
    input?.id,
  ];

  const resolved = candidateIds.find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && candidate.trim().length > 0,
  );

  return resolved || DEFAULT_STOREFRONT_THEME_ID;
};

const normalizeThemeOverrides = (
  input?: StorefrontThemeInput,
): Partial<StorefrontTheme> => {
  if (!input) {
    return {};
  }

  const settings = isRecord(input.settings) ? input.settings : undefined;
  const explicitTokens = extractTokens(input.tokens);
  const topLevelTokens = {
    colors: pickNonEmptyStrings<StorefrontThemeColors>(input.colors, COLOR_KEYS),
    typography: pickTypographyTokens(input.typography),
    shape: pickNonEmptyStrings<StorefrontThemeShape>(input.shape, SHAPE_KEYS),
    productCard: pickNonEmptyStrings<StorefrontThemeProductCardTokens>(input.productCard, PRODUCT_CARD_KEYS),
  };
  const designTokens = extractTokens(input.designTokens);
  const settingsDesignTokens = extractTokens(settings?.['designTokens']);

  const tokens: PartialTokens = {
    colors: {
      ...settingsDesignTokens.colors,
      ...designTokens.colors,
      ...topLevelTokens.colors,
      ...explicitTokens.colors,
    },
    typography: {
      ...settingsDesignTokens.typography,
      ...designTokens.typography,
      ...topLevelTokens.typography,
      ...explicitTokens.typography,
    },
    shape: {
      ...settingsDesignTokens.shape,
      ...designTokens.shape,
      ...topLevelTokens.shape,
      ...explicitTokens.shape,
    },
    productCard: {
      ...settingsDesignTokens.productCard,
      ...designTokens.productCard,
      ...topLevelTokens.productCard,
      ...explicitTokens.productCard,
    },
    layout: {
      ...settingsDesignTokens.layout,
      ...designTokens.layout,
      ...explicitTokens.layout,
    },
  };

  const header = (input.header ||
    (isRecord(input.designTokens) ? (input.designTokens['header'] as StorefrontHeaderConfig | undefined) : undefined) ||
    (isRecord(settings?.['designTokens']) ? (settings?.['designTokens']['header'] as StorefrontHeaderConfig | undefined) : undefined) ||
    settings?.["header"]) as StorefrontHeaderConfig | undefined;

  const footer = (input.footer ||
    (isRecord(input.designTokens) ? (input.designTokens['footer'] as StorefrontFooterConfig | undefined) : undefined) ||
    (isRecord(settings?.['designTokens']) ? (settings?.['designTokens']['footer'] as StorefrontFooterConfig | undefined) : undefined) ||
    settings?.["footer"]) as StorefrontFooterConfig | undefined;

  const seo = extractSEOConfig(input);
  const normalized: Partial<StorefrontTheme> = {};

  if (hasValues(tokens.colors || undefined) || hasValues(tokens.typography || undefined) || hasValues(tokens.shape || undefined) || hasValues(tokens.productCard || undefined) || hasValues(tokens.layout || undefined)) {
    normalized.tokens = {
      colors: tokens.colors as StorefrontThemeColors,
      typography: tokens.typography as StorefrontThemeTypography,
      shape: tokens.shape as StorefrontThemeShape,
      ...(hasValues(tokens.productCard || undefined)
        ? { productCard: tokens.productCard as StorefrontThemeProductCardTokens }
        : {}),
      ...(hasValues(tokens.layout || undefined)
        ? { layout: tokens.layout as StorefrontThemeLayoutTokens }
        : {}),
    };
  }

  if (header) {
    normalized.header = header;
  }
  if (footer) {
    normalized.footer = footer;
  }
  if (seo && hasValues(seo)) {
    normalized.seo = seo;
  }

  if (input.pages) {
    if (Array.isArray(input.pages)) {
      normalized.pages = input.pages.reduce((acc, curr) => {
        const slug = typeof curr?.slug === 'string' ? curr.slug : curr?.id;
        if (slug) {
          acc[slug] = curr;
        }
        return acc;
      }, {} as Record<string, unknown>) as StorefrontTheme['pages'];
    } else if (isRecord(input.pages)) {
      normalized.pages = input.pages as StorefrontTheme['pages'];
    }
  }

  const homepageSections = normalizeSections(input.sections);
  if (homepageSections) {
    normalized.pages = {
      ...(normalized.pages || input.pages || {}),
      home: {
        sections: homepageSections,
      },
    } as StorefrontTheme['pages'];
  }

  const inputName = typeof input['name'] === 'string' ? input['name'] : undefined;
  if (inputName?.trim()) {
    normalized.name = inputName;
  }

  const inputDirection = (input['direction'] || input.tokens?.typography?.direction) as 'ltr' | 'rtl' | undefined;
  if (inputDirection) {
    normalized.direction = inputDirection;
  }

  return normalized;
};

type ResolveStorefrontThemeFromPresetOptions = {
  presetId?: string;
  normalizeTheme?: (theme: StorefrontTheme) => StorefrontTheme;
};

export const resolveStorefrontThemeFromPreset = (
  input: StorefrontThemeInput | undefined,
  baseTheme: StorefrontTheme,
  options: ResolveStorefrontThemeFromPresetOptions = {},
): StorefrontTheme => {
  const presetId = options.presetId || extractStorefrontThemePresetId(input);
  const overrides = normalizeThemeOverrides(input);
  const resolvedTheme = deepMerge(baseTheme, overrides);
  const resolvedWithContent = applyStorefrontContentOverrides(
    resolvedTheme,
    extractContentOverrides(input),
  );
  const resolvedWithPages = applyStorefrontPageOverrides(
    resolvedWithContent,
    extractPageOverrides(input),
  );

  const normalizedTheme = options.normalizeTheme
    ? options.normalizeTheme(resolvedWithPages)
    : resolvedWithPages;

  normalizedTheme.id = presetId;
  if (!normalizedTheme.name || !normalizedTheme.name.trim()) {
    normalizedTheme.name = baseTheme.name;
  }

  const overrideDirection = (
    overrides.direction || overrides.tokens?.typography?.direction
  ) as 'ltr' | 'rtl' | undefined;
  const resolvedDirection = (
    overrideDirection ||
    normalizedTheme.direction ||
    normalizedTheme.tokens?.typography?.direction ||
    baseTheme.direction ||
    baseTheme.tokens?.typography?.direction ||
    'ltr'
  ) as 'ltr' | 'rtl';

  normalizedTheme.direction = resolvedDirection;
  if (normalizedTheme.tokens?.typography) {
    normalizedTheme.tokens.typography.direction = resolvedDirection;
  }

  return normalizedTheme;
};
