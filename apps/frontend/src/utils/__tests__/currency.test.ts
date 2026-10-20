import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCurrencyInput,
  getCurrencySymbol,
  isEnglishLocale,
} from "../currency";

describe("currency utility", () => {
  describe("isEnglishLocale", () => {
    it("returns true for en locale", () => {
      expect(isEnglishLocale("en")).toBe(true);
      expect(isEnglishLocale("en-US")).toBe(true);
      expect(isEnglishLocale("en-GB")).toBe(true);
    });

    it("returns false for ar locale", () => {
      expect(isEnglishLocale("ar")).toBe(false);
      expect(isEnglishLocale("ar-EG")).toBe(false);
    });
  });

  describe("formatCurrency", () => {
    it("formats null or undefined or NaN as '-'", () => {
      expect(formatCurrency(null)).toBe("-");
      expect(formatCurrency(undefined)).toBe("-");
      expect(formatCurrency(NaN)).toBe("-");
    });

    it("formats EGP with English locale using Western numerals and 'EGP'", () => {
      const result = formatCurrency(620, "EGP", "en-US");
      expect(result).toBe("620 EGP");

      const decimalResult = formatCurrency(1250.5, "EGP", "en-US");
      expect(decimalResult).toBe("1,250.5 EGP");
    });

    it("formats EGP with Arabic locale using Eastern Arabic numerals and 'ج.م'", () => {
      const result = formatCurrency(620, "EGP", "ar-EG");
      // Arabic formatted string contains Arabic digits and ج.م
      expect(result).toContain("ج.م");
      expect(result).toMatch(/[٠-٩]/);
    });

    it("formats USD with English locale", () => {
      const result = formatCurrency(100, "USD", "en-US");
      expect(result).toContain("100");
      expect(result).toContain("$");
    });

    it("formats with options object: thousands separator and 2 decimals in Arabic", () => {
      expect(formatCurrency(1234.5, { locale: "ar" })).toBe("1,234.50 ج.م");
      expect(formatCurrency(1000000, { locale: "ar" })).toBe("1,000,000.00 ج.م");
      expect(formatCurrency(0, { locale: "ar" })).toBe("0.00 ج.م");
    });

    it("formats with options object: English locale with EGP", () => {
      expect(formatCurrency(1234.5, { locale: "en" })).toBe("1,234.50 EGP");
      expect(formatCurrency(50, { locale: "en" })).toBe("50.00 EGP");
    });

    it("handles string decimal numbers correctly", () => {
      expect(formatCurrency("2500.75", { locale: "ar" })).toBe("2,500.75 ج.م");
      expect(formatCurrency("99.9", { locale: "en" })).toBe("99.90 EGP");
    });

    it("handles null, undefined, empty string, and NaN safely with options", () => {
      expect(formatCurrency(null, { locale: "ar" })).toBe("0.00 ج.م");
      expect(formatCurrency(undefined, { locale: "en" })).toBe("0.00 EGP");
      expect(formatCurrency("", { locale: "ar" })).toBe("0.00 ج.م");
      expect(formatCurrency("invalid-number", { locale: "ar" })).toBe("0.00 ج.م");
    });

    it("omits currency symbol when currency: false", () => {
      expect(formatCurrency(1500.5, { currency: false })).toBe("1,500.50");
    });

    it("formats negative numbers cleanly", () => {
      expect(formatCurrency(-500.25, { locale: "ar" })).toBe("-500.25 ج.م");
      expect(formatCurrency(-1200, { locale: "en" })).toBe("-1,200.00 EGP");
    });
  });

  describe("getCurrencySymbol", () => {
    it("returns 'EGP' for English locale", () => {
      expect(getCurrencySymbol("EGP", "en-US")).toBe("EGP");
    });

    it("returns 'ج.م' for Arabic locale", () => {
      expect(getCurrencySymbol("EGP", "ar-EG")).toBe("ج.م");
    });

    it("returns '$' for USD", () => {
      expect(getCurrencySymbol("USD", "en-US")).toBe("$");
    });
  });

  describe("formatCurrencyInput", () => {
    it("formats input for English", () => {
      expect(formatCurrencyInput(620, "EGP", "en-US")).toBe("620 EGP");
    });

    it("formats input for Arabic", () => {
      expect(formatCurrencyInput(620, "EGP", "ar-EG")).toBe("620 ج.م");
    });
  });
});
