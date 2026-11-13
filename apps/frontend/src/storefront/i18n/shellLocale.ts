import type { StorefrontFooterConfig, StorefrontHeaderConfig, StorefrontTheme } from "../types/theme.types";
import type { StorefrontLocale } from "./types";

type AnyRecord = Record<string, any>;

const isPlainObject = (value: unknown): value is AnyRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Locale-aware deep merge used for the theme shell (header/footer).
 *
 * Arrays are merged BY INDEX because the English overrides are written against the same navigation
 * and link order as the Arabic base — replacing the array wholesale would drop the `to` targets that
 * the override intentionally omits (it only carries labels).
 */
export const mergeLocaleOverrides = <T>(base: T, overrides: unknown): T => {
  if (overrides === undefined || overrides === null) {
    return base;
  }

  if (Array.isArray(base) && Array.isArray(overrides)) {
    const length = Math.max(base.length, overrides.length);
    const merged: unknown[] = [];
    for (let i = 0; i < length; i += 1) {
      const baseItem = base[i];
      const overrideItem = overrides[i];
      if (overrideItem === undefined || overrideItem === null) {
        merged.push(baseItem);
      } else if (baseItem === undefined) {
        merged.push(overrideItem);
      } else {
        merged.push(mergeLocaleOverrides(baseItem, overrideItem));
      }
    }
    return merged as unknown as T;
  }

  if (isPlainObject(base) && isPlainObject(overrides)) {
    const result: AnyRecord = { ...base };
    Object.entries(overrides).forEach(([key, value]) => {
      if (key === "i18n") {
        return;
      }
      result[key] = mergeLocaleOverrides((base as AnyRecord)[key], value);
    });
    return result as T;
  }

  if (typeof overrides === "string" && overrides.trim() === "") {
    return base;
  }

  return overrides as T;
};

const pickOverrides = (
  config: { i18n?: Record<string, AnyRecord | undefined> } | undefined,
  locale: StorefrontLocale,
): AnyRecord | undefined => config?.i18n?.[locale];

/**
 * Returns the theme with its header and footer resolved for the active locale.
 *
 * The Arabic/Arabic-less base is what the JSON stores; `header.i18n.en` / `footer.i18n.en` carry the
 * English labels (navigation, brand, footer columns, legal links). When the theme ships no overrides
 * for the locale this is a no-op, so single-language themes keep rendering exactly as before.
 */
export const localizeThemeShell = (
  theme: StorefrontTheme,
  locale: StorefrontLocale,
): StorefrontTheme => {
  const defaultLocale = theme.defaultLocale || "ar";
  const rootLocaleEntry = (theme as AnyRecord).i18n?.[locale];
  const headerOverrides =
    pickOverrides(theme.header as StorefrontHeaderConfig & { i18n?: AnyRecord }, locale) ??
    rootLocaleEntry?.header;
  const footerOverrides =
    pickOverrides(theme.footer as StorefrontFooterConfig & { i18n?: AnyRecord }, locale) ??
    rootLocaleEntry?.footer;

  if (locale === defaultLocale && !rootLocaleEntry && !headerOverrides && !footerOverrides) {
    return theme;
  }

  if (!headerOverrides && !footerOverrides) {
    return theme;
  }

  return {
    ...theme,
    direction: locale === "en" ? "ltr" : "rtl",
    header: headerOverrides
      ? mergeLocaleOverrides(theme.header as StorefrontHeaderConfig, headerOverrides)
      : theme.header,
    footer: footerOverrides
      ? mergeLocaleOverrides(theme.footer as StorefrontFooterConfig, footerOverrides)
      : theme.footer,
  };
};
