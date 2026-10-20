import React from "react";
import type { StorefrontPageConfig, StorefrontPageLayout } from "../types/theme.types";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import type { RenderSectionFrameArgs } from "../engine/PageComposer";
import { buildSectionStyle } from "../studio/utils/studioStyleUtils";

export const resolveStorefrontPageLayout = (
  pageConfig: StorefrontPageConfig | undefined,
  fallback: StorefrontPageLayout = "stack",
): StorefrontPageLayout => pageConfig?.layoutHint || fallback;

export const REVEAL_ENABLED_THEMES = new Set<string>(['soft-graceful']);
export const isRevealEnabledTheme = (themeId?: string) =>
  Boolean(themeId) && REVEAL_ENABLED_THEMES.has(String(themeId));

export const StorefrontSectionFrame: React.FC<RenderSectionFrameArgs> = ({
  element,
  index,
  sectionEntry,
}) => {
  if (!element) {
    return null;
  }
  const { theme } = useStorefrontTheme();
  const reveal = isRevealEnabledTheme(theme?.id);
  const settings =
    typeof sectionEntry === "object" && sectionEntry !== null
      ? (sectionEntry.settings || sectionEntry)
      : undefined;
  const sectionStyle = buildSectionStyle(settings);

  return (
    <div
      data-storefront-section="true"
      data-section-index={index}
      data-section-type={typeof sectionEntry === "string" ? sectionEntry : sectionEntry?.type}
      style={sectionStyle}
      className={reveal ? `sf-reveal ${index > 0 ? 'mt-6 sm:mt-12' : ''}` : index > 0 ? 'mt-6 sm:mt-12' : ''}
      data-reveal-delay={reveal ? (index % 5) + 1 : undefined}
    >
      {element}
    </div>
  );
};

export default StorefrontSectionFrame;
