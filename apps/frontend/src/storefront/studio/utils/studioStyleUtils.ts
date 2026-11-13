/**
 * Utility functions for storefront studio style computation,
 * free-value conversions, Arabic numeral normalization, shadow formatting,
 * and multi-device responsive overrides resolution (Ticket 2G).
 */

import type React from "react";
import type { StudioStyleClass } from "../StudioTypes";
import { buildElementTypographyStyle } from "../../sections/elements/elementTypography";
import {
  buildMediaObjectStyle,
  normalizeObjectFit,
  normalizeObjectPosition,
} from "../../sections/elements/mediaObjectFit";

// Ticket FIT-1: object-fit helpers live with the media elements (sections/),
// re-exported here so the inspector + CSS emitters import from one place.
export {
  buildBackgroundMediaStyle,
  buildMediaObjectStyle,
  hasMediaSource,
  MEDIA_SECTION_TYPES,
  normalizeObjectFit,
  normalizeObjectPosition,
  OBJECT_FIT_VALUES,
  OBJECT_POSITION_PRESET_KEYS,
  OBJECT_POSITION_PRESETS,
} from "../../sections/elements/mediaObjectFit";

export type StorefrontBreakpoint = "desktop" | "tablet" | "mobile";

export interface StudioBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export const DEFAULT_STUDIO_BREAKPOINTS: StudioBreakpoints = {
  mobile: 767,
  tablet: 1024,
  desktop: 1280,
};

export const MIN_BREAKPOINT = 320;
export const MAX_BREAKPOINT = 1920;

export interface BreakpointValidationResult {
  valid: boolean;
  error?: string;
}

export interface ClampFontSizeConfig {
  min: number | string;
  vw: number | string;
  max: number | string;
}

export interface DeviceHiddenOnConfig {
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
}

/**
 * Validates custom responsive breakpoints (Ticket RESP-1).
 * Constraints:
 * - Safe range: 320px to 1920px
 * - Strictly ascending order: mobile < tablet < desktop (rejects intersecting values)
 */
export function validateBreakpoints(
  breakpoints: Partial<StudioBreakpoints> | null | undefined,
  current: StudioBreakpoints = DEFAULT_STUDIO_BREAKPOINTS
): BreakpointValidationResult {
  if (!breakpoints || typeof breakpoints !== "object") {
    return { valid: false, error: "البريكبوينت يجب أن تكون كائناً صحيحاً (Breakpoints must be an object)" };
  }

  const mobile =
    breakpoints.mobile !== undefined ? parseFreeNumber(breakpoints.mobile, NaN) : current.mobile;
  const tablet =
    breakpoints.tablet !== undefined ? parseFreeNumber(breakpoints.tablet, NaN) : current.tablet;
  const desktop =
    breakpoints.desktop !== undefined ? parseFreeNumber(breakpoints.desktop, NaN) : current.desktop;

  if (isNaN(mobile) || isNaN(tablet) || isNaN(desktop)) {
    return { valid: false, error: "قيم نقاط التوقف يجب أن تكون أرقاماً صحيحة" };
  }

  if (mobile < MIN_BREAKPOINT || mobile > MAX_BREAKPOINT) {
    return {
      valid: false,
      error: `بريكبوينت الجوال (${mobile}px) خارج الحدود الآمنة [${MIN_BREAKPOINT}-${MAX_BREAKPOINT}]`,
    };
  }
  if (tablet < MIN_BREAKPOINT || tablet > MAX_BREAKPOINT) {
    return {
      valid: false,
      error: `بريكبوينت التابلت (${tablet}px) خارج الحدود الآمنة [${MIN_BREAKPOINT}-${MAX_BREAKPOINT}]`,
    };
  }
  if (desktop < MIN_BREAKPOINT || desktop > MAX_BREAKPOINT) {
    return {
      valid: false,
      error: `بريكبوينت سطح المكتب (${desktop}px) خارج الحدود الآمنة [${MIN_BREAKPOINT}-${MAX_BREAKPOINT}]`,
    };
  }

  if (mobile >= tablet) {
    return {
      valid: false,
      error: `قيم متقاطعة: بريكبوينت الجوال (${mobile}px) يجب أن تكون أصغر تماماً من التابلت (${tablet}px)`,
    };
  }
  if (tablet >= desktop) {
    return {
      valid: false,
      error: `قيم متقاطعة: بريكبوينت التابلت (${tablet}px) يجب أن تكون أصغر تماماً من سطح المكتب (${desktop}px)`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes and applies breakpoints safely, reverting to current/previous on validation failure.
 */
export function sanitizeBreakpoints(
  incoming: Partial<StudioBreakpoints> | null | undefined,
  current: StudioBreakpoints = DEFAULT_STUDIO_BREAKPOINTS
): { breakpoints: StudioBreakpoints; error?: string } {
  const result = validateBreakpoints(incoming, current);
  if (!result.valid) {
    return { breakpoints: current, error: result.error };
  }
  return {
    breakpoints: {
      mobile: parseFreeNumber(incoming?.mobile, current.mobile),
      tablet: parseFreeNumber(incoming?.tablet, current.tablet),
      desktop: parseFreeNumber(incoming?.desktop, current.desktop),
    },
  };
}

/**
 * Formats min/vw/max parameters into standard CSS clamp() syntax (Ticket RESP-1).
 * e.g. { min: 18, vw: 2.5, max: 32 } -> "clamp(18px, 2.5vw, 32px)"
 */
export function formatClampFontSize(
  clamp?: ClampFontSizeConfig | string | null
): string | null {
  if (!clamp) return null;
  if (typeof clamp === "string") {
    const trimmed = clamp.trim();
    if (trimmed.startsWith("clamp(")) return trimmed;
    return null;
  }
  if (typeof clamp !== "object") return null;

  const minRaw = clamp.min;
  const vwRaw = clamp.vw;
  const maxRaw = clamp.max;

  if (minRaw === undefined || vwRaw === undefined || maxRaw === undefined) {
    return null;
  }

  const formatPart = (val: number | string, defaultUnit: string): string => {
    if (typeof val === "number") return `${val}${defaultUnit}`;
    const str = normalizeArabicDigits(String(val)).trim();
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      return `${str}${defaultUnit}`;
    }
    return str;
  };

  const minStr = formatPart(minRaw, "px");
  const vwStr = formatPart(vwRaw, "vw");
  const maxStr = formatPart(maxRaw, "px");

  return `clamp(${minStr}, ${vwStr}, ${maxStr})`;
}

/**
 * Resolves font size to either a px value or a clamp() string.
 */
export function resolveFontSizeValue(value: any): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") {
    const clampStr = formatClampFontSize(value);
    if (clampStr) return clampStr;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("clamp(")) return trimmed;
    const num = parseFreeNumber(trimmed, NaN);
    if (!isNaN(num) && num > 0) return `${num}px`;
    return trimmed;
  }
  if (typeof value === "number" && value > 0) {
    return `${value}px`;
  }
  return undefined;
}

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
  "contentAlign",
  "backgroundColor",
  "bgColor",
  "spacing",
  "border",
  "borders",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderRadiusTopLeft",
  "borderRadiusTopRight",
  "borderRadiusBottomRight",
  "borderRadiusBottomLeft",
  "overlay",
  "overlayColor",
  "overlayOpacity",
  "opacity",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "zIndex",
  "transform",
  "rotate",
  "scale",
  "translateX",
  "translateY",
  "overflow",
  "overflowX",
  "overflowY",
  "aspectRatio",
  "objectFit",
  "objectPosition",
  "hiddenOn",
  "breakpoints",
]);

