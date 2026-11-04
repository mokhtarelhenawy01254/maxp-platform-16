import { STOREFRONT_SECTION_MANIFEST } from '../sections/manifest';

/**
 * Section id -> component key, resolved from the section manifest.
 *
 * The CLI validator (`scripts/validate-theme-file.ts`) must be able to run without booting
 * React, so it reads this pure map instead of importing `ComponentRegistry` (which pulls every
 * section component and their UI kit). The manifest is the single source of truth for the
 * component key, and the registry is built from it in `engine/ComponentRegistry.ts`.
 *
 * For the stricter check — "the component key actually resolves to a React component" — run
 * `npx tsx scripts/validate-theme-sections.ts <theme.json>`, which imports the real registry.
 */
export const STOREFRONT_SECTION_COMPONENT_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(STOREFRONT_SECTION_MANIFEST).map(([sectionId, sectionConfig]) => [
    sectionId,
    String((sectionConfig as { component?: string }).component || sectionId),
  ]),
);

export const isStorefrontSectionRegistered = (sectionId: string): boolean =>
  Boolean(sectionId && STOREFRONT_SECTION_COMPONENT_MAP[sectionId]);

export const getStorefrontSectionComponentKey = (sectionId: string): string | null =>
  STOREFRONT_SECTION_COMPONENT_MAP[sectionId] || null;
