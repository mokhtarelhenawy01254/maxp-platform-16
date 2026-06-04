export type FacebookAdsDatePreset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_14d"
  | "last_30d"
  | "last_90d"
  | "this_month"
  | "custom";

export const FACEBOOK_ADS_DATE_PRESETS: Array<{
  value: FacebookAdsDatePreset;
  label: string;
}> = [
  { value: "last_7d", label: "آخر 7 أيام" },
  { value: "last_14d", label: "آخر 14 يوم" },
  { value: "last_30d", label: "آخر 30 يوم" },
  { value: "last_90d", label: "آخر 90 يوم" },
  { value: "this_month", label: "هذا الشهر" },
  { value: "today", label: "اليوم" },
  { value: "yesterday", label: "أمس" },
  { value: "custom", label: "فترة مخصصة" },
];

export interface FacebookAdsStoredDateFilter {
  preset: FacebookAdsDatePreset;
  startDate?: string;
  endDate?: string;
}

const getLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const toFacebookAdsDateInput = (date: Date, timeZone?: string) => {
  if (!timeZone) {
    return getLocalDateInput(date);
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall back to the browser calendar day if Meta returns an unknown timezone.
  }

  return getLocalDateInput(date);
};

export function resolveFacebookAdsDateRange(
  filter: FacebookAdsStoredDateFilter,
  timeZone?: string,
) {
  const end = new Date();
  const start = new Date(end);

  if (filter.preset === "today") {
    return {
      startDate: toFacebookAdsDateInput(end, timeZone),
      endDate: toFacebookAdsDateInput(end, timeZone),
    };
  }

  if (filter.preset === "yesterday") {
    start.setDate(end.getDate() - 1);
    return {
      startDate: toFacebookAdsDateInput(start, timeZone),
      endDate: toFacebookAdsDateInput(start, timeZone),
    };
  }

  if (filter.preset === "last_7d") {
    start.setDate(end.getDate() - 6);
  } else if (filter.preset === "last_14d") {
    start.setDate(end.getDate() - 13);
  } else if (filter.preset === "last_90d") {
    start.setDate(end.getDate() - 89);
  } else if (filter.preset === "this_month") {
    start.setDate(1);
  } else if (filter.preset === "custom") {
    return {
      startDate: filter.startDate || toFacebookAdsDateInput(start, timeZone),
      endDate: filter.endDate || toFacebookAdsDateInput(end, timeZone),
    };
  } else {
    start.setDate(end.getDate() - 29);
  }

  return {
    startDate: toFacebookAdsDateInput(start, timeZone),
    endDate: toFacebookAdsDateInput(end, timeZone),
  };
}

export function readStoredFacebookAdsFilters<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredFacebookAdsFilters<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can be blocked in private contexts; filters still work in memory.
  }
}
