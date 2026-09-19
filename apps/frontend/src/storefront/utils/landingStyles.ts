/**
 * landingStyles.ts
 * ================
 * Style presets for product landing pages, shared by the admin builder
 * (product-landing) and the storefront renderer (ProductImageLandingPage).
 *
 * A preset only remaps the existing --pil-* CSS variables that
 * ProductImageLandingPage.css already consumes — no new CSS surface, so an
 * unknown/missing preset always falls back to the classic look.
 *
 * Stored per landing page as a JSON object on the `style` column:
 *   { preset, brandColor, buttonRadius, headingFont }
 */

export type LandingStyleFontKey = "almarai" | "cairo" | "tajawal";

export interface LandingStyle {
  preset?: string | null;
  brandColor?: string | null;
  buttonRadius?: number | null;
  headingFont?: LandingStyleFontKey | null;
}

export interface LandingStylePreset {
  id: string;
  label: string;
  /** Chip swatches: [page, accent, ink] */
  swatch: [string, string, string];
  vars: Record<string, string>;
}

const FONT_STACKS: Record<LandingStyleFontKey, string> = {
  almarai:
    '"Almarai", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  cairo: '"Cairo", "Almarai", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  tajawal:
    '"Tajawal", "Almarai", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const FONT_IMPORTS: Partial<Record<LandingStyleFontKey, string>> = {
  cairo:
    "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap",
  tajawal:
    "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap",
};

export const LANDING_STYLE_FONTS: Array<{
  key: LandingStyleFontKey;
  label: string;
}> = [
  { key: "almarai", label: "Almarai" },
  { key: "cairo", label: "Cairo" },
  { key: "tajawal", label: "Tajawal" },
];

const CLASSIC_PRESET: LandingStylePreset = {
  id: "classic",
  label: "كلاسيك",
  swatch: ["#f8fafc", "#0369a1", "#0f172a"],
  vars: {
    "--pil-page": "#f8fafc",
    "--pil-ink": "#0f172a",
    "--pil-muted": "#475569",
    "--pil-surface": "#ffffff",
    "--pil-soft": "#f8fafc",
    "--pil-line": "#e2e8f0",
    "--pil-deep": "#0f172a",
    "--pil-teal": "#0284c7",
    "--pil-teal-deep": "#0369a1",
    "--pil-coral": "#ef4444",
    "--pil-gold": "#f59e0b",
  },
};

/**
 * Presets are light-family by design: the landing CSS still has many
 * hardcoded light surfaces (cards, inputs), so dark presets are out of
 * scope for v1. Each preset remaps page tint, ink, accents and CTAs.
 */
export const LANDING_STYLE_PRESETS: LandingStylePreset[] = [
  CLASSIC_PRESET,
  {
    id: "warm-cream",
    label: "كريمي دافي",
    swatch: ["#fdfbf7", "#97431f", "#3a2f22"],
    vars: {
      "--pil-page": "#fdfbf7",
      "--pil-ink": "#2d2418",
      "--pil-muted": "#6b5d49",
      "--pil-surface": "#fffdf8",
      "--pil-soft": "#faf3e8",
      "--pil-line": "#e8dcc9",
      "--pil-deep": "#3a2f22",
      "--pil-teal": "#b4552d",
      "--pil-teal-deep": "#97431f",
      "--pil-coral": "#c0392b",
      "--pil-gold": "#d99a2b",
    },
  },
  {
    id: "soft-rose",
    label: "ناعم وردي",
    swatch: ["#fdf6f8", "#b81d62", "#3d2b33"],
    vars: {
      "--pil-page": "#fdf6f8",
      "--pil-ink": "#3d2b33",
      "--pil-muted": "#7c6470",
      "--pil-surface": "#fffbfc",
      "--pil-soft": "#fdf1f4",
      "--pil-line": "#f2dee4",
      "--pil-deep": "#4a303a",
      "--pil-teal": "#db2777",
      "--pil-teal-deep": "#b81d62",
      "--pil-coral": "#e11d48",
      "--pil-gold": "#d4a13d",
    },
  },
  {
    id: "fresh-mint",
    label: "أخضر منعش",
    swatch: ["#f3faf6", "#047857", "#14342c"],
    vars: {
      "--pil-page": "#f3faf6",
      "--pil-ink": "#14342c",
      "--pil-muted": "#4f6f66",
      "--pil-surface": "#ffffff",
      "--pil-soft": "#eef8f2",
      "--pil-line": "#d7ece0",
      "--pil-deep": "#0f2d26",
      "--pil-teal": "#059669",
      "--pil-teal-deep": "#047857",
      "--pil-coral": "#dc2626",
      "--pil-gold": "#d97706",
    },
  },
  {
    id: "royal-blue",
    label: "أزرق ملكي",
    swatch: ["#f5f7fc", "#3730a3", "#171d3a"],
    vars: {
      "--pil-page": "#f5f7fc",
      "--pil-ink": "#171d3a",
      "--pil-muted": "#4b5372",
      "--pil-surface": "#ffffff",
      "--pil-soft": "#eef1fa",
      "--pil-line": "#dde3f0",
      "--pil-deep": "#141a36",
      "--pil-teal": "#4f46e5",
      "--pil-teal-deep": "#3730a3",
      "--pil-coral": "#ef4444",
      "--pil-gold": "#f59e0b",
    },
  },
  {
    id: "sunset-orange",
    label: "برتقالي حيوي",
    swatch: ["#fdf9f4", "#c2410c", "#2f1c10"],
    vars: {
      "--pil-page": "#fdf9f4",
      "--pil-ink": "#2f1c10",
      "--pil-muted": "#6e5644",
      "--pil-surface": "#fffdf9",
      "--pil-soft": "#fbf2e8",
      "--pil-line": "#f0e2d2",
      "--pil-deep": "#33200f",
      "--pil-teal": "#ea580c",
      "--pil-teal-deep": "#c2410c",
      "--pil-coral": "#dc2626",
      "--pil-gold": "#eab308",
    },
  },
];

