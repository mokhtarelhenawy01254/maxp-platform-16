import React from "react";
import type { StorefrontPageConfig, StorefrontPageLayout } from "../types/theme.types";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import type { RenderSectionFrameArgs } from "../engine/PageComposer";
import { buildSectionStyle, hasDeviceOverrides, generateResponsiveCss } from "../studio/utils/studioStyleUtils";
import { useCurrentBreakpoint } from "../hooks/useCurrentBreakpoint";

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
  const isHidden =
    typeof sectionEntry === "object" &&
    sectionEntry !== null &&
    (sectionEntry.hidden === true || sectionEntry.settings?.hidden === true);
  if (isHidden) {
    return null;
  }
  const { theme } = useStorefrontTheme();
  const reveal = isRevealEnabledTheme(theme?.id);
  const currentBreakpoint = useCurrentBreakpoint();

  const settings =
    typeof sectionEntry === "object" && sectionEntry !== null
      ? (sectionEntry.settings || sectionEntry)
      : undefined;

  const sectionKey =
    typeof sectionEntry === "object" && sectionEntry?.key
      ? sectionEntry.key
      : `sf-section-${index}`;

  // Resolve responsive styles for the live breakpoint (Ticket 2G / 5R)
  const sectionStyle = buildSectionStyle(settings, undefined, currentBreakpoint);
  const hasResponsive = hasDeviceOverrides(settings, "mobile") || hasDeviceOverrides(settings, "tablet");

  // Generate responsive media query styles for live storefront window resizing (Ticket 5R / 5B pattern)
  const sectionSelector = `[data-section-key="${sectionKey}"]`;
  const responsiveCss = generateResponsiveCss(settings, sectionSelector);

  return (
    <div
      data-storefront-section="true"
      data-section-index={index}
      data-section-key={sectionKey}
      data-section-type={typeof sectionEntry === "string" ? sectionEntry : sectionEntry?.type}
      data-device-breakpoint={currentBreakpoint}
      data-has-responsive={hasResponsive ? "true" : undefined}
      style={sectionStyle}
      className={reveal ? `sf-reveal ${index > 0 ? 'mt-6 sm:mt-12' : ''}` : index > 0 ? 'mt-6 sm:mt-12' : ''}
      data-reveal-delay={reveal ? (index % 5) + 1 : undefined}
    >
      {responsiveCss && (
        <style
          data-section-style={sectionKey}
          dangerouslySetInnerHTML={{ __html: responsiveCss }}
        />
      )}
      {element}
    </div>
  );
};

export default StorefrontSectionFrame;
