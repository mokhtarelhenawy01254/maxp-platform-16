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
import {
  DEFAULT_STOREFRONT_THEME_ID,
  DEFAULT_PAGE_STYLE_DENSITY_GAP,
  DEFAULT_PAGE_STYLE_RADIUS,
} from './themeDefaults';
import { applyStorefrontContentOverrides } from '../utils/contentOverrides';
import { applyStorefrontPageOverrides } from '../utils/pageOverrides';
import type {
  PageStyleDensity,
  PageStyleScope,
  PageStylesMap,
  PageStylePreset,
} from '../studio/StudioTypes';
import { PAGE_STYLE_PRESETS } from '../studio/StudioTypes';

export type { PageStyleDensity, PageStyleScope, PageStylesMap, PageStylePreset };
export { PAGE_STYLE_PRESETS };

export const PAGE_STYLE_DENSITY_GAPS: Record<PageStyleDensity, string> = {
  compact: '0.75rem',
  normal: '1.5rem',
  airy: '2.5rem',
};

export interface ResolvedPageStyleVars {
  '--store-accent': string;
  '--store-bg': string;
  '--store-font-family': string;
  '--store-density-gap': string;
  '--store-radius': string;
  [key: string]: string;
}

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
  activePageKey?: string;
  pageStyles?: Record<string, PageStyleScope>;
  designTokens?: PartialTokens & {
    contentOverrides?: unknown;
    pageOverrides?: unknown;
    pageStyles?: Record<string, PageStyleScope>;
    seo?: Partial<StorefrontSEOConfig>;
  };
  contentOverrides?: unknown;
  pageOverrides?: unknown;
  settings?: {
    theme?: string;
    themeId?: string;
    pageStyles?: Record<string, PageStyleScope>;
    designTokens?: PartialTokens & {
      contentOverrides?: unknown;
      pageStyles?: Record<string, PageStyleScope>;
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

export const extractPageStyles = (
  input?: StorefrontThemeInput,
): Record<string, PageStyleScope> => {
  const inputRecord: Record<string, unknown> = isRecord(input) ? input : {};
  const settings = isRecord(inputRecord['settings'])
    ? (inputRecord['settings'] as Record<string, unknown>)
    : {};
  const topLevelDesignTokens = isRecord(inputRecord['designTokens'])
    ? (inputRecord['designTokens'] as Record<string, unknown>)
    : {};
  const settingsDesignTokens = isRecord(settings?.['designTokens'])
    ? (settings['designTokens'] as Record<string, unknown>)
    : {};
  const storefrontObj = isRecord(inputRecord['storefront'])
    ? (inputRecord['storefront'] as Record<string, unknown>)
    : {};
  const storefrontDesignTokens = isRecord(storefrontObj['designTokens'])
    ? (storefrontObj['designTokens'] as Record<string, unknown>)
    : {};

  const sources: Array<Record<string, unknown>> = [
    isRecord(settingsDesignTokens['pageStyles'])
      ? (settingsDesignTokens['pageStyles'] as Record<string, unknown>)
      : {},
    isRecord(topLevelDesignTokens['pageStyles'])
      ? (topLevelDesignTokens['pageStyles'] as Record<string, unknown>)
      : {},
    isRecord(storefrontDesignTokens['pageStyles'])
      ? (storefrontDesignTokens['pageStyles'] as Record<string, unknown>)
      : {},
    isRecord(settings['pageStyles'])
      ? (settings['pageStyles'] as Record<string, unknown>)
      : {},
    isRecord(storefrontObj['pageStyles'])
      ? (storefrontObj['pageStyles'] as Record<string, unknown>)
      : {},
    isRecord(inputRecord['pageStyles'])
      ? (inputRecord['pageStyles'] as Record<string, unknown>)
      : {},
  ];

  if (isRecord(inputRecord['pages'])) {
    const pagesObj = inputRecord['pages'] as Record<string, unknown>;
    const pageStylesFromPages: Record<string, unknown> = {};
    for (const [pKey, pVal] of Object.entries(pagesObj)) {
      if (isRecord(pVal) && isRecord((pVal as Record<string, unknown>)['pageStyle'])) {
        pageStylesFromPages[pKey] = (pVal as Record<string, unknown>)['pageStyle'];
      }
    }
    if (Object.keys(pageStylesFromPages).length > 0) {
      sources.push(pageStylesFromPages);
    }
  }

  const result: Record<string, PageStyleScope> = {};
  for (const source of sources) {
    for (const [key, val] of Object.entries(source)) {
      if (isRecord(val)) {
        const item = val as Record<string, unknown>;
        const scope: PageStyleScope = {};
        if (typeof item['accent'] === 'string' && item['accent'].trim()) {
          scope.accent = item['accent'].trim();
        }
        if (typeof item['background'] === 'string' && item['background'].trim()) {
          scope.background = item['background'].trim();
        } else if (typeof item['bg'] === 'string' && item['bg'].trim()) {
          scope.background = item['bg'].trim();
        } else if (typeof item['backgroundColor'] === 'string' && item['backgroundColor'].trim()) {
          scope.background = item['backgroundColor'].trim();
        }
        if (typeof item['fontFamily'] === 'string' && item['fontFamily'].trim()) {
          scope.fontFamily = item['fontFamily'].trim();
        }
        if (
          item['density'] === 'compact' ||
          item['density'] === 'normal' ||
          item['density'] === 'airy'
        ) {
          scope.density = item['density'];
        }
        if (typeof item['radius'] === 'number' && !isNaN(item['radius'])) {
          scope.radius = item['radius'];
        } else if (typeof item['radius'] === 'string' && item['radius'].trim()) {
          const parsed = parseFloat(item['radius']);
          if (!isNaN(parsed)) {
            scope.radius = parsed;
          }
        }
        if (typeof item['preset'] === 'string' && item['preset'].trim()) {
          scope.preset = item['preset'].trim();
        }
        if (Object.keys(scope).length > 0) {
          result[key] = {
            ...(result[key] || {}),
            ...scope,
          };
        }
      }
    }
  }

  return result;
};

export const resolvePageStyleVars = (
  theme?: StorefrontTheme,
  pageKey?: string,
  explicitStyle?: PageStyleScope,
): ResolvedPageStyleVars => {
  const pKey = pageKey || 'home';
  const pageStylesMap = (theme as any)?.pageStyles as Record<string, PageStyleScope> | undefined;

  const candidateKeys = [pKey];
  if (pKey === 'pdp') candidateKeys.push('product', 'products');
  if (pKey === 'product' || pKey === 'products') candidateKeys.push('pdp');
  if (pKey.startsWith('pages/')) candidateKeys.push(pKey.slice('pages/'.length));
  else candidateKeys.push('pages/' + pKey);

  let pageStyle: PageStyleScope | undefined = explicitStyle;
  if (!pageStyle) {
    for (const key of candidateKeys) {
      if (pageStylesMap?.[key]) {
        pageStyle = pageStylesMap[key];
        break;
      }
      if ((theme?.pages?.[key] as any)?.pageStyle) {
        pageStyle = (theme?.pages?.[key] as any).pageStyle;
        break;
      }
    }
  }

  // Look up preset if specified
  const preset = pageStyle?.preset
    ? PAGE_STYLE_PRESETS.find((p) => p.id === pageStyle!.preset)
    : undefined;

  // 1. Accent fallback: pageStyle.accent > preset.accent > theme.colors.accent > theme.colors.primary > '#2563eb'
  const accent =
    pageStyle?.accent?.trim() ||
    preset?.accent ||
    theme?.tokens?.colors?.accent ||
    theme?.tokens?.colors?.primary ||
    '#2563eb';

  // 2. Background fallback: pageStyle.background/bg > theme.colors.background > '#ffffff'
  const explicitBg =
    pageStyle?.background?.trim() ||
    (pageStyle as any)?.bg?.trim() ||
    (pageStyle as any)?.backgroundColor?.trim();

  let background: string;
  if (explicitBg) {
    background = explicitBg;
  } else if (theme?.tokens?.colors?.background) {
    const themeBg = theme.tokens.colors.background.trim();
    if (themeBg.startsWith('#') || themeBg.startsWith('rgb') || themeBg.startsWith('hsl')) {
      background = themeBg;
    } else {
      background = 'hsl(' + themeBg + ')';
    }
  } else {
    background = '#ffffff';
  }

  // 3. Font family fallback: pageStyle.fontFamily > preset.fontFamily > theme bodyFont > theme headingFont > 'inherit'
  const fontFamily =
    pageStyle?.fontFamily?.trim() ||
    preset?.fontFamily ||
    theme?.tokens?.typography?.bodyFont ||
    theme?.tokens?.typography?.headingFont ||
    'inherit';

  // 4. Density gap fallback: pageStyle.density > preset.density > 'normal'
  const density = pageStyle?.density || preset?.density || 'normal';
  const densityGap = PAGE_STYLE_DENSITY_GAPS[density] || DEFAULT_PAGE_STYLE_DENSITY_GAP;

  // 5. Radius fallback: pageStyle.radius > preset.radius > theme borderRadius > DEFAULT_PAGE_STYLE_RADIUS
  let radius: string;
  if (typeof pageStyle?.radius === 'number') {
    radius = `${pageStyle.radius}px`;
  } else if (typeof (pageStyle as any)?.radius === 'string' && (pageStyle as any).radius.trim()) {
    radius = (pageStyle as any).radius.trim();
  } else if (preset && typeof preset.radius === 'number') {
    radius = `${preset.radius}px`;
  } else if (theme?.tokens?.shape?.borderRadius) {
    radius = theme.tokens.shape.borderRadius;
  } else {
    radius = DEFAULT_PAGE_STYLE_RADIUS;
  }

  return {
    '--store-accent': accent,
    '--store-bg': background,
    '--store-font-family': fontFamily,
    '--store-density-gap': densityGap,
    '--store-radius': radius,
  };
};

export const resolveActivePageKeyFromPath = (pathname?: string): string => {
  if (!pathname || typeof pathname !== 'string') return 'home';
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const segments = normalizedPath.split('/').filter(Boolean);
  const storefrontSegments = segments[0] === 'store' ? segments.slice(1) : segments;

  if (storefrontSegments.length === 0) return 'home';

  const seg0 = storefrontSegments[0];
  if (seg0 === 'shop' || seg0 === 'products' || seg0 === 'catalog') {
    if (storefrontSegments.length > 1) {
      if (storefrontSegments[1] === 'page' && storefrontSegments[2]) {
        return storefrontSegments.slice(2).join('/');
      }
      return 'pdp';
    }
    return 'shop';
  }
  if (seg0 === 'product') return 'pdp';
  if (seg0 === 'pages' && storefrontSegments.length > 1) {
    return storefrontSegments.slice(1).join('/');
  }
  if (seg0 === 'cart') return 'cart';
  if (seg0 === 'checkout') return 'checkout';
  if (seg0 === 'thank-you') return 'thank-you';
  if (seg0 === 'sale') return 'sale';
  if (seg0 === 'collections') return 'collections';
  if (seg0 === 'size-guide') return 'size-guide';
  if (seg0 === 'shipping') return 'shipping';
  if (seg0 === 'privacy') return 'privacy';
  if (seg0 === 'terms') return 'terms';
  if (seg0 === 'returns') return 'returns';

  return storefrontSegments.join('/');
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

  let header = (input.header ||
    (isRecord(input.designTokens) ? (input.designTokens['header'] as StorefrontHeaderConfig | undefined) : undefined) ||
    (isRecord(settings?.['designTokens']) ? (settings?.['designTokens']['header'] as StorefrontHeaderConfig | undefined) : undefined) ||
    settings?.["header"]) as StorefrontHeaderConfig | undefined;

  const rawNavMenu =
    (isRecord(input?.designTokens) && isRecord((input.designTokens as any).navigation)
      ? (input.designTokens as any).navigation.menu
      : undefined) ||
    (isRecord(settings?.['designTokens']) && isRecord((settings?.['designTokens'] as any).navigation)
      ? (settings?.['designTokens'] as any).navigation.menu
      : undefined) ||
    (isRecord((input as any)?.navigation)
      ? (input as any).navigation.menu
      : undefined);

  if (Array.isArray(rawNavMenu) && rawNavMenu.length > 0) {
    const customNav = rawNavMenu
      .filter((item: any) => Boolean(item && typeof item === 'object'))
      .map((item: any) => ({
        label: String(item.label || ''),
        to: String(item.url || item.to || '/'),
      }))
      .filter((item: any) => item.label.trim().length > 0);

    if (customNav.length > 0) {
      header = {
        ...(header || {}),
        navigation: customNav,
      };
    }
  }

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

  const pageStyles = extractPageStyles(input);
  if (pageStyles && Object.keys(pageStyles).length > 0) {
    (normalizedTheme as any).pageStyles = pageStyles;
    Object.entries(pageStyles).forEach(([pKey, pStyle]) => {
      if (normalizedTheme.pages && normalizedTheme.pages[pKey]) {
        (normalizedTheme.pages[pKey] as any).pageStyle = pStyle;
      }
    });
  }

  const activePageKey = input?.activePageKey || (input as any)?.pageKey || 'home';
  (normalizedTheme as any).activePageKey = activePageKey;
  (normalizedTheme as any).pageStyleVars = resolvePageStyleVars(normalizedTheme, activePageKey);

  return normalizedTheme;
};