const DEFAULT_PRESET: LandingStylePreset = CLASSIC_PRESET;

export const DEFAULT_LANDING_STYLE_PRESET: LandingStylePreset = CLASSIC_PRESET;

const normalizeHexColor = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : null;
};

/** shade < 0 darkens, shade > 0 lightens; keeps hex in the #rrggbb form. */
export const shadeHexColor = (hex: string, shade: number): string => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return hex;

  const channel = (index: number) => {
    const value = parseInt(normalized.slice(1 + index * 2, 3 + index * 2), 16);
    const shifted =
      shade < 0 ? value * (1 + shade) : value + (255 - value) * shade;
    return Math.max(0, Math.min(255, Math.round(shifted)));
  };

  return `#${[channel(0), channel(1), channel(2)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
};

const clampButtonRadius = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(28, Math.round(parsed)));
};

export interface ResolvedLandingStyle {
  cssVars: Record<string, string>;
  fontKey: LandingStyleFontKey;
  preset: LandingStylePreset;
}

/**
 * Turns the stored landing style into the concrete --pil-* variable map
 * applied to the page root, merging preset + merchant overrides.
 */
export const resolveLandingStyle = (style: unknown): ResolvedLandingStyle => {
  const record: Record<string, unknown> =
    typeof style === "object" && style !== null
      ? (style as Record<string, unknown>)
      : {};

  const preset =
    LANDING_STYLE_PRESETS.find((p) => p.id === record["preset"]) ?? DEFAULT_PRESET;
  const cssVars: Record<string, string> = { ...preset.vars };

  const brandColor = normalizeHexColor(record["brandColor"]);
  if (brandColor) {
    cssVars["--pil-teal"] = brandColor;
    cssVars["--pil-teal-deep"] = shadeHexColor(brandColor, -0.16);
  }

  const headingFont = record["headingFont"];
  const fontKey: LandingStyleFontKey =
    typeof headingFont === "string" && headingFont in FONT_STACKS
      ? (headingFont as LandingStyleFontKey)
      : "almarai";
  cssVars["--pil-display"] = FONT_STACKS[fontKey];
  cssVars["--pil-body"] = FONT_STACKS.almarai;

  const buttonRadius = clampButtonRadius(record["buttonRadius"]);
  if (buttonRadius !== null) {
    cssVars["--pil-radius"] = `${buttonRadius}px`;
  }

  return { cssVars, fontKey, preset };
};

/**
 * Loads the Google-Fonts stylesheet for non-default heading fonts exactly
 * once per document. Safe to call on every render.
 */
export const ensureLandingStyleFontLoaded = (fontKey: LandingStyleFontKey) => {
  const href = FONT_IMPORTS[fontKey];
  if (!href || typeof document === "undefined") return;

  if (document.querySelector(`link[data-landing-font="${fontKey}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-landing-font", fontKey);
  document.head.appendChild(link);
};
