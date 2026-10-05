import { storefrontVariantRegistry } from './registry';
import { storefrontVariantAliases } from './variantAliases';
import type { StorefrontVariantDefinition } from './types';

export const getSectionVariantRegistry = (section: string): readonly StorefrontVariantDefinition[] =>
  storefrontVariantRegistry[section] ?? [];

export const getRegisteredVariant = (
  section: string,
  variantId: string,
): StorefrontVariantDefinition | undefined =>
  getSectionVariantRegistry(section).find((variant) => variant.id === variantId);

export const hasRegisteredVariant = (section: string, variantId: string): boolean =>
  getRegisteredVariant(section, variantId) !== undefined;

export const listRegisteredVariantIds = (section: string): string[] =>
  getSectionVariantRegistry(section).map((variant) => variant.id);

export const getAllRegisteredVariantSections = (): string[] => Object.keys(storefrontVariantRegistry);

export const getDefaultRegisteredVariantId = (section: string): string | undefined =>
  getSectionVariantRegistry(section)[0]?.id;

export const resolveVariantAlias = (section: string, variantId: string): string => {
  const normalized = String(variantId || '').trim();
  const sectionAliases =
    (storefrontVariantAliases as Record<string, Record<string, string> | undefined>)[section];

  if (!sectionAliases) {
    return normalized;
  }

  return sectionAliases[normalized] ?? normalized;
};

export const requireRegisteredVariant = <TVariant extends string>(
  section: string,
  rawVariant: unknown,
  defaultVariant: TVariant,
): TVariant => {
  const original = String(rawVariant ?? '').trim();

  if (!original) {
    return defaultVariant;
  }

  const normalized = resolveVariantAlias(section, original.toLowerCase());
  if (hasRegisteredVariant(section, normalized)) {
    return normalized as TVariant;
  }

  throw new Error(
    `[VariantRegistry] Unknown variant "${original}" for section family "${section}".`,
  );
};

export const resolveSectionVariant = <TVariant extends string>(
  section: string,
  rawVariant: unknown,
  defaultVariant: TVariant,
): TVariant => {
  const original = String(rawVariant ?? '').trim();

  if (!original) {
    return defaultVariant;
  }

  const normalized = resolveVariantAlias(section, original.toLowerCase());
  if (hasRegisteredVariant(section, normalized)) {
    return normalized as TVariant;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[VariantRegistry] Unknown variant "${original}" for section family "${section}". Falling back to default "${defaultVariant}".`,
    );
  }
  return defaultVariant;
};