/**
 * The core 9 Per-Breakpoint styling properties targeted by Ticket 5R:
 * paddingTop, paddingBottom, paddingLeft, paddingRight,
 * marginTop, marginBottom, borderRadius, fontSize, contentAlign.
 */
export const PER_BREAKPOINT_PROPERTIES = [
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "marginTop",
  "marginBottom",
  "borderRadius",
  "fontSize",
  "contentAlign",
] as const;

export type PerBreakpointProperty = (typeof PER_BREAKPOINT_PROPERTIES)[number];

/**
 * Checks if a specific property is overridden for a specific device.
 */
export function isPropertyOverridden(
  settings?: Record<string, any> | null,
  property?: string | null,
  device: "tablet" | "mobile" = "mobile"
): boolean {
  if (!settings || !property) return false;
  const responsive =
    settings.responsive ||
    settings.config?.responsive ||
    settings.settings?.responsive;
  if (!responsive || typeof responsive !== "object") return false;
  const deviceOverrides = responsive[device];
  if (!deviceOverrides || typeof deviceOverrides !== "object") return false;
  const val = deviceOverrides[property];
  return val !== undefined && val !== null && val !== "";
}

/**
 * Gets the raw overridden value of a property for a device, if any.
 */
export function getPropertyOverrideValue(
  settings?: Record<string, any> | null,
  property?: string | null,
  device: "tablet" | "mobile" = "mobile"
): any {
  if (!settings || !property) return undefined;
  const responsive =
    settings.responsive ||
    settings.config?.responsive ||
    settings.settings?.responsive;
  if (!responsive || typeof responsive !== "object") return undefined;
  const deviceOverrides = responsive[device];
  if (!deviceOverrides || typeof deviceOverrides !== "object") return undefined;
  return deviceOverrides[property];
}

/**
 * Checks if a section settings object has non-empty overrides for a specific device.
 */
export function hasDeviceOverrides(
  settings?: Record<string, any> | null,
  device: "tablet" | "mobile" = "mobile"
): boolean {
  if (!settings) return false;
  const hiddenOn =
    settings.hiddenOn ||
    settings.config?.hiddenOn ||
    settings.settings?.hiddenOn;
  if (hiddenOn && typeof hiddenOn === "object" && hiddenOn[device]) {
    return true;
  }
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
/**
 * Normalizes an aspect ratio setting into standard CSS aspect-ratio syntax.
 * Converts "16:9" -> "16/9", "4:3" -> "4/3", "1:1" -> "1/1".
 */
export function normalizeAspectRatio(value: any): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const str = String(value).trim();
  if (str === "auto") return "auto";
  return str.replace(/\s*:\s*/g, "/");
}

/**
 * Builds CSS transform string from rotate, scale, and translate parameters or custom transform string.
 */
