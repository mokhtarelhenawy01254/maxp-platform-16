/**
 * HSL Color Bridge Utility
 * Two-way conversion between Shadcn HSL channel triplets (e.g. "215 28% 17%")
 * and standard Hex format (#rrggbb) for HTML5 native <input type="color">.
 */

export function hslTripletToHex(triplet: string): string {
  if (!triplet || typeof triplet !== "string") return "#000000";
  const t = triplet.trim();
  if (t.startsWith("#")) {
    if (t.length === 4) {
      return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`.toLowerCase();
    }
    return t.toLowerCase();
  }
  const cleaned = t.replace(/^hsl\s*\(/i, "").replace(/\)$/, "").trim();
  const parts = cleaned.includes(",") ? cleaned.split(",") : cleaned.split(/\s+/);
  if (parts.length < 3) return "#000000";

  const h = (parseFloat(parts[0]) % 360 + 360) % 360;
  const s = Math.min(100, Math.max(0, parseFloat(parts[1].replace("%", "")))) / 100;
  const l = Math.min(100, Math.max(0, parseFloat(parts[2].replace("%", "")))) / 100;
  if (isNaN(h) || isNaN(s) || isNaN(l)) return "#000000";

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHslTriplet(hex: string): string {
  if (!hex || typeof hex !== "string") return "0 0% 0%";
  const trimmed = hex.trim();
  if (isValidHslTriplet(trimmed)) return trimmed;

  let c = trimmed.replace("#", "").trim();
  if (c.length === 3) {
    c = c.split("").map((ch) => ch + ch).join("");
  }
  if (c.length !== 6) return "0 0% 0%";

  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "0 0% 0%";

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  return `${Math.round(h)} ${sPct}% ${lPct}%`;
}

export function computeContrastingForeground(hslTripletOrHex: string): string {
  if (!hslTripletOrHex || typeof hslTripletOrHex !== "string") return "0 0% 100%";
  const str = hslTripletOrHex.trim();

  let lightness = 50;
  if (str.startsWith("#")) {
    const hex = hslTripletToHex(str);
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    // Relative luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 140 ? "0 0% 0%" : "0 0% 100%";
  }

  const cleaned = str.replace(/^hsl\s*\(/i, "").replace(/\)$/, "").trim();
  const parts = cleaned.includes(",") ? cleaned.split(",") : cleaned.split(/\s+/);
  if (parts.length >= 3) {
    lightness = parseFloat(parts[2].replace("%", "")) || 50;
  }
  return lightness > 55 ? "0 0% 0%" : "0 0% 100%";
}

export function isValidHslTriplet(str: unknown): boolean {
  if (typeof str !== "string") return false;
  const cleaned = str.replace(/^hsl\s*\(/i, "").replace(/\)$/, "").trim();
  const parts = cleaned.includes(",") ? cleaned.split(",") : cleaned.split(/\s+/);
  if (parts.length < 3) return false;

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace("%", ""));
  const l = parseFloat(parts[2].replace("%", ""));
  if (isNaN(h) || isNaN(s) || isNaN(l)) return false;

  return h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100;
}
