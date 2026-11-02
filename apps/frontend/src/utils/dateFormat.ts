// frontend/src/utils/dateFormat.ts
// Date formatting utilities with Gregorian calendar support and i18n localization
import i18n from "i18next";

export type DateFormatType =
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "YYYY-MM-DD"
  | "gregorian";

export interface DateFormatOptions {
  format: DateFormatType;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
}

export interface FormatDateValueResult {
  ok: boolean;
  value: string;
  error: string | null;
}

// Default date format options
export const DEFAULT_DATE_FORMAT: DateFormatType = "DD/MM/YYYY";

// Helper to determine if locale or language is English
export const isEnglishLocale = (locale?: string): boolean => {
  if (locale) {
    return locale.toLowerCase().startsWith("en");
  }
  if (typeof document !== "undefined" && document.documentElement?.lang) {
    if (document.documentElement.lang.toLowerCase().startsWith("en")) {
      return true;
    }
  }
  if (i18n?.language) {
    return i18n.language.toLowerCase().startsWith("en");
  }
  return false;
};

// Date format configurations
export const DATE_FORMAT_CONFIGS = {
  gregorian: {
    locale: "ar-EG", // Arabic locale with Gregorian calendar
    options: {
      year: "numeric" as const,
      month: "long" as const,
      day: "numeric" as const,
      calendar: "gregory" as const,
    },
    enLocale: "en-US",
    enOptions: {
      year: "numeric" as const,
      month: "short" as const,
      day: "numeric" as const,
    },
  },
};

// Format date based on the specified format type
export const formatDate = (
  date: Date | string | number | null | undefined,
  formatType: DateFormatType = DEFAULT_DATE_FORMAT,
  customOptions?: Intl.DateTimeFormatOptions,
  customLocale?: string,
): string => {
  if (date === null || date === undefined || date === "") {
    if (formatType === "gregorian") {
      const isEn = isEnglishLocale(customLocale);
      return isEn ? "Invalid date" : "تاريخ غير صحيح";
    }
    return "—";
  }

  try {
    const dateObj =
      typeof date === "string" || typeof date === "number"
        ? new Date(date)
        : date;

    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      if (formatType === "gregorian") {
        const isEn = isEnglishLocale(customLocale);
        return isEn ? "Invalid date" : "تاريخ غير صحيح";
      }
      return "—";
    }

    if (formatType === "gregorian") {
      const isEn = isEnglishLocale(customLocale);
      const config = DATE_FORMAT_CONFIGS.gregorian;
      const targetLocale =
        customLocale || (isEn ? config.enLocale : config.locale);
      const defaultOptions = isEn ? config.enOptions : config.options;
      const options =
        customOptions || (defaultOptions as Intl.DateTimeFormatOptions);

      // Apply timezone if provided
      const finalOptions: Intl.DateTimeFormatOptions = { ...options };
      if (customOptions?.timeZone) {
        finalOptions.timeZone = customOptions.timeZone;
      }

      return dateObj.toLocaleDateString(targetLocale, finalOptions);
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    let year: string;
    let month: string;
    let day: string;

    if (customOptions?.timeZone) {
      const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: customOptions.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = dtf.formatToParts(dateObj);
      year =
        parts.find((p) => p.type === "year")?.value ||
        String(dateObj.getFullYear());
      month =
        parts.find((p) => p.type === "month")?.value ||
        pad(dateObj.getMonth() + 1);
      day =
        parts.find((p) => p.type === "day")?.value ||
        pad(dateObj.getDate());
    } else {
      if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        const [y, m, d] = date.trim().split("-");
        year = y;
        month = m;
        day = d;
      } else {
        year = String(dateObj.getFullYear());
        month = pad(dateObj.getMonth() + 1);
        day = pad(dateObj.getDate());
      }
    }

    if (formatType === "MM/DD/YYYY") {
      return `${month}/${day}/${year}`;
    }
    if (formatType === "YYYY-MM-DD") {
      return `${year}-${month}-${day}`;
    }
    // Default is DD/MM/YYYY
    return `${day}/${month}/${year}`;
  } catch (error) {
    if (formatType === "gregorian") {
      const isEn = isEnglishLocale(customLocale);
      return isEn ? "Invalid date" : "تاريخ غير صحيح";
    }
    return "—";
  }
};

export const formatDateValue = (
  date: Date | string | number | null | undefined,
  formatType: DateFormatType = DEFAULT_DATE_FORMAT,
): FormatDateValueResult => {
  if (date === null || date === undefined || date === "") {
    return { ok: false, value: "", error: "التاريخ غير محدد" };
  }
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return { ok: false, value: "", error: "تاريخ غير صالح" };
  }

  return {
    ok: true,
    value: formatDate(dateObj, formatType),
    error: null,
  };
};

