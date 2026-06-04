export const MAX_CARE_GO_THEME_ID = "max-care-go";
export const PHARMACY_DEMO_THEME_ID = "pharmacy-demo";

export const PHARMACY_THEME_IDS = new Set([
  MAX_CARE_GO_THEME_ID,
  PHARMACY_DEMO_THEME_ID,
]);

export const isPharmacyThemeId = (themeId?: string | null): boolean =>
  Boolean(themeId && PHARMACY_THEME_IDS.has(themeId));

export const isMaxCareGoThemeId = (themeId?: string | null): boolean =>
  themeId === MAX_CARE_GO_THEME_ID;
