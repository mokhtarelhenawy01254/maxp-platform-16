import { DEFAULT_STOREFRONT_THEME_ID } from "../themes";
import { resolveStorefrontTheme } from "../engine/themeResolver";
import { validateStorefrontTheme } from "../engine/themeValidation";
import {
  normalizeStorefrontContentOverrides,
  type StorefrontContentOverrides,
  upsertStorefrontContentOverridesInDesignTokens,
} from "../utils/contentOverrides";
import {
  normalizeStorefrontPageOverrides,
  type StorefrontPageKey,
  type StorefrontPageOverrides,
  upsertStorefrontPageOverridesInDesignTokens,
} from "../utils/pageOverrides";
import { validateStorefrontPageOverrides } from "../utils/pageOverrideValidation";
import type {
  CompiledStorefrontBlueprint,
  StorefrontTemplateBlueprint,
} from "./types";
import type {
  StorefrontPageConfig,
  StorefrontPageGoal,
  StorefrontPageLayout,
  StorefrontSectionConfig,
} from "../types/theme.types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getSectionType = (
  section: string | StorefrontSectionConfig,
): string =>
  typeof section === "string" ? section : section.type;

const inferPageGoal = (pageKey: string): StorefrontPageGoal | undefined => {
  switch (pageKey) {
    case "home":
      return "conversion";
    case "shop":
    case "collections":
    case "sale":
      return "discovery";
    case "pdp":
    case "product":
      return "trust";
    default:
      return undefined;
  }
};

const scoreSectionForGoal = (sectionType: string, goal?: StorefrontPageGoal): number => {
  const type = sectionType.toLowerCase();

  const scoreByKeyword = (keywords: string[], weight: number): number =>
    keywords.some((keyword) => type.includes(keyword)) ? weight : 0;

  if (goal === "conversion") {
    return (
      scoreByKeyword(["hero", "banner", "promo"], 50) +
      scoreByKeyword(["trust", "feature", "usp", "benefit", "faq"], 40) +
      scoreByKeyword(["collection", "category", "featured", "product", "grid"], 30) +
      scoreByKeyword(["newsletter", "footer"], 5)
    );
  }

  if (goal === "discovery") {
    return (
      scoreByKeyword(["collection", "category", "grid", "product", "featured", "filter"], 50) +
      scoreByKeyword(["promo", "hero"], 25) +
      scoreByKeyword(["trust", "faq"], 20) +
      scoreByKeyword(["newsletter", "footer"], 5)
    );
  }

  if (goal === "trust") {
    return (
      scoreByKeyword(["product", "gallery", "info", "details", "price"], 50) +
      scoreByKeyword(["trust", "faq", "review", "shipping", "payment", "policy"], 45) +
      scoreByKeyword(["featured", "related", "upsell"], 20) +
      scoreByKeyword(["newsletter", "footer"], 5)
    );
  }

  return 0;
};

const applyCompositionPolicies = (
  pageOverrides: StorefrontPageOverrides,
): StorefrontPageOverrides =>
  Object.entries(pageOverrides).reduce<StorefrontPageOverrides>((acc, [pageKey, pageConfig]) => {
    if (!pageConfig) {
      return acc;
    }

    const goal =
      pageConfig.pageGoal ||
      pageConfig.compositionPolicy?.pageGoal ||
      inferPageGoal(pageKey);

    const preserveManualOrder = pageConfig.compositionPolicy?.preserveManualOrder === true;
    const enforceTrustSignals = pageConfig.compositionPolicy?.enforceTrustSignals !== false;

    const originalSections = cloneJson(pageConfig.sections || []);
    let nextSections = originalSections;

    if (!preserveManualOrder && goal) {
      nextSections = [...originalSections].sort((a, b) => {
        const scoreA = scoreSectionForGoal(getSectionType(a), goal);
        const scoreB = scoreSectionForGoal(getSectionType(b), goal);
        return scoreB - scoreA;
      });
    }

    const hasTrustSignals = nextSections.some((section) => {
      const type = getSectionType(section).toLowerCase();
      return ["trust", "faq", "review", "shipping", "payment", "policy", "feature", "benefit"].some(
        (keyword) => type.includes(keyword),
      );
    });

    acc[pageKey as StorefrontPageKey] = {
      ...pageConfig,
      sections: nextSections,
      ...(goal ? { pageGoal: goal } : {}),
      compositionPolicy: {
        ...pageConfig.compositionPolicy,
        ...(goal ? { pageGoal: goal } : {}),
        ...(enforceTrustSignals ? { enforceTrustSignals } : {}),
        preserveManualOrder,
      },
      ...(enforceTrustSignals && !hasTrustSignals
        ? {
            compositionPolicy: {
              ...pageConfig.compositionPolicy,
              ...(goal ? { pageGoal: goal } : {}),
              preserveManualOrder,
              enforceTrustSignals: true,
            },
          }
        : {}),
    };

    return acc;
  }, {});

