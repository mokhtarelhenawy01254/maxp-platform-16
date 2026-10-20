import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatShortDate,
  formatTime,
  formatDateTime,
  getTimeAgo,
  isEnglishLocale,
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
});

