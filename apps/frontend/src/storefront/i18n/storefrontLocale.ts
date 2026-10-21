import type { StorefrontPageConfig, StorefrontSectionConfig } from "../types/theme.types";
import type { StorefrontLocale, TextDirection, StorefrontI18nSettings } from "./types";

export const STOREFRONT_LOCALE_STORAGE_KEY = "maxp_storefront_lang";

/**
 * Resolves active storefront locale with order of precedence:
 * 1. Explicit search string / window.location.search (?lang=en | ?lang=ar)
 * 2. Persisted value in window.localStorage (maxp_storefront_lang)
 * 3. Default fallback: 'ar'
 */
export function getStorefrontLocale(search?: string): StorefrontLocale {
  if (typeof search === "string" && search.length > 0) {
    try {
      const normalizedSearch = search.startsWith("?") ? search : `?${search}`;
      const params = new URLSearchParams(normalizedSearch);
      const queryLang = params.get("lang")?.trim().toLowerCase();
      if (queryLang === "en" || queryLang === "ar") {
        return queryLang;
      }
    } catch {
      // Ignore parsing errors
    }
  } else if (typeof window !== "undefined" && window.location?.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryLang = params.get("lang")?.trim().toLowerCase();
      if (queryLang === "en" || queryLang === "ar") {
        return queryLang;
      }
    } catch {
      // Ignore
    }
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STOREFRONT_LOCALE_STORAGE_KEY)?.trim().toLowerCase();
      if (stored === "en" || stored === "ar") {
        return stored;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  return "ar";
}

/**
 * Persists the selected storefront locale in localStorage.
 */
export function persistStorefrontLocale(locale: StorefrontLocale): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STOREFRONT_LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore storage write errors
    }
  }
}

/**
 * Returns text direction ('rtl' for Arabic, 'ltr' for English).
 */
export function getLocaleDirection(locale: StorefrontLocale): TextDirection {
  return locale === "en" ? "ltr" : "rtl";
}

/**
 * Pure function: applies English overrides from settings.i18n.en onto section settings
 * without mutating the original settings object.
 */
export function localizeSectionSettings<T extends Record<string, any>>(
  settings: T | undefined | null,
  locale: StorefrontLocale
): T {
  if (!settings || typeof settings !== "object") {
    return (settings || {}) as T;
  }

  if (locale !== "en") {
    return settings;
  }

  const i18n = (settings as Record<string, any>)["i18n"] as StorefrontI18nSettings | undefined;
  const enOverrides = i18n?.["en"];
  if (!enOverrides || typeof enOverrides !== "object") {
    return settings;
  }

  const result: Record<string, any> = { ...settings };
  for (const [key, value] of Object.entries(enOverrides)) {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  }

  // Synonym mappings so any section component querying either heading/title or buttonText/ctaText finds the localized value
  const titleVal = enOverrides["title"] ?? enOverrides["heading"];
  if (titleVal !== undefined && titleVal !== null && titleVal !== "") {
    result["title"] = titleVal;
    result["heading"] = titleVal;
  }

  const subtitleVal = enOverrides["subtitle"] ?? enOverrides["description"] ?? enOverrides["subheading"];
  if (subtitleVal !== undefined && subtitleVal !== null && subtitleVal !== "") {
    result["subtitle"] = subtitleVal;
    result["description"] = subtitleVal;
    result["subheading"] = subtitleVal;
  }

  const eyebrowVal = enOverrides["eyebrow"] ?? enOverrides["badge"] ?? enOverrides["tagline"];
  if (eyebrowVal !== undefined && eyebrowVal !== null && eyebrowVal !== "") {
    result["eyebrow"] = eyebrowVal;
    result["badge"] = eyebrowVal;
    result["tagline"] = eyebrowVal;
  }

  const ctaVal =
    enOverrides["ctaText"] ??
    enOverrides["buttonText"] ??
    enOverrides["primaryCtaText"] ??
    enOverrides["primaryButtonText"];
  if (ctaVal !== undefined && ctaVal !== null && ctaVal !== "") {
    result["ctaText"] = ctaVal;
    result["buttonText"] = ctaVal;
    result["primaryCtaText"] = ctaVal;
    result["primaryButtonText"] = ctaVal;
  }

  return result as T;
}

/**
 * Pure function: localizes a full StorefrontPageConfig for the given locale.
 * When locale is 'en', sections with i18n.en overrides will have their text fields
 * overridden with the English strings, falling back to base Arabic when not set.
 */
export function localizePageConfig(
  pageConfig: StorefrontPageConfig | undefined,
  locale: StorefrontLocale
): StorefrontPageConfig {
  if (!pageConfig || !Array.isArray(pageConfig.sections)) {
    return (pageConfig || { sections: [] }) as StorefrontPageConfig;
  }

  if (locale !== "en") {
    return pageConfig;
  }

  const pageSettings = ((pageConfig.settings || {}) as Record<string, any>);
  const pageI18n = pageSettings["i18n"] as Record<string, any> | undefined;
  const pageI18nEn = pageI18n?.["en"];

  const localizedSections = pageConfig.sections.map((sectionEntry, idx) => {
    if (typeof sectionEntry === "string") {
      if (pageI18nEn && pageI18nEn[sectionEntry]) {
        return {
          type: sectionEntry,
          settings: pageI18nEn[sectionEntry],
        };
      }
      return sectionEntry;
    }

    if (!sectionEntry || typeof sectionEntry !== "object") {
      return sectionEntry;
    }

    const sectionId = sectionEntry.id || `section_${idx}`;
    const pageLevelSectionOverride = pageI18nEn?.[sectionId] || pageI18nEn?.[sectionEntry.type];

    const currentSettings = ((sectionEntry.settings || {}) as Record<string, any>);
    const localizedSettings = localizeSectionSettings(currentSettings, locale);

    const mergedWithPageLevel: Record<string, any> = {
      ...localizedSettings,
      ...(typeof pageLevelSectionOverride === "object" ? pageLevelSectionOverride : {}),
    };

    const nextSection: StorefrontSectionConfig = {
      ...sectionEntry,
      settings: mergedWithPageLevel,
    };

    // Keep direct text fields on section root in sync
    const titleVal = mergedWithPageLevel["title"] ?? mergedWithPageLevel["heading"];
    if (titleVal !== undefined && titleVal !== null && titleVal !== "") {
      (nextSection as Record<string, any>)["title"] = titleVal;
      (nextSection as Record<string, any>)["heading"] = titleVal;
    }

    const subtitleVal = mergedWithPageLevel["subtitle"] ?? mergedWithPageLevel["description"];
    if (subtitleVal !== undefined && subtitleVal !== null && subtitleVal !== "") {
      (nextSection as Record<string, any>)["subtitle"] = subtitleVal;
      (nextSection as Record<string, any>)["description"] = subtitleVal;
    }

    const ctaVal =
      mergedWithPageLevel["ctaText"] ??
      mergedWithPageLevel["buttonText"] ??
      mergedWithPageLevel["primaryCtaText"];
    if (ctaVal !== undefined && ctaVal !== null && ctaVal !== "") {
      (nextSection as Record<string, any>)["ctaText"] = ctaVal;
      (nextSection as Record<string, any>)["buttonText"] = ctaVal;
    }

    return nextSection;
  });

  return {
    ...pageConfig,
    sections: localizedSections,
  };
}
