"use strict";

const INVALID_SLUG_ERROR_MESSAGE =
  "رابط المنتج (Slug) غير صالح: يجب ألا يحتوي على مسافات أو رموز مشفرة أو أرقام فقط";

/**
 * Validates a product slug.
 * Returns true if invalid (contains spaces, percent-encoded characters, or only digits).
 */
function isInvalidProductSlug(slug) {
  if (!slug || typeof slug !== "string") {
    return false;
  }
  // 1. Contains whitespace (including leading, trailing, or internal)
  if (/\s/u.test(slug)) {
    return true;
  }

  const trimmed = slug.trim();
  if (!trimmed) {
    return false;
  }

  // 2. Contains percent-encoded sequences or %
  if (/%[0-9a-fA-F]{2}/.test(trimmed) || trimmed.includes("%")) {
    return true;
  }

  // 3. Consists only of digits
  if (/^\d+$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Normalizes a product slug for canonical SEO URLs.
 * Replaces spaces and underscores with hyphens, decodes URI components, and strips extraneous hyphens.
 */
function getCanonicalProductSlug(slug) {
  if (!slug || typeof slug !== "string") {
    return "";
  }
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // ignore
  }
  return decoded
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = {
  INVALID_SLUG_ERROR_MESSAGE,
  isInvalidProductSlug,
  getCanonicalProductSlug,
};
