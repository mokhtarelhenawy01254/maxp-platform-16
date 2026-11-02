import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateValue,
  formatShortDate,
  formatTime,
  formatDateTime,
  getTimeAgo,
  isEnglishLocale,
  parseDateFormatFromSettings,
  DEFAULT_DATE_FORMAT,
} from "../dateFormat";

describe("dateFormat utility", () => {
  const sampleDate = new Date("2026-09-13T10:30:00.000Z");

  describe("isEnglishLocale", () => {
    it("returns true for en locale", () => {
      expect(isEnglishLocale("en")).toBe(true);
      expect(isEnglishLocale("en-US")).toBe(true);
    });

    it("returns false for ar locale", () => {
      expect(isEnglishLocale("ar")).toBe(false);
      expect(isEnglishLocale("ar-EG")).toBe(false);
    });
  });

  describe("formatDate", () => {
    it("formats invalid date with appropriate language", () => {
      expect(formatDate("invalid-date", "gregorian", undefined, "en-US")).toBe(
        "Invalid date",
      );
      expect(formatDate("invalid-date", "gregorian", undefined, "ar-EG")).toBe(
        "تاريخ غير صحيح",
      );
    });

    it("formats date in English locale with Western numerals and English month", () => {
      const result = formatDate(sampleDate, "gregorian", undefined, "en-US");
      expect(result).toContain("Sep");
      expect(result).toContain("2026");
      expect(result).not.toMatch(/[٠-٩]/);
    });

    it("formats date in Arabic locale with Arabic month and numerals", () => {
      const result = formatDate(sampleDate, "gregorian", undefined, "ar-EG");
      expect(result).toContain("سبتمبر");
      expect(result).toMatch(/[٠-٩]/);
    });

    it("formats date with DD/MM/YYYY accurately using Latin numerals", () => {
      expect(formatDate(new Date("2026-10-28"), "DD/MM/YYYY")).toBe(
        "28/10/2026",
      );
    });

    it("preserves gregorian format output as regression check", () => {
      const gregResult = formatDate(new Date("2026-10-28"), "gregorian");
      expect(gregResult).toContain("أكتوبر");
      expect(gregResult).toContain("٢٠٢٦");
    });

    it("formats date with MM/DD/YYYY and YYYY-MM-DD", () => {
      expect(formatDate(new Date("2026-10-28"), "MM/DD/YYYY")).toBe(
        "10/28/2026",
      );
      expect(formatDate(new Date("2026-10-28"), "YYYY-MM-DD")).toBe(
        "2026-10-28",
      );
    });

    it("returns dash for empty, null, undefined or invalid dates in numeric formats", () => {
      expect(formatDate("", "DD/MM/YYYY")).toBe("—");
      expect(formatDate(null, "DD/MM/YYYY")).toBe("—");
      expect(formatDate(undefined, "DD/MM/YYYY")).toBe("—");
      expect(formatDate("not-a-valid-date", "DD/MM/YYYY")).toBe("—");
      expect(formatDate("not-a-valid-date", "MM/DD/YYYY")).toBe("—");
      expect(formatDate("not-a-valid-date", "YYYY-MM-DD")).toBe("—");
    });
  });

  describe("formatTime", () => {
    it("formats invalid time with appropriate language", () => {
      expect(formatTime("invalid-date", "en-US")).toBe("Invalid time");
      expect(formatTime("invalid-date", "ar-EG")).toBe("وقت غير صحيح");
    });

    it("formats time in English locale", () => {
      const result = formatTime(sampleDate, "en-US");
      expect(result).toMatch(/(AM|PM)/i);
      expect(result).not.toMatch(/[٠-٩]/);
    });

    it("formats time in Arabic locale", () => {
      const result = formatTime(sampleDate, "ar-EG");
      expect(result).toMatch(/[٠-٩]/);
      expect(result).toMatch(/(ص|م)/);
    });
  });

  describe("formatDateTime", () => {
    it("combines date and time in English", () => {
      const result = formatDateTime(sampleDate, "gregorian", "en-US");
      expect(result).toContain("Sep");
      expect(result).toContain(" - ");
    });

    it("combines date and time in Arabic", () => {
      const result = formatDateTime(sampleDate, "gregorian", "ar-EG");
      expect(result).toContain("سبتمبر");
      expect(result).toContain(" - ");
    });
  });

  describe("getTimeAgo", () => {
    it("formats relative time in English", () => {
      const now = new Date();
      const fiveMinsAgo = new Date(now.getTime() - 5 * 60000);
      expect(getTimeAgo(fiveMinsAgo, "en-US")).toBe("5 minutes ago");

      const justNow = new Date(now.getTime() - 10000);
      expect(getTimeAgo(justNow, "en-US")).toBe("Just now");
    });

    it("formats relative time in Arabic", () => {
      const now = new Date();
      const fiveMinsAgo = new Date(now.getTime() - 5 * 60000);
      expect(getTimeAgo(fiveMinsAgo, "ar-EG")).toBe("منذ 5 دقيقة");

      const justNow = new Date(now.getTime() - 10000);
      expect(getTimeAgo(justNow, "ar-EG")).toBe("الآن");
    });
  });

  describe("formatShortDate", () => {
    it("formats ISO date strings according to locale", () => {
      const dateStr = "2026-10-20T12:00:00Z";
      const arDate = formatShortDate(dateStr, "ar");
      const enDate = formatShortDate(dateStr, "en");

      expect(arDate).toBeTruthy();
      expect(enDate).toBeTruthy();
      expect(arDate).not.toBe("—");
      expect(enDate).not.toBe("—");
    });

    it("handles null, undefined, and invalid dates gracefully", () => {
      expect(formatShortDate(null)).toBe("—");
      expect(formatShortDate(undefined)).toBe("—");
      expect(formatShortDate("not-a-date")).toBe("—");
    });
  });

  describe("parseDateFormatFromSettings", () => {
    it("parses valid supported date formats", () => {
      expect(parseDateFormatFromSettings({ dateFormat: "DD/MM/YYYY" })).toBe(
        "DD/MM/YYYY",
      );
      expect(parseDateFormatFromSettings({ dateFormat: "MM/DD/YYYY" })).toBe(
        "MM/DD/YYYY",
      );
      expect(parseDateFormatFromSettings({ dateFormat: "YYYY-MM-DD" })).toBe(
        "YYYY-MM-DD",
      );
      expect(parseDateFormatFromSettings({ dateFormat: "gregorian" })).toBe(
        "gregorian",
      );
    });

    it("falls back to DEFAULT_DATE_FORMAT when given invalid or unrecognized settings", () => {
      expect(
        parseDateFormatFromSettings({ dateFormat: "unsupported_format" }),
      ).toBe(DEFAULT_DATE_FORMAT);
      expect(parseDateFormatFromSettings(null)).toBe(DEFAULT_DATE_FORMAT);
      expect(parseDateFormatFromSettings(undefined)).toBe(DEFAULT_DATE_FORMAT);
      expect(parseDateFormatFromSettings({})).toBe(DEFAULT_DATE_FORMAT);
    });

    it("handles JSON string settings correctly", () => {
      expect(
        parseDateFormatFromSettings('{"dateFormat":"DD/MM/YYYY"}'),
      ).toBe("DD/MM/YYYY");
      expect(parseDateFormatFromSettings("invalid-json")).toBe(
        DEFAULT_DATE_FORMAT,
      );
    });
  });

  describe("formatDateValue", () => {
    it("returns ok true with formatted value for valid date", () => {
      const res = formatDateValue(new Date("2026-10-28"), "DD/MM/YYYY");
      expect(res.ok).toBe(true);
      expect(res.value).toBe("28/10/2026");
      expect(res.error).toBeNull();
    });

    it("returns ok false with error for empty or missing date", () => {
      const resEmpty = formatDateValue("", "DD/MM/YYYY");
      expect(resEmpty.ok).toBe(false);
      expect(resEmpty.value).toBe("");
      expect(resEmpty.error).toBeTruthy();

      const resNull = formatDateValue(null, "DD/MM/YYYY");
      expect(resNull.ok).toBe(false);
      expect(resNull.value).toBe("");
      expect(resNull.error).toBeTruthy();
    });

    it("returns ok false with error for invalid date", () => {
      const resInvalid = formatDateValue("invalid-date", "DD/MM/YYYY");
      expect(resInvalid.ok).toBe(false);
      expect(resInvalid.value).toBe("");
      expect(resInvalid.error).toBeTruthy();
    });
  });
});

