import { PeriodKey } from "./types";

/**
 * Valid Period Keys set for safe type checking and URL query parsing
 */
export const VALID_PERIOD_KEYS: readonly PeriodKey[] = [
  "today",
  "yesterday",
  "7",
  "30",
  "thisMonth",
  "lastMonth",
  "90",
  "180",
  "365",
  "custom",
];

export const isValidPeriodKey = (key: unknown): key is PeriodKey => {
  return typeof key === "string" && VALID_PERIOD_KEYS.includes(key as PeriodKey);
};

/**
 * Compute the current calendar day anchored strictly to Egypt time (Africa/Cairo).
 * Eliminates cross-timezone drift for merchants viewing from overseas or traveling.
 */
export const getCairoToday = (now: Date = new Date()): Date => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(now);
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let day = now.getDate();
    for (const part of parts) {
      if (part.type === "year") year = Number(part.value);
      if (part.type === "month") month = Number(part.value);
      if (part.type === "day") day = Number(part.value);
    }
    return new Date(year, month - 1, day);
  } catch {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
};

/**
 * Format a Date object to YYYY-MM-DD in local time without UTC offset shifting.
 */
export const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get start date, end date, and elapsed day count for any preset period.
 * Anchored to Cairo timezone, completely immune to UTC timezone rollback and off-by-one errors.
 */
export const getPresetRange = (
  key: PeriodKey,
  now: Date = new Date()
): { start: string; end: string; daysCount: number } => {
  const today = getCairoToday(now);

  if (key === "today") {
    const dStr = formatLocalDate(today);
    return { start: dStr, end: dStr, daysCount: 1 };
  }

  if (key === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const dStr = formatLocalDate(y);
    return { start: dStr, end: dStr, daysCount: 1 };
  }

  if (key === "thisMonth") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = today;
    const daysCount = today.getDate(); // 1st to today inclusive
    return {
      start: formatLocalDate(start),
      end: formatLocalDate(end),
      daysCount: Math.max(1, daysCount),
    };
  }

  if (key === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of previous month
    const daysCount = end.getDate(); // exact count of days in previous month
    return {
      start: formatLocalDate(start),
      end: formatLocalDate(end),
      daysCount: Math.max(1, daysCount),
    };
  }

  const n = Number(key) || 30;
  const start = new Date(today);
  start.setDate(start.getDate() - (n - 1)); // e.g. 7 days ending today: today - 6
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(today),
    daysCount: n,
  };
};

/**
 * Parse an inclusive day count between start and end strings (YYYY-MM-DD).
 */
export const calculateCustomDaysCount = (startStr: string, endStr: string): number => {
  if (!startStr || !endStr) return 1;
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(endStr + "T00:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};
