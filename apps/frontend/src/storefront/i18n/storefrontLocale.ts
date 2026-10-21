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
    const sectionI18n = (currentSettings["i18n"] as Record<string, any> | undefined) || ((sectionEntry as Record<string, any>)["i18n"] as Record<string, any> | undefined);
    const sectionI18nEn = sectionI18n?.["en"];

    const mergedEnOverrides: Record<string, any> = {
      ...(typeof pageLevelSectionOverride === "object" ? pageLevelSectionOverride : {}),
      ...(typeof sectionI18nEn === "object" ? sectionI18nEn : {}),
    };

    if (Object.keys(mergedEnOverrides).length === 0) {
      return sectionEntry;
    }

    const nextSettings: Record<string, any> = { ...currentSettings };
    for (const [key, val] of Object.entries(mergedEnOverrides)) {
      if (val !== undefined && val !== null && val !== "") {
        nextSettings[key] = val;
      }
    }

    const nextSection: StorefrontSectionConfig = {
      ...sectionEntry,
      settings: nextSettings,
    };

    // Keep direct text fields on section root in sync if they exist
    for (const key of ["title", "heading", "subtitle", "description", "eyebrow", "badge", "ctaText", "buttonText"]) {
      if (mergedEnOverrides[key] !== undefined && mergedEnOverrides[key] !== null && mergedEnOverrides[key] !== "") {
        (nextSection as Record<string, any>)[key] = mergedEnOverrides[key];
      }
    }

    return nextSection;
  });

  return {
    ...pageConfig,
    sections: localizedSections,
  };
}
