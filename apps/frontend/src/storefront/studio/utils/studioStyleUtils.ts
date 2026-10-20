/**
 * Utility functions for storefront studio style computation,
 * free-value conversions, Arabic numeral normalization, shadow formatting,
 * and multi-device responsive overrides resolution (Ticket 2G).
 */

export type StorefrontBreakpoint = "desktop" | "tablet" | "mobile";

/**
 * All styling / layout fields that can be overridden per device (Ticket 2G).
 */
export const RESPONSIVE_STYLE_FIELDS = new Set<string>([
  "paddingTop",
  "paddingBottom",
  "paddingRight",
  "paddingLeft",
  "padding",
  "marginTop",
  "marginBottom",
  "margin",
  "minHeight",
  "borderRadius",
  "gap",
  "shadow",
  "customShadow",
  "shadowX",
  "shadowY",
  "shadowBlur",
  "shadowSpread",
  "shadowOpacity",
  "shadowColor",
  "fontSize",
  "align",
  "textAlign",
  "backgroundColor",
  "bgColor",
  "spacing",
]);

/**
 * Checks if a section settings object has non-empty overrides for a specific device.
 */
export function hasDeviceOverrides(
  settings?: Record<string, any> | null,
  device: "tablet" | "mobile" = "mobile"
): boolean {
  if (!settings) return false;
  const responsive =
    settings.responsive ||
    settings.config?.responsive ||
    settings.settings?.responsive;
  if (!responsive || typeof responsive !== "object") return false;
  const deviceOverrides = responsive[device];
  if (!deviceOverrides || typeof deviceOverrides !== "object") return false;
  return Object.keys(deviceOverrides).some((k) => {
    const val = deviceOverrides[k];
    return val !== undefined && val !== null && val !== "";
  });
}

/**
 * Counts how many style overrides exist for a specific device.
 */
export function getDeviceOverridesCount(
  settings?: Record<string, any> | null,
  device: "tablet" | "mobile" = "mobile"
): number {
  if (!settings) return 0;
  const responsive =
    settings.responsive ||
    settings.config?.responsive ||
    settings.settings?.responsive;
  if (!responsive || typeof responsive !== "object") return 0;
  const deviceOverrides = responsive[device];
  if (!deviceOverrides || typeof deviceOverrides !== "object") return 0;
  return Object.keys(deviceOverrides).filter((k) => {
    const val = deviceOverrides[k];
    return val !== undefined && val !== null && val !== "";
  }).length;
}

/**
 * Resolves effective section settings by merging responsive device overrides
 * onto the base desktop settings according to responsive cascade:
 * - Desktop: base settings
 * - Tablet: base settings merged with responsive.tablet
 * - Mobile: base settings merged with responsive.tablet (if any), then responsive.mobile (highest priority)
 */
export function resolveEffectiveSectionSettings(
  settings?: Record<string, any> | null,
  device: StorefrontBreakpoint | "desktop" | "tablet" | "mobile" = "desktop"
): Record<string, any> {
  if (!settings) return {};

  const effective: Record<string, any> = { ...settings };
  const responsive =
    settings.responsive ||
    settings.config?.responsive ||
    settings.settings?.responsive;

  if (!responsive || typeof responsive !== "object" || device === "desktop") {
    return effective;
  }

  const tabletOverrides = responsive.tablet;
  const mobileOverrides = responsive.mobile;

  if (device === "tablet") {
    if (tabletOverrides && typeof tabletOverrides === "object") {
      Object.entries(tabletOverrides).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          effective[k] = v;
        }
      });
    }
  } else if (device === "mobile") {
    // Mobile inherits from tablet overrides if present
    if (tabletOverrides && typeof tabletOverrides === "object") {
      Object.entries(tabletOverrides).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          effective[k] = v;
        }
      });
    }
    // Mobile overrides take final precedence
    if (mobileOverrides && typeof mobileOverrides === "object") {
      Object.entries(mobileOverrides).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          effective[k] = v;
        }
      });
    }
  }

  return effective;
}

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
 * Supports optional deviceMode for responsive overrides resolution.
 */