export function buildTransformString(config?: Record<string, any> | null): string | undefined {
  if (!config || typeof config !== "object") return undefined;
  if (config.transform && typeof config.transform === "string" && config.transform.trim() !== "") {
    return config.transform.trim();
  }
  const parts: string[] = [];
  if (config.rotate !== undefined && config.rotate !== null && config.rotate !== "" && Number(config.rotate) !== 0) {
    const r = parseFreeNumber(config.rotate);
    parts.push(`rotate(${r}deg)`);
  }
  if (config.scale !== undefined && config.scale !== null && config.scale !== "" && Number(config.scale) !== 1) {
    const s = parseFreeNumber(config.scale, 1);
    parts.push(`scale(${s})`);
  }
  const tx = config.translateX !== undefined && config.translateX !== null && config.translateX !== "" ? parseFreeNumber(config.translateX) : 0;
  const ty = config.translateY !== undefined && config.translateY !== null && config.translateY !== "" ? parseFreeNumber(config.translateY) : 0;
  if (tx !== 0 || ty !== 0) {
    parts.push(`translate(${tx}px, ${ty}px)`);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/**
 * Converts overlay settings (overlayColor, overlayOpacity) to rgba string.
 */
export function buildOverlayString(settings?: Record<string, any> | null): string | undefined {
  if (!settings || typeof settings !== "object") return undefined;
  const overlay = settings.overlay;
  if (typeof overlay === "string" && overlay.trim() !== "" && overlay !== "none") {
    return overlay.trim();
  }
  const color = settings.overlayColor || (typeof overlay === "object" ? overlay?.color : undefined);
  const rawOpacity = settings.overlayOpacity !== undefined
    ? settings.overlayOpacity
    : typeof overlay === "object"
    ? overlay?.opacity
    : undefined;

  if (color && rawOpacity !== undefined && rawOpacity !== null && rawOpacity !== "") {
    const opacityNum = Math.max(0, Math.min(1, parseFreeNumber(rawOpacity, 0)));
    if (opacityNum > 0) {
      return hexToRgba(color, opacityNum);
    }
  }
  return undefined;
}

/**
 * Builds pure CSS declaration strings for borders per side.
 * e.g. { top: 2, bottom: 0, left: 4, right: 0, color: '#f00' }
 * -> ["border-top: 2px solid #f00;", "border-left: 4px solid #f00;"]
 * Omits sides with 0 or undefined width.
 */
export function buildBorderDeclarations(borders?: Record<string, any> | null): string[] {
  if (!borders || typeof borders !== "object") return [];
  const decls: string[] = [];

  const color = borders.color || borders.borderColor || "#000000";
  const style = borders.style || borders.borderStyle || "solid";

  const top =
    borders.top !== undefined
      ? parseFreeNumber(borders.top, 0)
      : borders.borderTopWidth !== undefined
      ? parseFreeNumber(borders.borderTopWidth, 0)
      : borders.borderTop !== undefined
      ? parseFreeNumber(borders.borderTop, 0)
      : undefined;

  const right =
    borders.right !== undefined
      ? parseFreeNumber(borders.right, 0)
      : borders.borderRightWidth !== undefined
      ? parseFreeNumber(borders.borderRightWidth, 0)
      : borders.borderRight !== undefined
      ? parseFreeNumber(borders.borderRight, 0)
      : undefined;

  const bottom =
    borders.bottom !== undefined
      ? parseFreeNumber(borders.bottom, 0)
      : borders.borderBottomWidth !== undefined
      ? parseFreeNumber(borders.borderBottomWidth, 0)
      : borders.borderBottom !== undefined
      ? parseFreeNumber(borders.borderBottom, 0)
      : undefined;

  const left =
    borders.left !== undefined
      ? parseFreeNumber(borders.left, 0)
      : borders.borderLeftWidth !== undefined
      ? parseFreeNumber(borders.borderLeftWidth, 0)
      : borders.borderLeft !== undefined
      ? parseFreeNumber(borders.borderLeft, 0)
      : undefined;

  if (top !== undefined && top > 0) {
    decls.push(`border-top: ${top}px ${style} ${color};`);
  }
  if (right !== undefined && right > 0) {
    decls.push(`border-right: ${right}px ${style} ${color};`);
  }
  if (bottom !== undefined && bottom > 0) {
    decls.push(`border-bottom: ${bottom}px ${style} ${color};`);
  }
  if (left !== undefined && left > 0) {
    decls.push(`border-left: ${left}px ${style} ${color};`);
  }

  // If uniform borderWidth is specified without sides
  if (top === undefined && right === undefined && bottom === undefined && left === undefined) {
    const uniform =
      borders.borderWidth !== undefined
        ? parseFreeNumber(borders.borderWidth, 0)
        : borders.width !== undefined
        ? parseFreeNumber(borders.width, 0)
        : undefined;
    if (uniform !== undefined && uniform > 0) {
      decls.push(`border: ${uniform}px ${style} ${color};`);
    }
  }

  return decls;
}

/**
 * Builds React CSSProperties for borders per side.
 */
export function buildBorderStyle(borders?: Record<string, any> | null): React.CSSProperties {
  if (!borders || typeof borders !== "object") return {};
  const style: React.CSSProperties = {};
  const color = borders.color || borders.borderColor || "#000000";
  const bStyle = borders.style || borders.borderStyle || "solid";

  const top =
    borders.top !== undefined
      ? parseFreeNumber(borders.top, 0)
      : borders.borderTopWidth !== undefined
      ? parseFreeNumber(borders.borderTopWidth, 0)
      : borders.borderTop !== undefined
      ? parseFreeNumber(borders.borderTop, 0)
      : undefined;

  const right =
    borders.right !== undefined
      ? parseFreeNumber(borders.right, 0)
      : borders.borderRightWidth !== undefined
      ? parseFreeNumber(borders.borderRightWidth, 0)
      : borders.borderRight !== undefined
      ? parseFreeNumber(borders.borderRight, 0)
      : undefined;

  const bottom =
    borders.bottom !== undefined
      ? parseFreeNumber(borders.bottom, 0)
      : borders.borderBottomWidth !== undefined
      ? parseFreeNumber(borders.borderBottomWidth, 0)
      : borders.borderBottom !== undefined
      ? parseFreeNumber(borders.borderBottom, 0)
      : undefined;

  const left =
    borders.left !== undefined
      ? parseFreeNumber(borders.left, 0)
      : borders.borderLeftWidth !== undefined
      ? parseFreeNumber(borders.borderLeftWidth, 0)
      : borders.borderLeft !== undefined
      ? parseFreeNumber(borders.borderLeft, 0)
      : undefined;

  if (top !== undefined && top > 0) {
    style.borderTop = `${top}px ${bStyle} ${color}`;
  }
  if (right !== undefined && right > 0) {
    style.borderRight = `${right}px ${bStyle} ${color}`;
  }
  if (bottom !== undefined && bottom > 0) {
    style.borderBottom = `${bottom}px ${bStyle} ${color}`;
  }
  if (left !== undefined && left > 0) {
    style.borderLeft = `${left}px ${bStyle} ${color}`;
  }

  if (top === undefined && right === undefined && bottom === undefined && left === undefined) {
    const uniform =
      borders.borderWidth !== undefined
        ? parseFreeNumber(borders.borderWidth, 0)
        : borders.width !== undefined
        ? parseFreeNumber(borders.width, 0)
        : undefined;
    if (uniform !== undefined && uniform > 0) {
      style.border = `${uniform}px ${bStyle} ${color}`;
    }
  }

  return style;
}

export function buildSectionStyle(
  settings?: Record<string, any> | null,
  baseStyle?: React.CSSProperties,
  deviceMode?: StorefrontBreakpoint | "desktop" | "tablet" | "mobile",
  classes?: StudioStyleClass[]
): React.CSSProperties {
  if (!settings) return baseStyle || {};

  const resolvedClasses = classes || (Array.isArray(settings.classes) ? (settings.classes as StudioStyleClass[]) : undefined);
  const settingsWithClasses = resolvedClasses ? mergeClassStyle(settings, resolvedClasses) : settings;
  const effective = deviceMode ? resolveEffectiveSectionSettings(settingsWithClasses, deviceMode) : settingsWithClasses;
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
    const fVal = resolveFontSizeValue(effective.fontSize);
    if (fVal) {
      style.fontSize = fVal;
    }
  }

  // 9. Text Alignment / Content Alignment
  const alignVal = effective.contentAlign || effective.align || effective.textAlign;
  if (alignVal) {
    if (alignVal === "start") {
      style.textAlign = "start";
    } else if (alignVal === "end") {
      style.textAlign = "end";
    } else
    if (alignVal === "center" || alignVal === "right" || alignVal === "left" || alignVal === "justify") {
      style.textAlign = alignVal as React.CSSProperties["textAlign"];
    }
  }

  // 10. Text Color
  if (effective.color && typeof effective.color === "string") {
    style.color = effective.color === "accent" ? "var(--store-accent, #2563eb)" : effective.color;
  }

  // 11. Borders per side (Ticket LAYOUT-1)
  const borderObj = effective.border || effective.borders || effective;
  const borderStyles = buildBorderStyle(borderObj);
  Object.assign(style, borderStyles);

  // 12. Corner Radii per corner
  if (effective.borderRadiusTopLeft !== undefined) {
    const r = resolveBorderRadius(effective.borderRadiusTopLeft);
    if (r) style.borderTopLeftRadius = r;
  }
  if (effective.borderRadiusTopRight !== undefined) {
    const r = resolveBorderRadius(effective.borderRadiusTopRight);
    if (r) style.borderTopRightRadius = r;
  }
  if (effective.borderRadiusBottomRight !== undefined) {
    const r = resolveBorderRadius(effective.borderRadiusBottomRight);
    if (r) style.borderBottomRightRadius = r;
  }
  if (effective.borderRadiusBottomLeft !== undefined) {
    const r = resolveBorderRadius(effective.borderRadiusBottomLeft);
    if (r) style.borderBottomLeftRadius = r;
  }

  // 13. Position, insets & zIndex
  if (effective.position) {
    style.position = effective.position as React.CSSProperties["position"];
  }
  if (effective.top !== undefined && effective.top !== null && effective.top !== "") {
    style.top = typeof effective.top === "number" ? `${effective.top}px` : effective.top;
  }
  if (effective.right !== undefined && effective.right !== null && effective.right !== "") {
    style.right = typeof effective.right === "number" ? `${effective.right}px` : effective.right;
  }
  if (effective.bottom !== undefined && effective.bottom !== null && effective.bottom !== "") {
    style.bottom = typeof effective.bottom === "number" ? `${effective.bottom}px` : effective.bottom;
  }
  if (effective.left !== undefined && effective.left !== null && effective.left !== "") {
    style.left = typeof effective.left === "number" ? `${effective.left}px` : effective.left;
  }
  if (effective.zIndex !== undefined && effective.zIndex !== null && effective.zIndex !== "") {
    style.zIndex = Number(effective.zIndex);
  }

  // 14. Transform
  const transformStr = buildTransformString(effective);
  if (transformStr) {
    style.transform = transformStr;
  }

  // 15. Aspect Ratio & Overflow
  if (effective.aspectRatio) {
    const ar = normalizeAspectRatio(effective.aspectRatio);
    if (ar && ar !== "auto") {
      (style as any).aspectRatio = ar;
    }
  }
  if (effective.overflow) {
    style.overflow = effective.overflow as React.CSSProperties["overflow"];
  }
  if (effective.overflowX) {
    style.overflowX = effective.overflowX as React.CSSProperties["overflowX"];
  }
  if (effective.overflowY) {
    style.overflowY = effective.overflowY as React.CSSProperties["overflowY"];
  }

  // 15b. Media object-fit / object-position (Ticket FIT-1).
  // Only applied when explicitly configured so default media rendering is untouched.
  const mediaObjectStyle = buildMediaObjectStyle(effective);
  if (mediaObjectStyle.objectFit) {
    style.objectFit = mediaObjectStyle.objectFit as React.CSSProperties["objectFit"];
  }
  if (mediaObjectStyle.objectPosition) {
    style.objectPosition = mediaObjectStyle.objectPosition;
  }

  // 16. Opacity
  if (effective.opacity !== undefined && effective.opacity !== null && effective.opacity !== "") {
    style.opacity = Math.max(0, Math.min(1, parseFreeNumber(effective.opacity, 1)));
  }

  // 17. Overlay
  const overlayRgba = buildOverlayString(effective);
  if (overlayRgba) {
    (style as any)["--sf-overlay"] = overlayRgba;
    if (!style.backgroundImage) {
      style.backgroundImage = `linear-gradient(${overlayRgba}, ${overlayRgba})`;
    } else {
      style.backgroundImage = `linear-gradient(${overlayRgba}, ${overlayRgba}), ${style.backgroundImage}`;
    }
  }

  return style;
}

export interface GenerateResponsiveCssOptions {
  tabletMin?: number;
  tabletMax?: number;
  mobileMax?: number;
  desktopMin?: number;
  breakpoints?: Partial<StudioBreakpoints>;
  /**
   * Ticket FIT-1: selector used for `object-fit` / `object-position`
   * declarations. Those properties only affect replaced content, so they are
   * emitted against descendant media (`<img>` / `<video>`) instead of the
   * section wrapper. Defaults to `${selector} img, ${selector} video`.
   */
  mediaSelector?: string;
}

/**
 * Sanitizes free-form CSS property values to prevent `<style>` tag breakout or rule injection.
 */
const sanitizeCssValue = (val: unknown): string =>
  String(val ?? "")
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/[{}]/g, "")
    .trim();

