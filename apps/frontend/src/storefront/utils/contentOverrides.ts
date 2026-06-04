import { StorefrontSectionConfig, StorefrontTheme } from "../types/theme.types";

export type StorefrontPageKey = "home" | "shop" | "pdp" | "cart" | "checkout";

export type StorefrontSectionSettings = Record<string, unknown>;

export interface StorefrontPageContentOverrides {
  sections: Record<string, StorefrontSectionSettings>;
}

export type StorefrontContentOverrides = Partial<
  Record<StorefrontPageKey, StorefrontPageContentOverrides>
>;

export interface StorefrontHomeContentDraft {
  hero: {
    visible: boolean;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
    backgroundImage: string;
  };
  featuredProducts: {
    visible: boolean;
    title: string;
  };
  newsletter: {
    visible: boolean;
    title: string;
    subtitle: string;
  };
}

type TypedRecord<T extends object> = Partial<T> & Record<string, unknown>;

const PAGE_KEYS: StorefrontPageKey[] = ["home", "shop", "pdp", "cart", "checkout"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asTypedRecord = <T extends object>(value: unknown): TypedRecord<T> =>
  (isRecord(value) ? (value as TypedRecord<T>) : {});

const cloneJsonValue = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const sanitizeSectionSettings = (value: unknown): StorefrontSectionSettings => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<StorefrontSectionSettings>((acc, [key, rawValue]) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      return acc;
    }

    if (typeof rawValue === "string") {
      const trimmedValue = rawValue.trim();
      if (trimmedValue) {
        acc[trimmedKey] = trimmedValue;
      }
      return acc;
    }

    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      acc[trimmedKey] = rawValue;
      return acc;
    }

    if (typeof rawValue === "boolean") {
      acc[trimmedKey] = rawValue;
      return acc;
    }

    if (Array.isArray(rawValue)) {
      acc[trimmedKey] = cloneJsonValue(rawValue) as unknown[];
      return acc;
    }

    if (isRecord(rawValue)) {
      acc[trimmedKey] = cloneJsonValue(rawValue);
    }

    return acc;
  }, {});
};

export const normalizeStorefrontContentOverrides = (
  value: unknown,
): StorefrontContentOverrides => {
  if (!isRecord(value)) {
    return {};
  }

  return PAGE_KEYS.reduce<StorefrontContentOverrides>((acc, pageKey) => {
    const pageValue = value[pageKey];
    if (!isRecord(pageValue)) {
      return acc;
    }

    const pageSource = asTypedRecord<StorefrontPageContentOverrides>(pageValue);
    const sectionsSource = isRecord(pageSource.sections)
      ? pageSource.sections
      : pageValue;
    const sections = Object.entries(sectionsSource).reduce<
      Record<string, StorefrontSectionSettings>
    >((sectionAcc, [sectionKey, sectionValue]) => {
      const trimmedKey = sectionKey.trim();
      if (!trimmedKey) {
        return sectionAcc;
      }

      const sanitizedSettings = sanitizeSectionSettings(sectionValue);
      if (Object.keys(sanitizedSettings).length > 0) {
        sectionAcc[trimmedKey] = sanitizedSettings;
      }

      return sectionAcc;
    }, {});

    if (Object.keys(sections).length > 0) {
      acc[pageKey] = { sections };
    }

    return acc;
  }, {});
};

export const serializeStorefrontContentOverrides = (value: unknown): string =>
  JSON.stringify(normalizeStorefrontContentOverrides(value));

const getSectionOverrideForEntry = (
  sectionEntry: string | StorefrontSectionConfig,
  sectionOverrides: Record<string, StorefrontSectionSettings>,
): StorefrontSectionSettings | null => {
  if (typeof sectionEntry === "string") {
    return sectionOverrides[sectionEntry] || null;
  }

  if (!sectionEntry) {
    return null;
  }

  const keys = [sectionEntry.id, sectionEntry.type].filter(
    (key): key is string => typeof key === "string" && key.trim().length > 0,
  );

  for (const key of keys) {
    const match = sectionOverrides[key];
    if (match) {
      return match;
    }
  }

  return null;
};

export const applyStorefrontContentOverrides = (
  theme: StorefrontTheme,
  rawOverrides: unknown,
): StorefrontTheme => {
  const contentOverrides = normalizeStorefrontContentOverrides(rawOverrides);
  if (Object.keys(contentOverrides).length === 0) {
    return theme;
  }

  const nextTheme = cloneJsonValue(theme);

  PAGE_KEYS.forEach((pageKey) => {
    const pageOverride = contentOverrides[pageKey];
    const pageConfig = nextTheme.pages[pageKey];

    if (!pageOverride || !pageConfig?.sections?.length) {
      return;
    }

    pageConfig.sections = pageConfig.sections.map((sectionEntry) => {
      const sectionOverride = getSectionOverrideForEntry(
        sectionEntry,
        pageOverride.sections,
      );

      if (!sectionOverride) {
        return sectionEntry;
      }

      if (typeof sectionEntry === "string") {
        return {
          id: sectionEntry,
          type: sectionEntry,
          settings: sectionOverride,
        };
      }

      return {
        ...sectionEntry,
        settings: {
          ...(isRecord(sectionEntry.settings) ? sectionEntry.settings : {}),
          ...sectionOverride,
        },
      };
    });
  });

  return nextTheme;
};

