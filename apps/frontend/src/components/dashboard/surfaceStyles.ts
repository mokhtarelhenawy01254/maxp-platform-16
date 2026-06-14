import type { CSSProperties } from "react";

export const shellSurfaceStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, color-mix(in srgb, white 84%, var(--color-background) 16%) 0%, color-mix(in srgb, white 72%, var(--color-background) 28%) 100%)",
  border: "1px solid color-mix(in srgb, var(--color-primary) 14%, var(--color-border))",
  boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)",
};

export const buildPanelStyle = (accent: string): CSSProperties => ({
  ...shellSurfaceStyle,
  border: `1px solid color-mix(in srgb, ${accent} 16%, var(--color-border))`,
});

export const buildTintStyle = (accent: string, strength = 12): CSSProperties => ({
  background: `color-mix(in srgb, ${accent} ${strength}%, var(--color-background))`,
  border: `1px solid color-mix(in srgb, ${accent} 18%, transparent)`,
  color: accent,
});

/** Overrides for dark mode (applied via a CSS class on dark parent) */
export const DARK_SURFACE_CLASS = "dark";