/**
 * Generates pure CSS media query declarations for responsive style overrides
 * (Ticket 5R / 5B pattern) + device visibility and custom breakpoints (Ticket RESP-1).
 * Cascades: base -> tablet -> mobile.
 */
export function generateResponsiveCss(
  settings?: Record<string, any> | null,
  selector?: string | null,
  options: GenerateResponsiveCssOptions = {}
): string | null {
  if (!settings || !selector) return null;

  const hiddenOn =
    settings.hiddenOn ||
    settings.config?.hiddenOn ||
    settings.settings?.hiddenOn;

  const customBreakpoints =
    settings.breakpoints ||
    settings.config?.breakpoints ||
    settings.settings?.breakpoints ||
    options.breakpoints;

  const responsive =
    settings.responsive ||
    settings.config?.responsive ||
    settings.settings?.responsive;

  const tabletOverrides = responsive && typeof responsive === "object" ? responsive.tablet : undefined;
  const mobileOverrides = responsive && typeof responsive === "object" ? responsive.mobile : undefined;

  const hasTabletOverrides = Boolean(
    tabletOverrides &&
      typeof tabletOverrides === "object" &&
      Object.keys(tabletOverrides).length > 0
  );
  const hasMobileOverrides = Boolean(
    mobileOverrides &&
      typeof mobileOverrides === "object" &&
      Object.keys(mobileOverrides).length > 0
  );

  const isHiddenMobile = Boolean(hiddenOn?.mobile === true);
  const isHiddenTablet = Boolean(hiddenOn?.tablet === true);
  const isHiddenDesktop = Boolean(hiddenOn?.desktop === true);

  const hasTablet = hasTabletOverrides || isHiddenTablet;
  const hasMobile = hasMobileOverrides || isHiddenMobile;
  const hasDesktop = isHiddenDesktop;

  // Ticket FIT-1: object-fit / object-position only affect replaced content, so
  // they are emitted against descendant media rather than the section wrapper.
  const mediaSelector = options.mediaSelector || `${selector} img, ${selector} video`;

  const buildObjectDeclarations = (
    source: Record<string, any> | null | undefined,
    important: boolean
  ): string[] => {
    if (!source || typeof source !== "object") return [];
    const decls: string[] = [];
    const fit = normalizeObjectFit(source["objectFit"]);
    if (fit) {
      decls.push(`object-fit: ${fit}${important ? " !important" : ""};`);
    }
    const position = normalizeObjectPosition(source["objectPosition"]);
    if (position) {
      decls.push(`object-position: ${position}${important ? " !important" : ""};`);
    }
    return decls;
  };

  // Base (desktop) media rule — emitted even when no responsive overrides exist
  // so a merchant-set object-fit reaches the live storefront.
  const baseObjectDecls = buildObjectDeclarations(settings, false);
  const baseObjectRule =
    baseObjectDecls.length > 0
      ? `${mediaSelector} {\n  ${baseObjectDecls.join("\n  ")}\n}`
      : null;

  if (!hasTablet && !hasMobile && !hasDesktop) return baseObjectRule;

  let mobileMax: number = options.mobileMax ?? (hiddenOn ? 767 : 767.98);
  let tabletMin: number = options.tabletMin ?? 768;
  let tabletMax: number = options.tabletMax ?? 1023.98;
  let desktopMin: number = options.desktopMin ?? 1024;

  if (customBreakpoints && typeof customBreakpoints === "object") {
    if (customBreakpoints.mobile !== undefined) {
      mobileMax = parseFreeNumber(customBreakpoints.mobile, mobileMax);
      tabletMin = mobileMax + 1;
    }
    if (customBreakpoints.tablet !== undefined) {
      tabletMax = parseFreeNumber(customBreakpoints.tablet, tabletMax);
      desktopMin = tabletMax + 1;
    }
    if (customBreakpoints.desktop !== undefined) {
      if (customBreakpoints.tablet === undefined) {
        desktopMin = parseFreeNumber(customBreakpoints.desktop, desktopMin);
      }
    }
  }

  const buildDeclarations = (
    device: "tablet" | "mobile"
  ): { decls: string[]; objectDecls: string[] } => {
    const effective = resolveEffectiveSectionSettings(settings, device);
    const decls: string[] = [];

    // Device hide (Ticket RESP-1)
    if (device === "mobile" && isHiddenMobile) {
      decls.push("display: none !important;");
    }
    if (device === "tablet" && isHiddenTablet) {
      decls.push("display: none !important;");
    }

    // Padding
    if (effective.paddingTop !== undefined && effective.paddingTop !== null) {
      decls.push(`padding-top: ${parseFreeNumber(effective.paddingTop)}px !important;`);
    } else if (effective.padding !== undefined && effective.padding !== null) {
      decls.push(`padding-top: ${parseFreeNumber(effective.padding)}px !important;`);
    }

    if (effective.paddingBottom !== undefined && effective.paddingBottom !== null) {
      decls.push(`padding-bottom: ${parseFreeNumber(effective.paddingBottom)}px !important;`);
    } else if (effective.padding !== undefined && effective.padding !== null) {
      decls.push(`padding-bottom: ${parseFreeNumber(effective.padding)}px !important;`);
    }

    if (effective.paddingLeft !== undefined && effective.paddingLeft !== null) {
      decls.push(`padding-left: ${parseFreeNumber(effective.paddingLeft)}px !important;`);
    } else if (effective.padding !== undefined && effective.padding !== null) {
      decls.push(`padding-left: ${parseFreeNumber(effective.padding)}px !important;`);
    }

    if (effective.paddingRight !== undefined && effective.paddingRight !== null) {
      decls.push(`padding-right: ${parseFreeNumber(effective.paddingRight)}px !important;`);
    } else if (effective.padding !== undefined && effective.padding !== null) {
      decls.push(`padding-right: ${parseFreeNumber(effective.padding)}px !important;`);
    }

    // Margin
    if (effective.marginTop !== undefined && effective.marginTop !== null) {
      decls.push(`margin-top: ${parseFreeNumber(effective.marginTop)}px !important;`);
    }
    if (effective.marginBottom !== undefined && effective.marginBottom !== null) {
      decls.push(`margin-bottom: ${parseFreeNumber(effective.marginBottom)}px !important;`);
    }

    // Border Radius
    const radius = resolveBorderRadius(effective.borderRadius);
    if (radius !== undefined) {
      decls.push(`border-radius: ${radius} !important;`);
    }

    // Font Size (with clamp support)
    if (effective.fontSize !== undefined && effective.fontSize !== null) {
      const fVal = resolveFontSizeValue(effective.fontSize);
      if (fVal) {
        decls.push(`font-size: ${fVal} !important;`);
      }
    }

    // Content Alignment / Text Alignment
    const align = effective.contentAlign || effective.align || effective.textAlign;
    if (align) {
      if (align === "center" || align === "right" || align === "left" || align === "justify") {
        decls.push(`text-align: ${align} !important;`);
      } else if (align === "start") {
        decls.push(`text-align: start !important;`);
      } else if (align === "end") {
        decls.push(`text-align: end !important;`);
      }
    }

    // Borders (LAYOUT-1)
    const borderObj = effective.border || effective.borders || effective;
    const borderDecls = buildBorderDeclarations(borderObj);
    borderDecls.forEach((d) => {
      decls.push(d.replace(";", " !important;"));
    });

    // Corner Radii per corner
    if (effective.borderRadiusTopLeft !== undefined) {
      const r = resolveBorderRadius(effective.borderRadiusTopLeft);
      if (r) decls.push(`border-top-left-radius: ${r} !important;`);
    }
    if (effective.borderRadiusTopRight !== undefined) {
      const r = resolveBorderRadius(effective.borderRadiusTopRight);
      if (r) decls.push(`border-top-right-radius: ${r} !important;`);
    }
    if (effective.borderRadiusBottomRight !== undefined) {
      const r = resolveBorderRadius(effective.borderRadiusBottomRight);
      if (r) decls.push(`border-bottom-right-radius: ${r} !important;`);
    }
    if (effective.borderRadiusBottomLeft !== undefined) {
      const r = resolveBorderRadius(effective.borderRadiusBottomLeft);
      if (r) decls.push(`border-bottom-left-radius: ${r} !important;`);
    }

    // Position & Insets
    if (effective.position) {
      const safePos = sanitizeCssValue(effective.position);
      if (safePos) decls.push(`position: ${safePos} !important;`);
    }
    if (effective.top !== undefined && effective.top !== null && effective.top !== "") {
      const safeTop = typeof effective.top === "number" ? `${effective.top}px` : sanitizeCssValue(effective.top);
      if (safeTop) decls.push(`top: ${safeTop} !important;`);
    }
    if (effective.right !== undefined && effective.right !== null && effective.right !== "") {
      const safeRight = typeof effective.right === "number" ? `${effective.right}px` : sanitizeCssValue(effective.right);
      if (safeRight) decls.push(`right: ${safeRight} !important;`);
    }
    if (effective.bottom !== undefined && effective.bottom !== null && effective.bottom !== "") {
      const safeBottom = typeof effective.bottom === "number" ? `${effective.bottom}px` : sanitizeCssValue(effective.bottom);
      if (safeBottom) decls.push(`bottom: ${safeBottom} !important;`);
    }
    if (effective.left !== undefined && effective.left !== null && effective.left !== "") {
      const safeLeft = typeof effective.left === "number" ? `${effective.left}px` : sanitizeCssValue(effective.left);
      if (safeLeft) decls.push(`left: ${safeLeft} !important;`);
    }
    if (effective.zIndex !== undefined && effective.zIndex !== null && effective.zIndex !== "") {
      const safeZ = sanitizeCssValue(effective.zIndex);
      if (safeZ) decls.push(`z-index: ${safeZ} !important;`);
    }

    // Transform
    const transformStr = buildTransformString(effective);
    if (transformStr) {
      decls.push(`transform: ${sanitizeCssValue(transformStr)} !important;`);
    }

    // Aspect Ratio & Overflow
    if (effective.aspectRatio) {
      const ar = normalizeAspectRatio(effective.aspectRatio);
      if (ar && ar !== "auto") {
        decls.push(`aspect-ratio: ${sanitizeCssValue(ar)} !important;`);
      }
    }
    if (effective.overflow) {
      const safeOverflow = sanitizeCssValue(effective.overflow);
      if (safeOverflow) decls.push(`overflow: ${safeOverflow} !important;`);
    }
    if (effective.overflowX) {
      const safeOverflowX = sanitizeCssValue(effective.overflowX);
      if (safeOverflowX) decls.push(`overflow-x: ${safeOverflowX} !important;`);
    }
    if (effective.overflowY) {
      const safeOverflowY = sanitizeCssValue(effective.overflowY);
      if (safeOverflowY) decls.push(`overflow-y: ${safeOverflowY} !important;`);
    }

    // Opacity
    if (effective.opacity !== undefined && effective.opacity !== null && effective.opacity !== "") {
      decls.push(`opacity: ${Math.max(0, Math.min(1, parseFreeNumber(effective.opacity, 1)))} !important;`);
    }

    // Media object-fit / object-position (Ticket FIT-1)
    const objectDecls = buildObjectDeclarations(effective, true);

    return { decls, objectDecls };
  };

  const rules: string[] = [];

  if (hasDesktop && isHiddenDesktop) {
    rules.push(
      `@media (min-width: ${desktopMin}px) {\n  ${selector} {\n    display: none !important;\n  }\n}`
    );
  }

  const buildDeviceRule = (
    query: string,
    device: "tablet" | "mobile"
  ): string | null => {
    const { decls, objectDecls } = buildDeclarations(device);
    const blocks: string[] = [];
    if (decls.length > 0) {
      blocks.push(`${selector} {\n    ${decls.join("\n    ")}\n  }`);
    }
    if (objectDecls.length > 0) {
      blocks.push(`${mediaSelector} {\n    ${objectDecls.join("\n    ")}\n  }`);
    }
    if (blocks.length === 0) return null;
    return `@media ${query} {\n  ${blocks.join("\n  ")}\n}`;
  };

  if (hasTablet) {
    const tabletRule = buildDeviceRule(
      `(min-width: ${tabletMin}px) and (max-width: ${tabletMax}px)`,
      "tablet"
    );
    if (tabletRule) rules.push(tabletRule);
  }

  if (hasMobile) {
    const mobileRule = buildDeviceRule(`(max-width: ${mobileMax}px)`, "mobile");
    if (mobileRule) rules.push(mobileRule);
  }

  const chunks = [baseObjectRule, ...rules].filter(Boolean) as string[];
  return chunks.length > 0 ? chunks.join("\n") : null;
}

