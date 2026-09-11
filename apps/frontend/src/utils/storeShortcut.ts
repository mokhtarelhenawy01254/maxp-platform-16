import { buildStoreUrl } from "./storeUrl";

export const STORE_APP_SLUGS = [
  "store",
  "store-basic",
  "store-pro",
  "ecommerce-basic",
  "ecommerce-pro",
] as const;

export type StoreAppSlug = (typeof STORE_APP_SLUGS)[number];

export const isStoreAppSlug = (slug?: string | null): boolean =>
  Boolean(slug && STORE_APP_SLUGS.includes(String(slug).toLowerCase() as StoreAppSlug));


export interface StoreShortcutInput {
  activeApps?: string[];
  companySlug?: string | null;
  companyId?: string | null;
  customDomain?: string | null;
}

export const hasStoreApp = (activeApps?: string[]): boolean =>
  Array.isArray(activeApps) &&
  activeApps.some((appSlug) =>
    STORE_APP_SLUGS.includes(String(appSlug).toLowerCase()),
  );

export const buildStoreShortcutUrl = (
  input: StoreShortcutInput,
): string | null => {
  if (!hasStoreApp(input.activeApps) || !input.companySlug) {
    return null;
  }

  return buildStoreUrl(
    input.companySlug,
    "/",
    input.customDomain || undefined,
    input.companyId || undefined,
  );
};