const buildPageOverridesFromBlueprintPages = (
  pages?: StorefrontTemplateBlueprint["pages"],
): StorefrontPageOverrides => {
  if (!pages || !isRecord(pages)) {
    return {};
  }

  return Object.entries(pages).reduce<StorefrontPageOverrides>((acc, [pageKey, pageValue]) => {
    if (!pageValue || !Array.isArray(pageValue.sections)) {
      return acc;
    }

    acc[pageKey as StorefrontPageKey] = {
      sections: cloneJson(pageValue.sections),
      ...(pageValue.layoutHint ? { layoutHint: pageValue.layoutHint } : {}),
      ...(pageValue.pageGoal ? { pageGoal: pageValue.pageGoal } : {}),
      ...(pageValue.settings ? { settings: cloneJson(pageValue.settings) } : {}),
      ...(pageValue.compositionPolicy
        ? { compositionPolicy: cloneJson(pageValue.compositionPolicy) }
        : {}),
    } as StorefrontPageConfig;

    return acc;
  }, {});
};

const mergePageOverrides = (
  blueprintPages?: StorefrontTemplateBlueprint["pages"],
  rawOverrides?: StorefrontTemplateBlueprint["pageOverrides"],
): StorefrontPageOverrides =>
  applyCompositionPolicies(
    normalizeStorefrontPageOverrides({
      ...buildPageOverridesFromBlueprintPages(blueprintPages),
      ...(isRecord(rawOverrides) ? rawOverrides : {}),
    }),
  );

const extractLayoutHints = (
  pages?: StorefrontTemplateBlueprint["pages"],
): Partial<Record<StorefrontPageKey, StorefrontPageLayout>> => {
  if (!pages || !isRecord(pages)) {
    return {};
  }

  return Object.entries(pages).reduce<
    Partial<Record<StorefrontPageKey, StorefrontPageLayout>>
  >((acc, [pageKey, pageValue]) => {
    if (pageValue?.layoutHint) {
      acc[pageKey as StorefrontPageKey] = pageValue.layoutHint;
    }
    return acc;
  }, {});
};