/**
 * Converts a style/settings object into an array of clean CSS declaration strings.
 */
export function styleObjectToCssDeclarations(styleObj?: Record<string, any> | null): string[] {
  const isDirectBorderConfig =
    styleObj &&
    typeof styleObj === "object" &&
    !styleObj["position"] &&
    (styleObj["top"] !== undefined || styleObj["left"] !== undefined || styleObj["right"] !== undefined || styleObj["bottom"] !== undefined) &&
    (styleObj["color"] !== undefined || styleObj["borderColor"] !== undefined || styleObj["style"] !== undefined || styleObj["borderStyle"] !== undefined);
  if (isDirectBorderConfig) return buildBorderDeclarations(styleObj);
  if (!styleObj || typeof styleObj !== "object") return [];
  const decls: string[] = [];

  for (const [key, rawVal] of Object.entries(styleObj)) {
    if (rawVal === undefined || rawVal === null || rawVal === "") continue;
    if (["id", "name", "classId", "customClass", "type", "key", "sectionKey", "classes", "states", "responsive"].includes(key)) {
      continue;
    }

    if (key === "border" || key === "borders") {
      const bDecls = buildBorderDeclarations(rawVal);
      decls.push(...bDecls);
    } else if (key === "position") {
      const safeVal = sanitizeCssValue(rawVal);
      if (safeVal) decls.push(`position: ${safeVal};`);
    } else if (key === "top" || key === "right" || key === "bottom" || key === "left") {
      const formattedVal = typeof rawVal === "number" ? `${rawVal}px` : sanitizeCssValue(rawVal);
      if (formattedVal) decls.push(`${key}: ${formattedVal};`);
    } else if (key === "zIndex" || key === "z-index") {
      const safeVal = sanitizeCssValue(rawVal);
      if (safeVal) decls.push(`z-index: ${safeVal};`);
    } else if (key === "aspectRatio" || key === "aspect-ratio") {
      const norm = normalizeAspectRatio(rawVal);
      if (norm) decls.push(`aspect-ratio: ${sanitizeCssValue(norm)};`);
    } else if (key === "overflow") {
      const safeVal = sanitizeCssValue(rawVal);
      if (safeVal) decls.push(`overflow: ${safeVal};`);
    } else if (key === "overflowX" || key === "overflow-x") {
      const safeVal = sanitizeCssValue(rawVal);
      if (safeVal) decls.push(`overflow-x: ${safeVal};`);
    } else if (key === "overflowY" || key === "overflow-y") {
      const safeVal = sanitizeCssValue(rawVal);
      if (safeVal) decls.push(`overflow-y: ${safeVal};`);
    } else if (key === "objectFit" || key === "object-fit") {
      // Ticket FIT-1: only emit when a valid value is configured.
      const fit = normalizeObjectFit(rawVal);
      if (fit) decls.push(`object-fit: ${fit};`);
    } else if (key === "objectPosition" || key === "object-position") {
      const position = normalizeObjectPosition(rawVal);
      if (position) decls.push(`object-position: ${position};`);
    } else if (key === "overlay") {
      const ov = buildOverlayString(styleObj);
      if (ov) decls.push(`--sf-overlay: ${ov};`);
    } else if (key === "borderTop" || key === "borderTopWidth") {
      const w = parseFreeNumber(rawVal, 0);
      if (w > 0) decls.push(`border-top: ${w}px ${styleObj["borderStyle"] || "solid"} ${styleObj["borderColor"] || styleObj["color"] || "#000000"};`);
    } else if (key === "borderRight" || key === "borderRightWidth") {
      const w = parseFreeNumber(rawVal, 0);
      if (w > 0) decls.push(`border-right: ${w}px ${styleObj["borderStyle"] || "solid"} ${styleObj["borderColor"] || styleObj["color"] || "#000000"};`);
    } else if (key === "borderBottom" || key === "borderBottomWidth") {
      const w = parseFreeNumber(rawVal, 0);
      if (w > 0) decls.push(`border-bottom: ${w}px ${styleObj["borderStyle"] || "solid"} ${styleObj["borderColor"] || styleObj["color"] || "#000000"};`);
    } else if (key === "borderLeft" || key === "borderLeftWidth") {
      const w = parseFreeNumber(rawVal, 0);
      if (w > 0) decls.push(`border-left: ${w}px ${styleObj["borderStyle"] || "solid"} ${styleObj["borderColor"] || styleObj["color"] || "#000000"};`);
    } else if (key === "borderRadiusTopLeft" || key === "borderTopLeftRadius") {
      const r = resolveBorderRadius(rawVal);
      if (r) decls.push(`border-top-left-radius: ${r};`);
    } else if (key === "borderRadiusTopRight" || key === "borderTopRightRadius") {
      const r = resolveBorderRadius(rawVal);
      if (r) decls.push(`border-top-right-radius: ${r};`);
    } else if (key === "borderRadiusBottomRight" || key === "borderBottomRightRadius") {
      const r = resolveBorderRadius(rawVal);
      if (r) decls.push(`border-bottom-right-radius: ${r};`);
    } else if (key === "borderRadiusBottomLeft" || key === "borderBottomLeftRadius") {
      const r = resolveBorderRadius(rawVal);
      if (r) decls.push(`border-bottom-left-radius: ${r};`);
    } else if (key === "backgroundColor" || key === "bgColor") {
      decls.push(`background-color: ${rawVal};`);
    } else if (key === "color") {
      decls.push(`color: ${rawVal};`);
    } else if (key === "borderColor") {
      decls.push(`border-color: ${rawVal};`);
    } else if (key === "borderWidth") {
      decls.push(`border-width: ${typeof rawVal === "number" ? `${rawVal}px` : rawVal};`);
    } else if (key === "borderStyle") {
      decls.push(`border-style: ${rawVal};`);
    } else if (key === "borderRadius") {
      const r = resolveBorderRadius(rawVal);
      if (r) decls.push(`border-radius: ${r};`);
    } else if (key === "shadow" || key === "boxShadow") {
      if (typeof rawVal === "string" && rawVal !== "custom") {
        const shadowStr =
          rawVal === "none"
            ? "none"
            : rawVal === "soft"
            ? "0px 4px 12px 0px rgba(0, 0, 0, 0.06)"
            : rawVal === "card"
            ? "0px 10px 25px -5px rgba(0, 0, 0, 0.1), 0px 8px 10px -6px rgba(0, 0, 0, 0.1)"
            : rawVal;
        decls.push(`box-shadow: ${shadowStr};`);
      } else if (typeof rawVal === "object") {
        decls.push(`box-shadow: ${buildBoxShadowString(rawVal)};`);
      }
    } else if (key === "fontSize") {
      const fVal = resolveFontSizeValue(rawVal);
      if (fVal) decls.push(`font-size: ${fVal};`);
    } else if (key === "fontWeight") {
      decls.push(`font-weight: ${rawVal};`);
    } else if (key === "lineHeight") {
      const lh = typeof rawVal === "number" && rawVal >= 3 ? `${rawVal}px` : String(rawVal);
      decls.push(`line-height: ${lh};`);
    } else if (key === "letterSpacing") {
      decls.push(`letter-spacing: ${typeof rawVal === "number" ? `${rawVal}px` : rawVal};`);
    } else if (key === "paddingTop") {
      decls.push(`padding-top: ${parseFreeNumber(rawVal)}px;`);
    } else if (key === "paddingBottom") {
      decls.push(`padding-bottom: ${parseFreeNumber(rawVal)}px;`);
    } else if (key === "paddingLeft") {
      decls.push(`padding-left: ${parseFreeNumber(rawVal)}px;`);
    } else if (key === "paddingRight") {
      decls.push(`padding-right: ${parseFreeNumber(rawVal)}px;`);
    } else if (key === "padding") {
      decls.push(`padding: ${typeof rawVal === "number" ? `${rawVal}px` : rawVal};`);
    } else if (key === "marginTop") {
      decls.push(`margin-top: ${parseFreeNumber(rawVal)}px;`);
    } else if (key === "marginBottom") {
      decls.push(`margin-bottom: ${parseFreeNumber(rawVal)}px;`);
    } else if (key === "margin") {
      decls.push(`margin: ${typeof rawVal === "number" ? `${rawVal}px` : rawVal};`);
    } else if (key === "minHeight") {
      const mh = parseFreeNumber(rawVal);
      if (mh > 0) decls.push(`min-height: ${mh}px;`);
    } else if (key === "gap") {
      const g = parseFreeNumber(rawVal);
      if (g > 0) decls.push(`gap: ${g}px;`);
    } else if (key === "opacity") {
      decls.push(`opacity: ${rawVal};`);
    } else if (key === "transform") {
      decls.push(`transform: ${rawVal};`);
    } else if (key === "outline") {
      decls.push(`outline: ${rawVal};`);
    } else if (key === "transition") {
      decls.push(`transition: ${rawVal};`);
    } else if (key === "cursor") {
      decls.push(`cursor: ${rawVal};`);
    } else if (key === "textAlign" || key === "align" || key === "contentAlign") {
      decls.push(`text-align: ${rawVal};`);
    } else if (key === "textDecoration") {
      decls.push(`text-decoration: ${rawVal};`);
    } else if (key === "textTransform") {
      decls.push(`text-transform: ${rawVal};`);
    } else if (key === "customCss") {
      decls.push(String(rawVal));
    } else if (typeof rawVal === "string" || typeof rawVal === "number") {
      const kebab = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      decls.push(`${kebab}: ${rawVal};`);
    }
  }

  return decls;
}

