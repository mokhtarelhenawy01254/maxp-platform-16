import { useMemo } from "react";
import { useStorefrontSettings } from "../storefront/hooks/useStorefrontSettings";
import {
  DEFAULT_THEME_OPTIONS,
  normalizeThemeOptions,
  type ThemeOptionsConfig,
} from "../utils/themeOptions";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null;

const resolveThemeOptionsSource = (
  settings: ReturnType<typeof useStorefrontSettings>["settings"],
): unknown => {
  if (!settings) {
    return null;
  }

  const storefrontSettings = isRecord(settings.storefront?.settings)
    ? settings.storefront.settings
    : null;
  if (storefrontSettings && isRecord(storefrontSettings["themeOptions"])) {
    return storefrontSettings["themeOptions"];
  }

  const storefrontDesignTokens = settings.storefront?.designTokens as unknown;
  const designTokens = asRecord(storefrontDesignTokens);
  if (designTokens && isRecord(designTokens["themeOptions"])) {
    return designTokens["themeOptions"];
  }

  const publicStorefrontDesignTokens =
    settings.storefrontSettings?.designTokens as unknown;
  const publicDesignTokens = asRecord(publicStorefrontDesignTokens);
  if (publicDesignTokens && isRecord(publicDesignTokens["themeOptions"])) {
    return publicDesignTokens["themeOptions"];
  }

  return storefrontSettings;
};

export const useStorefrontThemeOptions = (): {
  themeOptions: ThemeOptionsConfig;
  isLoading: boolean;
  error: Error | null;
} => {
  const { settings, isLoading, error } = useStorefrontSettings();

  const themeOptions = useMemo(
    () =>
      settings
        ? normalizeThemeOptions(resolveThemeOptionsSource(settings))
        : DEFAULT_THEME_OPTIONS,
    [settings],
  );

  return {
    themeOptions,
    isLoading,
    error,
  };
};
