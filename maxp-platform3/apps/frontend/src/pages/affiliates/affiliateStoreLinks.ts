import { buildStoreUrl } from "../../utils/storeUrl";

export interface AffiliateStoreCompany {
  id?: string | null;
  slug?: string | null;
  customDomain?: string | null;
}

export interface AffiliateStoreProfile {
  affiliateCode?: string | null;
  companyId?: string | null;
  company?: AffiliateStoreCompany | null;
}

const getSafeString = (value: string | null | undefined): string =>
  typeof value === "string" ? value.trim() : "";

const buildFallbackStoreUrl = (route: string, companyId: string): string => {
  const target = new URL(`/store${route}`, window.location.origin);
  if (companyId) {
    target.searchParams.set("companyId", companyId);
  }
  return target.toString();
};

export const buildAffiliateStoreUrl = (
  affiliate: AffiliateStoreProfile | null | undefined,
  route: string,
): string => {
  const companyId =
    getSafeString(affiliate?.company?.id) || getSafeString(affiliate?.companyId);
  const slug = getSafeString(affiliate?.company?.slug);
  const identifier = slug || companyId;
  const customDomain = getSafeString(affiliate?.company?.customDomain);
  const cleanRoute = route.startsWith("/") ? route : `/${route}`;
  const rawUrl = identifier
    ? buildStoreUrl(
        identifier,
        cleanRoute,
        customDomain || undefined,
        companyId || null,
      )
    : buildFallbackStoreUrl(cleanRoute, companyId);

  const target = new URL(rawUrl, window.location.origin);
  const affiliateCode = getSafeString(affiliate?.affiliateCode);
  if (affiliateCode) {
    target.searchParams.set("ref", affiliateCode);
  }

  return target.toString();
};

export const buildAffiliateCatalogUrl = (
  affiliate: AffiliateStoreProfile | null | undefined,
): string => buildAffiliateStoreUrl(affiliate, "/shop");

export const buildAffiliateProductUrl = (
  affiliate: AffiliateStoreProfile | null | undefined,
  productKey: string,
): string =>
  buildAffiliateStoreUrl(
    affiliate,
    `/product/${encodeURIComponent(productKey)}`,
  );