/**
 * Generates page-level scoped CSS for all defined classes and their pseudo-states (hover, focus, active).
 * (Ticket CLASSES-1).
 */
export function generateClassesCss(classes?: StudioStyleClass[] | null): string {
  if (!classes || !Array.isArray(classes) || classes.length === 0) return "";

  const rules: string[] = [];

  for (const c of classes) {
    if (!c || !c.id) continue;
    const cid = String(c.id).trim();
    if (!cid) continue;

    // Normal / Base class rules
    const baseDecls = styleObjectToCssDeclarations(c.settings || {});
    if (baseDecls.length > 0) {
      rules.push(`[data-sf-class="${cid}"] {\n  ${baseDecls.join("\n  ")}\n}`);
    }

    // State rules: hover, focus, active
    const states = c.states;
    if (states && typeof states === "object") {
      if (states.hover && typeof states.hover === "object") {
        const hoverDecls = styleObjectToCssDeclarations(states.hover);
        if (hoverDecls.length > 0) {
          rules.push(`[data-sf-class="${cid}"]:hover {\n  ${hoverDecls.join("\n  ")}\n}`);
        }
      }
      if (states.focus && typeof states.focus === "object") {
        const focusDecls = styleObjectToCssDeclarations(states.focus);
        if (focusDecls.length > 0) {
          rules.push(`[data-sf-class="${cid}"]:focus {\n  ${focusDecls.join("\n  ")}\n}`);
        }
      }
      if (states.active && typeof states.active === "object") {
        const activeDecls = styleObjectToCssDeclarations(states.active);
        if (activeDecls.length > 0) {
          rules.push(`[data-sf-class="${cid}"]:active {\n  ${activeDecls.join("\n  ")}\n}`);
        }
      }
    }
  }

  return rules.join("\n\n");
}

