import {
  StorefrontPageLayout,
  StorefrontPageConfig,
  StorefrontPageGoal,
  StorefrontSectionConfig,
  StorefrontTheme,
} from "../types/theme.types";

export const STOREFRONT_PAGE_KEYS = [
  "home",
  "shop",
  "pdp",
  "cart",
  "checkout",
] as const;

export type StorefrontPageKey = (typeof STOREFRONT_PAGE_KEYS)[number] | (string & {});

export type StorefrontPageOverrides = Partial<
  Record<StorefrontPageKey, StorefrontPageConfig>
>;

const PAGE_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeSectionEntry = (
  section: unknown,
): string | StorefrontSectionConfig | null => {
  if (typeof section === "string" && section.trim()) {
    return section;
  }

  if (!isRecord(section)) {
    return null;
  }

  const type = section["type"];
  if (typeof type !== "string" || !type.trim()) {
    return null;
  }

  return section as StorefrontSectionConfig;
};

const normalizePageGoal = (value: unknown): StorefrontPageGoal | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "conversion" ||
    normalized === "discovery" ||
    normalized === "trust"
  ) {
    return normalized as StorefrontPageGoal;
  }

  return undefined;
};

const normalizePageConfig = (value: unknown): StorefrontPageConfig | null => {
  if (!isRecord(value) || !Array.isArray(value["sections"])) {
    return null;
  }

  const sections = value["sections"]
    .map((section) => normalizeSectionEntry(section))
    .filter(
      (section): section is string | StorefrontSectionConfig => Boolean(section),
    );

  const layoutHint =
    typeof value["layoutHint"] === "string" && value["layoutHint"].trim()
      ? (value["layoutHint"].trim() as StorefrontPageLayout)
      : undefined;

  const pageGoal = normalizePageGoal(value["pageGoal"]);
  const compositionPolicy = isRecord(value["compositionPolicy"])
    ? {
        ...(normalizePageGoal(value["compositionPolicy"]["pageGoal"])
          ? {
              pageGoal: normalizePageGoal(value["compositionPolicy"]["pageGoal"]),
            }
          : {}),
        ...(typeof value["compositionPolicy"]["preserveManualOrder"] === "boolean"
          ? {
              preserveManualOrder: value["compositionPolicy"]["preserveManualOrder"],
            }
          : {}),
        ...(typeof value["compositionPolicy"]["enforceTrustSignals"] === "boolean"
          ? {
              enforceTrustSignals: value["compositionPolicy"]["enforceTrustSignals"],
            }
          : {}),
      }
    : undefined;

  return sections.length > 0
    ? {
        sections,
        ...(layoutHint ? { layoutHint } : {}),
        ...(pageGoal ? { pageGoal } : {}),
        ...(compositionPolicy && Object.keys(compositionPolicy).length > 0
          ? { compositionPolicy }
          : {}),
      }
    : {
        sections: [],
        ...(layoutHint ? { layoutHint } : {}),
        ...(pageGoal ? { pageGoal } : {}),
        ...(compositionPolicy && Object.keys(compositionPolicy).length > 0
          ? { compositionPolicy }
          : {}),
      };
};

export const normalizeStorefrontPageOverrides = (
  value: unknown,
): StorefrontPageOverrides => {
  if (!isRecord(value)) {
    return {};
  }

  const overrides: StorefrontPageOverrides = {};

  Object.keys(value).forEach((key) => {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey || !PAGE_KEY_PATTERN.test(normalizedKey)) {
      return;
    }
    const normalizedPage = normalizePageConfig(value[key]);
    if (normalizedPage) {
      overrides[normalizedKey as StorefrontPageKey] = normalizedPage;
    }
  });

  return overrides;
};

export const serializeStorefrontPageOverrides = (value: unknown): string =>
  JSON.stringify(normalizeStorefrontPageOverrides(value));

export const getStorefrontPageOverridesFromDesignTokens = (
  designTokens: unknown,
): StorefrontPageOverrides => {
  if (!isRecord(designTokens)) {
    return {};
  }

  const fromOverrides = normalizeStorefrontPageOverrides(designTokens["pageOverrides"]);
  const fromPages = normalizeStorefrontPageOverrides(designTokens["pages"]);

  const allKeys = Array.from(
    new Set([...Object.keys(fromOverrides), ...Object.keys(fromPages)]),
  );

  const merged: StorefrontPageOverrides = {};
  for (const key of allKeys) {
    const pageKey = key as StorefrontPageKey;
    const overConfig = fromOverrides[pageKey];
    const pageConfig = fromPages[pageKey];

    if (overConfig && pageConfig) {
      const overLen = overConfig.sections?.length || 0;
      const pageLen = pageConfig.sections?.length || 0;
      merged[pageKey] = {
        ...pageConfig,
        ...overConfig,
        sections: pageLen > overLen ? pageConfig.sections : overConfig.sections,
      };
    } else {
      merged[pageKey] = overConfig || pageConfig;
    }
  }

  return merged;
};

export const upsertStorefrontPageOverridesInDesignTokens = (
  designTokens: unknown,
  overrides: unknown,
): Record<string, unknown> => {
  const root = isRecord(designTokens) ? { ...designTokens } : {};
  const normalizedOverrides = normalizeStorefrontPageOverrides(overrides);

  if (Object.keys(normalizedOverrides).length === 0) {
    delete root["pageOverrides"];
    return root;
  }

  root["pageOverrides"] = normalizedOverrides;
  return root;
};

export const applyStorefrontPageOverrides = (
  theme: StorefrontTheme,
  rawOverrides: unknown,
): StorefrontTheme => {
  const overrides = normalizeStorefrontPageOverrides(rawOverrides);
  if (Object.keys(overrides).length === 0) {
    return theme;
  }

  const nextPages = { ...theme.pages };

  Object.entries(overrides).forEach(([pageKey, pageConfig]) => {
    if (pageConfig) {
      nextPages[pageKey] = {
        ...(nextPages[pageKey] || { sections: [] }),
        sections: pageConfig.sections,
        ...(pageConfig.layoutHint ? { layoutHint: pageConfig.layoutHint } : {}),
        ...(pageConfig.pageGoal ? { pageGoal: pageConfig.pageGoal } : {}),
        ...(pageConfig.compositionPolicy
          ? { compositionPolicy: pageConfig.compositionPolicy }
          : {}),
      };
    }
  });

  return {
    ...theme,
    pages: nextPages,
  };
};