export function buildSectionStyle(
  settings?: Record<string, any> | null,
  baseStyle?: React.CSSProperties,
  deviceMode?: StorefrontBreakpoint | "desktop" | "tablet" | "mobile"
): React.CSSProperties {
  if (!settings) return baseStyle || {};

  const effective = deviceMode ? resolveEffectiveSectionSettings(settings, deviceMode) : settings;
  const style: React.CSSProperties = { ...(baseStyle || {}) };

  // 1. Free Padding
  if (effective.paddingTop !== undefined && effective.paddingTop !== null) {
    style.paddingTop = `${parseFreeNumber(effective.paddingTop)}px`;
  } else if (effective.padding !== undefined && effective.padding !== null) {
    style.paddingTop = `${parseFreeNumber(effective.padding)}px`;
  }

  if (effective.paddingBottom !== undefined && effective.paddingBottom !== null) {
    style.paddingBottom = `${parseFreeNumber(effective.paddingBottom)}px`;
  } else if (effective.padding !== undefined && effective.padding !== null) {
    style.paddingBottom = `${parseFreeNumber(effective.padding)}px`;
  }

  if (effective.paddingRight !== undefined && effective.paddingRight !== null) {
    style.paddingRight = `${parseFreeNumber(effective.paddingRight)}px`;
  } else if (effective.padding !== undefined && effective.padding !== null) {
    style.paddingRight = `${parseFreeNumber(effective.padding)}px`;
  }

  if (effective.paddingLeft !== undefined && effective.paddingLeft !== null) {
    style.paddingLeft = `${parseFreeNumber(effective.paddingLeft)}px`;
  } else if (effective.padding !== undefined && effective.padding !== null) {
    style.paddingLeft = `${parseFreeNumber(effective.padding)}px`;
  }

  // 2. Free Margin
  if (effective.marginTop !== undefined && effective.marginTop !== null) {
    style.marginTop = `${parseFreeNumber(effective.marginTop)}px`;
  }
  if (effective.marginBottom !== undefined && effective.marginBottom !== null) {
    style.marginBottom = `${parseFreeNumber(effective.marginBottom)}px`;
  }

  // 3. Free Min-Height
  if (effective.minHeight !== undefined && effective.minHeight !== null) {
    const minH = parseFreeNumber(effective.minHeight);
    if (minH > 0) {
      style.minHeight = `${minH}px`;
    }
  }

  // 4. Border Radius
  const radius = resolveBorderRadius(effective.borderRadius);
  if (radius !== undefined) {
    style.borderRadius = radius;
  }

  // 5. Box Shadow
  const shadow = buildBoxShadowString(effective);
  if (shadow && shadow !== "none") {
    style.boxShadow = shadow;
  }

  // 6. Background Color
  const bg = effective.backgroundColor || effective.bgColor;
  if (bg && typeof bg === "string" && bg !== "transparent") {
    style.backgroundColor = bg;
  }

  // 7. Gap (for grid/flex layouts)
  if (effective.gap !== undefined && effective.gap !== null) {
    const gapNum = parseFreeNumber(effective.gap);
    if (gapNum > 0) {
      style.gap = `${gapNum}px`;
    }
  }

  // 8. Typography / Font Size
  if (effective.fontSize !== undefined && effective.fontSize !== null) {
    const fSize = parseFreeNumber(effective.fontSize);
    if (fSize > 0) {
      style.fontSize = `${fSize}px`;
    }
  }

  // 9. Text Alignment
  if (effective.align || effective.textAlign) {
    const alignVal = effective.align || effective.textAlign;
    if (alignVal === "center" || alignVal === "right" || alignVal === "left" || alignVal === "justify") {
      style.textAlign = alignVal as React.CSSProperties["textAlign"];
    }
  }

  return style;
}