/**
 * Merges class settings onto section settings:
 * Class settings are applied first, and inline section settings take ultimate precedence upon conflict.
 * (Ticket CLASSES-1).
 */
export function mergeClassStyle(
  sectionSettings?: Record<string, any> | null,
  classes?: StudioStyleClass[] | null
): Record<string, any> {
  if (!sectionSettings) return {};
  if (!classes || !Array.isArray(classes) || classes.length === 0) return { ...sectionSettings };

  const classId = sectionSettings.classId || sectionSettings.customClass;
  if (!classId) return { ...sectionSettings };

  const matchedClass = classes.find((c) => c && c.id === classId);
  if (!matchedClass) return { ...sectionSettings };

  // 1. Base settings: class settings first, then section settings override
  const merged: Record<string, any> = {
    ...(matchedClass.settings || {}),
    ...sectionSettings,
  };

  // 2. Responsive overrides cascade: class responsive merged before section responsive
  const classResp = matchedClass.settings?.responsive;
  const sectionResp = sectionSettings.responsive;
  if (classResp || sectionResp) {
    merged.responsive = {
      ...(classResp || {}),
      ...(sectionResp || {}),
      tablet: {
        ...(classResp?.tablet || {}),
        ...(sectionResp?.tablet || {}),
      },
      mobile: {
        ...(classResp?.mobile || {}),
        ...(sectionResp?.mobile || {}),
      },
    };
  }

  return merged;
}