const buildBlueprintDesignTokens = (
  blueprint: StorefrontTemplateBlueprint,
  pageOverrides: StorefrontPageOverrides,
  contentOverrides: StorefrontContentOverrides,
  layoutHints: Partial<Record<StorefrontPageKey, StorefrontPageLayout>>,
): Record<string, unknown> => {
  const baseThemeId = blueprint.baseThemeId || DEFAULT_STOREFRONT_THEME_ID;
  let designTokens: Record<string, unknown> = {
    themeId: baseThemeId,
    ...(blueprint.tokens?.colors ? { colors: cloneJson(blueprint.tokens.colors) } : {}),
    ...(blueprint.tokens?.typography
      ? { typography: cloneJson(blueprint.tokens.typography) }
      : {}),
    ...(blueprint.tokens?.shape ? { shape: cloneJson(blueprint.tokens.shape) } : {}),
    ...(blueprint.tokens?.productCard
      ? { productCard: cloneJson(blueprint.tokens.productCard) }
      : {}),
    ...(blueprint.header ? { header: cloneJson(blueprint.header) } : {}),
    ...(blueprint.footer ? { footer: cloneJson(blueprint.footer) } : {}),
    ...(blueprint.seo ? { seo: cloneJson(blueprint.seo) } : {}),
    blueprint: {
      id: blueprint.id,
      name: blueprint.name,
      ...(blueprint.description ? { description: blueprint.description } : {}),
      ...(blueprint.source ? { source: cloneJson(blueprint.source) } : {}),
      ...(blueprint.tags?.length ? { tags: cloneJson(blueprint.tags) } : {}),
      ...(Object.keys(layoutHints).length > 0 ? { layoutHints } : {}),
      ...(blueprint.metadata ? { metadata: cloneJson(blueprint.metadata) } : {}),
    },
  };

  designTokens = upsertStorefrontPageOverridesInDesignTokens(
    designTokens,
    pageOverrides,
  );
  designTokens = upsertStorefrontContentOverridesInDesignTokens(
    designTokens,
    contentOverrides,
  );

  return designTokens;
};

export const validateStorefrontBlueprint = (
  blueprint: StorefrontTemplateBlueprint,
): string[] => {
  const pageOverrides = mergePageOverrides(blueprint.pages, blueprint.pageOverrides);
  const contentOverrides = normalizeStorefrontContentOverrides(blueprint.contentOverrides);
  const layoutHints = extractLayoutHints(blueprint.pages);
  const designTokens = buildBlueprintDesignTokens(
    blueprint,
    pageOverrides,
    contentOverrides,
    layoutHints,
  );

  const compiledTheme = resolveStorefrontTheme({
    themeId: blueprint.baseThemeId || DEFAULT_STOREFRONT_THEME_ID,
    name: blueprint.name,
    settings: {
      themeId: blueprint.baseThemeId || DEFAULT_STOREFRONT_THEME_ID,
      designTokens,
    },
  });
  compiledTheme.id = blueprint.id;
  compiledTheme.name = blueprint.name;

  const themeErrors = validateStorefrontTheme(compiledTheme);
  const pageOverrideErrors = validateStorefrontPageOverrides({
    overrides: pageOverrides,
  }).issues
    .filter((issue) => issue.severity === "error")
    .map(
      (issue) =>
        `${issue.pageKey}:${issue.sectionType}:${issue.fieldKey}: ${issue.message}`,
    );

  return [...themeErrors, ...pageOverrideErrors];
};

export const compileStorefrontBlueprint = (
  blueprint: StorefrontTemplateBlueprint,
): CompiledStorefrontBlueprint => {
  const pageOverrides = mergePageOverrides(blueprint.pages, blueprint.pageOverrides);
  const contentOverrides = normalizeStorefrontContentOverrides(blueprint.contentOverrides);
  const layoutHints = extractLayoutHints(blueprint.pages);
  const designTokens = buildBlueprintDesignTokens(
    blueprint,
    pageOverrides,
    contentOverrides,
    layoutHints,
  );

  const errors = validateStorefrontBlueprint(blueprint);
  if (errors.length > 0) {
    throw new Error(
      `Storefront blueprint "${blueprint.id}" is invalid: ${errors.join(" | ")}`,
    );
  }

  const theme = resolveStorefrontTheme({
    themeId: blueprint.baseThemeId || DEFAULT_STOREFRONT_THEME_ID,
    name: blueprint.name,
    settings: {
      themeId: blueprint.baseThemeId || DEFAULT_STOREFRONT_THEME_ID,
      designTokens,
    },
  });

  theme.id = blueprint.id;
  theme.name = blueprint.name;

  const previewImage = blueprint.metadata?.['previewImage'];
  if (typeof previewImage === 'string' && previewImage.trim()) {
    theme.preview = {
      imageUrl: previewImage.trim(),
    };
  }

  return {
    blueprint: cloneJson(blueprint),
    theme,
    designTokens,
    pageOverrides,
    contentOverrides,
    layoutHints,
  };
};
