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