// Format short date based on interface language (ar-EG for Arabic, en-GB for English)
export const formatShortDate = (
  dateValue: Date | string | number | null | undefined,
  locale?: string,
): string => {
  if (!dateValue) return "—";
  try {
    const dateObj =
      typeof dateValue === "string" || typeof dateValue === "number"
        ? new Date(dateValue)
        : dateValue;
    if (isNaN(dateObj.getTime())) return "—";
    const isEn = isEnglishLocale(locale);
    return dateObj.toLocaleDateString(isEn ? "en-GB" : "ar-EG");
  } catch {
    return "—";
  }
};

// Format time
export const formatTime = (
  date: Date | string | number,
  locale?: string,
): string => {
  try {
    const dateObj = new Date(date);
    const isEn = isEnglishLocale(locale);

    if (isNaN(dateObj.getTime())) {
      return isEn ? "Invalid time" : "وقت غير صحيح";
    }

    const targetLocale = locale || (isEn ? "en-US" : "ar-EG");

    return dateObj.toLocaleTimeString(targetLocale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone:
        typeof date === "string" ||
        typeof date === "number" ||
        date instanceof Date
          ? undefined
          : (date as any).timeZone,
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    const isEn = isEnglishLocale(locale);
    return isEn ? "Invalid time" : "وقت غير صحيح";
  }
};

// Format time with explicit timezone support
export const formatTimeWithZone = (
  date: Date | string | number,
  timezone?: string,
  locale?: string,
): string => {
  try {
    const dateObj = new Date(date);
    const isEn = isEnglishLocale(locale);

    if (isNaN(dateObj.getTime())) {
      return isEn ? "Invalid time" : "وقت غير صحيح";
    }

    const targetLocale = locale || (isEn ? "en-US" : "ar-EG");

    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    if (timezone) {
      options.timeZone = timezone;
    }

    return dateObj.toLocaleTimeString(targetLocale, options);
  } catch (error) {
    console.error("Error formatting time:", error);
    const isEn = isEnglishLocale(locale);
    return isEn ? "Invalid time" : "وقت غير صحيح";
  }
};

// Format date and time together
export const formatDateTime = (
  date: Date | string | number,
  formatType: DateFormatType = DEFAULT_DATE_FORMAT,
  locale?: string,
): string => {
  const formattedDate = formatDate(date, formatType, undefined, locale);
  const formattedTime = formatTime(date, locale);

  return `${formattedDate} - ${formattedTime}`;
};

// Get relative time (time ago)
export const getTimeAgo = (date: Date | string | number, locale?: string): string => {
  try {
    const dateObj = new Date(date);
    const isEn = isEnglishLocale(locale);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (isEn) {
      if (diffMins < 1) return "Just now";
      if (diffMins === 1) return "1 minute ago";
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours === 1) return "1 hour ago";
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffWeeks === 1) return "1 week ago";
      if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
      if (diffMonths === 1) return "1 month ago";
      if (diffMonths < 12) return `${diffMonths} months ago`;

      const diffYears = Math.floor(diffMonths / 12);
      return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
    }

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    if (diffWeeks < 4) return `منذ ${diffWeeks} أسبوع`;
    if (diffMonths < 12) return `منذ ${diffMonths} شهر`;

    const diffYears = Math.floor(diffMonths / 12);
    return `منذ ${diffYears} سنة`;
  } catch (error) {
    console.error("Error calculating time ago:", error);
    const isEn = isEnglishLocale(locale);
    return isEn ? "Unknown time" : "منذ وقت غير محدد";
  }
};

// Date format display names for UI
export const DATE_FORMAT_LABELS: Record<DateFormatType, string> = {
  "DD/MM/YYYY": "يوم/شهر/سنة (DD/MM/YYYY)",
  "MM/DD/YYYY": "شهر/يوم/سنة (MM/DD/YYYY)",
  "YYYY-MM-DD": "سنة-شهر-يوم (YYYY-MM-DD)",
  gregorian: "ميلادي (Gregorian)",
};

// Validate date format type
export const isValidDateFormat = (format: string): format is DateFormatType => {
  return (
    format === "DD/MM/YYYY" ||
    format === "MM/DD/YYYY" ||
    format === "YYYY-MM-DD" ||
    format === "gregorian"
  );
};

// Get current date in specified format
export const getCurrentDate = (
  formatType: DateFormatType = DEFAULT_DATE_FORMAT,
  locale?: string,
): string => {
  return formatDate(new Date(), formatType, undefined, locale);
};

// Parse date format from company settings
export const parseDateFormatFromSettings = (settings: any): DateFormatType => {
  if (!settings) return DEFAULT_DATE_FORMAT;

  let parsed = settings;
  if (typeof settings === "string") {
    try {
      parsed = JSON.parse(settings);
    } catch {
      if (isValidDateFormat(settings)) {
        return settings;
      }
      return DEFAULT_DATE_FORMAT;
    }
  }

  if (parsed?.dateFormat && isValidDateFormat(parsed.dateFormat)) {
    return parsed.dateFormat;
  }
  if (typeof parsed === "string" && isValidDateFormat(parsed)) {
    return parsed;
  }
  return DEFAULT_DATE_FORMAT;
};