/**
 * Computes element style merging assigned class styles before element inline styles.
 * (Ticket CLASSES-1).
 */
export function buildElementStyle(
  settings?: Record<string, any> | null,
  classes?: StudioStyleClass[] | null,
  baseStyle?: React.CSSProperties,
  textOverride?: string
): React.CSSProperties {
  if (!settings && !textOverride) return baseStyle || {};

  const merged = classes ? mergeClassStyle(settings, classes) : (settings || {});
  const style: React.CSSProperties = { ...(baseStyle || {}) };

  // Typography
  const typo = buildElementTypographyStyle(merged, textOverride);
  Object.assign(style, typo);

  // Background and appearance
  const bg = merged.backgroundColor || merged.bgColor;
  if (bg && typeof bg === "string" && bg !== "transparent") {
    style.backgroundColor = bg;
  }
  if (merged.color && typeof merged.color === "string") {
    style.color = merged.color === "accent" ? "var(--store-accent, #2563eb)" : merged.color;
  }
  const radius = resolveBorderRadius(merged.borderRadius);
  if (radius !== undefined) {
    style.borderRadius = radius;
  }
  const shadow = buildBoxShadowString(merged);
  if (shadow && shadow !== "none") {
    style.boxShadow = shadow;
  }
  if (merged.paddingTop !== undefined) style.paddingTop = `${parseFreeNumber(merged.paddingTop)}px`;
  if (merged.paddingBottom !== undefined) style.paddingBottom = `${parseFreeNumber(merged.paddingBottom)}px`;
  if (merged.paddingLeft !== undefined) style.paddingLeft = `${parseFreeNumber(merged.paddingLeft)}px`;
  if (merged.paddingRight !== undefined) style.paddingRight = `${parseFreeNumber(merged.paddingRight)}px`;
  if (merged.marginTop !== undefined) style.marginTop = `${parseFreeNumber(merged.marginTop)}px`;
  if (merged.marginBottom !== undefined) style.marginBottom = `${parseFreeNumber(merged.marginBottom)}px`;

  return style;
}

/**
 * All properties considered 'style' for copy/paste style operations (Ticket CLASSES-1).
 */
export const STYLE_PROPERTIES_TO_COPY = new Set<string>([
  "backgroundColor",
  "bgColor",
  "borderRadius",
  "shadow",
  "customShadow",
  "shadowX",
  "shadowY",
  "shadowBlur",
  "shadowSpread",
  "shadowOpacity",
  "shadowColor",
  "paddingTop",
  "paddingBottom",
  "paddingRight",
  "paddingLeft",
  "padding",
  "marginTop",
  "marginBottom",
  "margin",
  "minHeight",
  "gap",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "align",
  "textAlign",
  "contentAlign",
  "color",
  "customCss",
  "classId",
  "customClass",
  "responsive",
  "border",
  "borders",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderRadiusTopLeft",
  "borderRadiusTopRight",
  "borderRadiusBottomRight",
  "borderRadiusBottomLeft",
  "overlay",
  "overlayColor",
  "overlayOpacity",
  "opacity",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "zIndex",
  "transform",
  "rotate",
  "scale",
  "translateX",
  "translateY",
  "overflow",
  "overflowX",
  "overflowY",
  "aspectRatio",
  "objectFit",
  "objectPosition",
  "hiddenOn",
  "breakpoints",
]);

/**
 * Copies only style properties from a section settings object without copying content or structural keys.
 */
export function copySectionStyle(settings?: Record<string, any> | null): Record<string, any> {
  if (!settings || typeof settings !== "object") return {};
  const stylePayload: Record<string, any> = {};

  for (const key of Object.keys(settings)) {
    if (STYLE_PROPERTIES_TO_COPY.has(key)) {
      const val = settings[key];
      if (val !== undefined && val !== null) {
        stylePayload[key] = JSON.parse(JSON.stringify(val));
      }
    }
  }

  return stylePayload;
}

/**
 * Applies copied style properties onto target section settings without altering target content or structural keys.
 */
export function pasteSectionStyle(
  targetSettings?: Record<string, any> | null,
  copiedStyle?: Record<string, any> | null
): Record<string, any> {
  const target = { ...(targetSettings || {}) };
  if (!copiedStyle || typeof copiedStyle !== "object") return target;

  for (const [k, v] of Object.entries(copiedStyle)) {
    if (STYLE_PROPERTIES_TO_COPY.has(k) && v !== undefined) {
      target[k] = JSON.parse(JSON.stringify(v));
    }
  }

  return target;
}
