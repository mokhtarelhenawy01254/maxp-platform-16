/**
 * Browser-safe Date Utilities for Turbo Tickets & Chat
 * Handles standard ISO, "YYYY-MM-DD hh:mm:ss AM/PM", and "YYYY-MM-DD HH:mm:ss"
 * Prevents Invalid Date and RangeError on Safari / WebKit engines.
 */

export const parseSafeDate = (val?: string | number | null): Date | null => {
  if (!val) return null;
  if (typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(val).trim();
  if (!str) return null;

  // 1. Try native Date constructor
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  // 2. Parse "YYYY-MM-DD hh:mm:ss AM/PM" or "YYYY-MM-DD HH:mm:ss"
  const match = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[\sT]+(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?/i
  );
  if (match) {
    const [, yStr, mStr, dStr, hhStr, mmStr, ssStr, meridiem] = match;
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);
    let hour = parseInt(hhStr, 10);
    const minute = parseInt(mmStr, 10);
    const second = parseInt(ssStr, 10);

    if (meridiem) {
      const upper = meridiem.toUpperCase();
      if (upper === "PM" && hour < 12) hour += 12;
      if (upper === "AM" && hour === 12) hour = 0;
    }

    const constructed = new Date(year, month, day, hour, minute, second);
    if (!isNaN(constructed.getTime())) {
      return constructed;
    }
  }

  return null;
};

export const formatSafeTime = (
  val?: string | number | null,
  locale = "ar-EG"
): string => {
  const d = parseSafeDate(val);
  if (!d) return "";
  try {
    return d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export const formatSafeDateTime = (
  val?: string | number | null,
  locale = "ar-EG"
): string => {
  const d = parseSafeDate(val);
  if (!d) return "";
  try {
    return d.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export const formatSafeDate = (
  val?: string | number | null,
  locale = "ar-EG"
): string => {
  const d = parseSafeDate(val);
  if (!d) return "";
  try {
    return d.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};
