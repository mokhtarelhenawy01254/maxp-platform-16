import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getLocaleDirection, getStorefrontLocale } from "./storefrontLocale";
import type { StorefrontLocale, TextDirection } from "./types";

export interface StorefrontLocaleState {
  locale: StorefrontLocale;
  direction: TextDirection;
  isRtl: boolean;
}

/**
 * Reads the active storefront locale from `?lang` → localStorage → the theme's `defaultLocale`.
 * Re-resolves on navigation and on a LanguageSwitcher change so shell text (header/footer) follows
 * the toggle even on a layout that keeps the theme's own direction tokens.
 */
export const useStorefrontLocale = (defaultLocale?: StorefrontLocale): StorefrontLocaleState => {
  const location = useLocation();
  const [locale, setLocale] = useState<StorefrontLocale>(() =>
    getStorefrontLocale(location.search, defaultLocale),
  );

  useEffect(() => {
    setLocale(getStorefrontLocale(location.search, defaultLocale));
  }, [location.search, defaultLocale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<{ locale?: string }>).detail?.locale;
      if (next === "ar" || next === "en") {
        setLocale(next);
      }
    };
    window.addEventListener("storefront:locale-change", onChange);
    return () => window.removeEventListener("storefront:locale-change", onChange);
  }, []);

  return {
    locale,
    direction: getLocaleDirection(locale),
    isRtl: locale === "ar",
  };
};
