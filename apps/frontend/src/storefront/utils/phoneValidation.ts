/**
 * Phone validation and normalization utilities for storefront checkout and order forms.
 * Supports:
 * - Egyptian local format: 01xxxxxxxxx (11 digits)
 * - Egyptian international formats: +201xxxxxxxxx, +2001xxxxxxxxx, 00201xxxxxxxxx, 201xxxxxxxxx
 * - Arabic-Indic digits (٠-٩) and Eastern Arabic digits (۰-۹)
 * - Formatted strings with spaces, hyphens, and parentheses
 * - General international numbers (+ followed by 8-15 digits)
 */

const ARABIC_INDIC_START = 0x0660; // ٠
const EXTENDED_ARABIC_START = 0x06f0; // ۰

/**
 * Converts Arabic-Indic and Eastern Arabic digits to standard ASCII digits (0-9).
 */
export function toAsciiDigits(value: string): string {
  return String(value || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - ARABIC_INDIC_START))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - EXTENDED_ARABIC_START));
}

/**
 * Cleans phone number by converting to ASCII digits and stripping spaces, hyphens, etc.,
 * while preserving a single leading plus (+) if provided.
 */
export function cleanPhoneNumber(value: string): string {
  const ascii = toAsciiDigits(value).trim();
  if (!ascii) return '';

  const hasPlus = ascii.startsWith('+');
  const digits = ascii.replace(/\D/g, '');
  if (!digits) return '';

  return hasPlus ? `+${digits}` : digits;
}

/**
 * Validates whether the provided phone number is a valid Egyptian mobile number
 * or a valid international number.
 */
export function isValidStorefrontPhone(value: string): boolean {
  const cleaned = cleanPhoneNumber(value);
  if (!cleaned) return false;

  // Egyptian mobile number validation:
  // - Local: 010, 011, 012, 015 followed by 8 digits (11 digits total)
  // - International: +20, 0020, 20 followed by optional 0, then 1 and 9 digits
  const isEgyptian = /^(?:\+20|0020|20)?0?1[0-9]{9}$/.test(cleaned);
  if (isEgyptian) {
    return true;
  }

  // General E.164 international format (+ followed by 8 to 15 digits)
  if (cleaned.startsWith('+')) {
    return /^\+[1-9]\d{7,14}$/.test(cleaned);
  }

  // International format with 00 prefix
  if (cleaned.startsWith('00')) {
    return /^00[1-9]\d{7,14}$/.test(cleaned);
  }

  return false;
}

/**
 * Normalizes an Egyptian mobile phone number to canonical local 11-digit format (01xxxxxxxxx)
 * if it matches Egyptian formats, or returns the cleaned phone number as-is.
 */
export function normalizeEgyptianPhone(value: string): string {
  const cleaned = cleanPhoneNumber(value);
  if (!cleaned) return '';

  const match = cleaned.match(/^(?:\+20|0020|20)?0?(1[0-9]{9})$/);
  if (match && match[1]) {
    return `0${match[1]}`;
  }

  return cleaned;
}