export const getStorefrontContentOverridesFromDesignTokens = (
  designTokens: unknown,
): StorefrontContentOverrides => {
  const source = asTypedRecord<{
    contentOverrides: StorefrontContentOverrides;
  }>(designTokens);
  return normalizeStorefrontContentOverrides(source.contentOverrides);
};

export const upsertStorefrontContentOverridesInDesignTokens = (
  designTokens: unknown,
  overrides: unknown,
): Record<string, unknown> => {
  const baseDesignTokens = isRecord(designTokens)
    ? cloneJsonValue(designTokens)
    : {};
  const normalizedOverrides = normalizeStorefrontContentOverrides(overrides);

  if (Object.keys(normalizedOverrides).length === 0) {
    delete baseDesignTokens["contentOverrides"];
    return baseDesignTokens;
  }

  baseDesignTokens["contentOverrides"] = normalizedOverrides;
  return baseDesignTokens;
};

export const getStorefrontHomeContentDraft = (
  designTokens: unknown,
): StorefrontHomeContentDraft => {
  const overrides = getStorefrontContentOverridesFromDesignTokens(designTokens);
  const homeSections = overrides.home?.sections || {};
  const hero = asTypedRecord<
    StorefrontHomeContentDraft["hero"] & { hidden?: boolean }
  >(homeSections["hero-banner"]);
  const featuredProducts = asTypedRecord<
    StorefrontHomeContentDraft["featuredProducts"] & { hidden?: boolean }
  >(homeSections["featured-products"]);
  const newsletter = asTypedRecord<
    StorefrontHomeContentDraft["newsletter"] & { hidden?: boolean }
  >(homeSections["newsletter"]);

  return {
    hero: {
      visible: hero.hidden !== true,
      title: typeof hero.title === "string" ? hero.title : "",
      subtitle: typeof hero.subtitle === "string" ? hero.subtitle : "",
      ctaText: typeof hero.ctaText === "string" ? hero.ctaText : "",
      ctaLink: typeof hero.ctaLink === "string" ? hero.ctaLink : "",
      secondaryCtaText:
        typeof hero.secondaryCtaText === "string" ? hero.secondaryCtaText : "",
      secondaryCtaLink:
        typeof hero.secondaryCtaLink === "string" ? hero.secondaryCtaLink : "",
      backgroundImage:
        typeof hero.backgroundImage === "string" ? hero.backgroundImage : "",
    },
    featuredProducts: {
      visible: featuredProducts.hidden !== true,
      title:
        typeof featuredProducts.title === "string" ? featuredProducts.title : "",
    },
    newsletter: {
      visible: newsletter.hidden !== true,
      title: typeof newsletter.title === "string" ? newsletter.title : "",
      subtitle:
        typeof newsletter.subtitle === "string" ? newsletter.subtitle : "",
    },
  };
};

const buildSectionOverrideWithVisibility = (
  draftSection: Record<string, unknown>,
  isVisible: boolean,
): StorefrontSectionSettings => {
  const nextDraftSection = { ...draftSection };
  delete nextDraftSection["visible"];

  const sanitizedSection = sanitizeSectionSettings(nextDraftSection);

  if (!isVisible) {
    sanitizedSection["hidden"] = true;
  } else if (sanitizedSection["hidden"] === false) {
    delete sanitizedSection["hidden"];
  }

  return sanitizedSection;
};

export const buildStorefrontHomeContentOverrides = (
  draft: StorefrontHomeContentDraft,
): StorefrontContentOverrides => {
  const homeSections: Record<string, StorefrontSectionSettings> = {};
  const hero = buildSectionOverrideWithVisibility(draft.hero, draft.hero.visible);
  const featuredProducts = buildSectionOverrideWithVisibility(
    draft.featuredProducts,
    draft.featuredProducts.visible,
  );
  const newsletter = buildSectionOverrideWithVisibility(
    draft.newsletter,
    draft.newsletter.visible,
  );

  if (Object.keys(hero).length > 0) {
    homeSections["hero-banner"] = hero;
  }

  if (Object.keys(featuredProducts).length > 0) {
    homeSections["featured-products"] = featuredProducts;
  }

  if (Object.keys(newsletter).length > 0) {
    homeSections["newsletter"] = newsletter;
  }

  return Object.keys(homeSections).length > 0
    ? {
        home: {
          sections: homeSections,
        },
      }
    : {};
};
