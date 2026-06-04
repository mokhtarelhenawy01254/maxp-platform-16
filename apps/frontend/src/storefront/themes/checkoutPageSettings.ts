import type { StorefrontPageConfig } from "../types/theme.types";

const parseBooleanPageSetting = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true") {
      return true;
    }
    if (normalizedValue === "false") {
      return false;
    }
  }

  return null;
};

export const shouldInjectCheckoutCartItems = (
  page: StorefrontPageConfig | undefined,
) => {
  const injectCartItemsSetting = parseBooleanPageSetting(
    page?.settings?.["injectCartItems"],
  );

  return injectCartItemsSetting !== false;
};
