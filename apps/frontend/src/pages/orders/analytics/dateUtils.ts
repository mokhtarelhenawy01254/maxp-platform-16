import { PeriodKey } from "./types";

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
 * Completely immune to UTC timezone rollback and off-by-one errors.
 */
export const getPresetRange = (
  key: PeriodKey,
  now: Date = new Date()
): { start: string; end: string; daysCount: number } => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
