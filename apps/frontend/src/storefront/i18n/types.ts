export type StorefrontLocale = "ar" | "en";
export type TextDirection = "rtl" | "ltr";

export interface StorefrontI18nOverrides {
  [field: string]: string | unknown;
}

export interface StorefrontI18nSettings {
  en?: Record<string, any>;
  ar?: Record<string, any>;
  [locale: string]: Record<string, any> | undefined;
}
