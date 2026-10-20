/**
 * Utility functions for storefront studio style computation,
 * free-value conversions, Arabic numeral normalization, and shadow formatting.
 */

/**
 * Converts Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to standard Latin digits (0-9).
 */
export function normalizeArabicDigits(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  return str.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

/**
 * Parses a free number input safely, handling Arabic numerals and empty strings.
 */
export function parseFreeNumber(
  value: string | number | undefined | null,
  fallback: number = 0
): number {
  if (typeof value === "number") return isNaN(value) ? fallback : value;
  if (!value) return fallback;
  const normalized = normalizeArabicDigits(value).trim();
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Converts HEX color + opacity (0..1) to rgba(...) CSS string.
 */
export function hexToRgba(hex: string, opacity: number = 1): string {
  if (!hex || typeof hex !== "string") return `rgba(0, 0, 0, ${opacity})`;
  let cleanHex = hex.trim().replace(/^#/, "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleanHex.length !== 6) {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  return `rgba(${r}, ${g}, ${b}, ${clampedOpacity})`;
}

export interface StudioShadowConfig {
  x: number;
  y: number;
  blur: number;
  spread: number;
  opacity: number;
  color: string;
}

export const DEFAULT_CUSTOM_SHADOW: StudioShadowConfig = {
  x: 0,
  y: 12,
  blur: 30,
  spread: 0,
  opacity: 0.25,
  color: "#000000",
};

/**
 * Builds standard CSS box-shadow string from settings.
 * Supports presets ('none', 'soft', 'card') and custom free parameters (x, y, blur, spread, opacity, color).
 */
export function buildBoxShadowString(settings?: Record<string, any> | null): string {
  if (!settings) return "none";
  const shadowMode = settings.shadow;

  if (shadowMode === "none") return "none";
  if (shadowMode === "soft") return "0px 4px 12px 0px rgba(0, 0, 0, 0.06)";
  if (shadowMode === "card") {
    return "0px 10px 25px -5px rgba(0, 0, 0, 0.1), 0px 8px 10px -6px rgba(0, 0, 0, 0.1)";
  }

  // If custom mode or individual shadow fields are specified
  if (
    shadowMode === "custom" ||
    settings.customShadow ||
    settings.shadowBlur !== undefined ||
    settings.shadowY !== undefined ||
    settings.shadowX !== undefined ||
    settings.shadowSpread !== undefined
  ) {
    const x = parseFreeNumber(settings.shadowX, DEFAULT_CUSTOM_SHADOW.x);
    const y = parseFreeNumber(settings.shadowY, DEFAULT_CUSTOM_SHADOW.y);
    const blur = parseFreeNumber(settings.shadowBlur, DEFAULT_CUSTOM_SHADOW.blur);
    const spread = parseFreeNumber(settings.shadowSpread, DEFAULT_CUSTOM_SHADOW.spread);
    const opacity =
      settings.shadowOpacity !== undefined
        ? Math.max(0, Math.min(1, parseFreeNumber(settings.shadowOpacity, 0.25)))
        : DEFAULT_CUSTOM_SHADOW.opacity;
    const color = settings.shadowColor || DEFAULT_CUSTOM_SHADOW.color;
    const rgba = hexToRgba(color, opacity);
    return `${x}px ${y}px ${blur}px ${spread}px ${rgba}`;
  }

  return "none";
}

/**
 * Resolves border radius to a px value.
 * Handles numeric values (e.g. 24 -> "24px"), strings ("24px"), and legacy presets.
 */
export function resolveBorderRadius(value: any): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return `${value}px`;

  const str = String(value).trim();
  if (str === "none" || str === "0") return "0px";
  if (str === "small") return "8px";
  if (str === "medium") return "16px";
  if (str === "large") return "24px";
  if (str.endsWith("px") || str.endsWith("%") || str.endsWith("rem")) return str;

  const parsed = parseFreeNumber(str, NaN);
  if (!isNaN(parsed)) return `${parsed}px`;

  return undefined;
}

/**
 * Computes the unified CSS style object for a storefront section.
 * Used in both StudioSortableSection (canvas) and StorefrontSectionFrame (live storefront).
 */
export function buildSectionStyle(
  settings?: Record<string, any> | null,
  baseStyle?: React.CSSProperties
): React.CSSProperties {
  if (!settings) return baseStyle || {};

  const style: React.CSSProperties = { ...(baseStyle || {}) };

  // 1. Free Padding
  if (settings.paddingTop !== undefined && settings.paddingTop !== null) {
    style.paddingTop = `${parseFreeNumber(settings.paddingTop)}px`;
  } else if (settings.padding !== undefined && settings.padding !== null) {
    style.paddingTop = `${parseFreeNumber(settings.padding)}px`;
  }

  if (settings.paddingBottom !== undefined && settings.paddingBottom !== null) {
    style.paddingBottom = `${parseFreeNumber(settings.paddingBottom)}px`;
  } else if (settings.padding !== undefined && settings.padding !== null) {
    style.paddingBottom = `${parseFreeNumber(settings.padding)}px`;
  }

  if (settings.paddingRight !== undefined && settings.paddingRight !== null) {
    style.paddingRight = `${parseFreeNumber(settings.paddingRight)}px`;
  } else if (settings.padding !== undefined && settings.padding !== null) {
    style.paddingRight = `${parseFreeNumber(settings.padding)}px`;
  }

  if (settings.paddingLeft !== undefined && settings.paddingLeft !== null) {
    style.paddingLeft = `${parseFreeNumber(settings.paddingLeft)}px`;
  } else if (settings.padding !== undefined && settings.padding !== null) {
    style.paddingLeft = `${parseFreeNumber(settings.padding)}px`;
  }

  // 2. Free Margin
  if (settings.marginTop !== undefined && settings.marginTop !== null) {
    style.marginTop = `${parseFreeNumber(settings.marginTop)}px`;
  }
  if (settings.marginBottom !== undefined && settings.marginBottom !== null) {
    style.marginBottom = `${parseFreeNumber(settings.marginBottom)}px`;
  }

  // 3. Free Min-Height
  if (settings.minHeight !== undefined && settings.minHeight !== null) {
    const minH = parseFreeNumber(settings.minHeight);
    if (minH > 0) {
      style.minHeight = `${minH}px`;
    }
  }

  // 4. Border Radius
  const radius = resolveBorderRadius(settings.borderRadius);
  if (radius !== undefined) {
    style.borderRadius = radius;
  }

  // 5. Box Shadow
  const shadow = buildBoxShadowString(settings);
  if (shadow && shadow !== "none") {
    style.boxShadow = shadow;
  }

  // 6. Background Color
  const bg = settings.backgroundColor || settings.bgColor;
  if (bg && typeof bg === "string" && bg !== "transparent") {
    style.backgroundColor = bg;
  }

  // 7. Gap (for grid/flex layouts)
  if (settings.gap !== undefined && settings.gap !== null) {
    const gapNum = parseFreeNumber(settings.gap);
    if (gapNum > 0) {
      style.gap = `${gapNum}px`;
    }
  }

  return style;
}
