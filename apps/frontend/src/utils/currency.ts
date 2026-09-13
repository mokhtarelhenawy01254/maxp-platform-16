import i18n from "i18next";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  nameAr: string;
}

// Supported currencies
export const SUPPORTED_CURRENCIES: Currency[] = [
  {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "ج.م",
    nameAr: "جنيه مصري",
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    nameAr: "دولار أمريكي",
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    nameAr: "يورو",
  },
  {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "ر.س",
    nameAr: "ريال سعودي",
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    nameAr: "درهم إماراتي",
  },
];

// Default currency
export const DEFAULT_CURRENCY = "EGP";

// Get currency by code
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return SUPPORTED_CURRENCIES.find((currency) => currency.code === code);
};

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

// Format currency amount
export const formatCurrency = (
  amount: number | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY,
  locale?: string,
): string => {
  // Handle null or undefined
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "-";
  }

  const isEn = isEnglishLocale(locale);
  const currency = getCurrencyByCode(currencyCode);

  if (!currency) {
    return isEn
      ? `${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyCode}`
      : `${Number(amount).toLocaleString("ar-EG")} ${currencyCode}`;
  }

  // Format Egyptian Pound
  if (currencyCode === "EGP") {
    if (isEn) {
      const formattedNum = Number(amount).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return `${formattedNum} EGP`;
    }
    return `${Number(amount).toLocaleString("ar-EG")} ${currency.symbol}`;
  }

  // Format with appropriate locale for other currencies
  if (isEn) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${Number(amount).toLocaleString("en-US")} ${currencyCode}`;
    }
  }

  try {
    return new Intl.NumberFormat(locale || "ar-EG", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${currency.symbol}${Number(amount).toLocaleString("ar-EG")}`;
  }
};

// Format currency for display in forms
export const formatCurrencyInput = (
  amount: number | string | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY,
  locale?: string,
): string => {
  if (amount === null || amount === undefined) {
    return "";
  }

  const currency = getCurrencyByCode(currencyCode);
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (!currency || isNaN(numAmount)) {
    return "";
  }

  const isEn = isEnglishLocale(locale);
  const symbol = isEn && currencyCode === "EGP" ? "EGP" : currency.symbol;

  return `${numAmount} ${symbol}`;
};

// Parse currency input
export const parseCurrencyInput = (input: string): number => {
  // Remove currency symbols and spaces
  const cleaned = input.replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Get currency symbol
export const getCurrencySymbol = (
  currencyCode: string = DEFAULT_CURRENCY,
  locale?: string,
): string => {
  const isEn = isEnglishLocale(locale);
  if (isEn && currencyCode === "EGP") {
    return "EGP";
  }
  const currency = getCurrencyByCode(currencyCode);
  return currency?.symbol || currencyCode;
};

// Validate currency code
export const isValidCurrencyCode = (code: string): boolean => {
  return SUPPORTED_CURRENCIES.some((currency) => currency.code === code);
};
