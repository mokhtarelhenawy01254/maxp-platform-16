import { buildStoreUrl } from "../../../utils/storeUrl";

type ResolveProductPreviewCompanyIdArgs = {
  productCompanyId?: string | null;
  userCompanyId?: string | null;
  storedCompanyId?: string | null;
  queryCompanyId?: string | null;
};

export type BuildProductPreviewUrlArgs = {
  origin?: string;
  productId: string;
  productSlug?: string | null;
  companyId?: string | null;
  companySlug?: string | null;
  customDomain?: string | null;
};

const normalizeValue = (value?: string | null): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const resolveProductPreviewCompanyId = ({
  productCompanyId,
  userCompanyId,
  storedCompanyId,
  queryCompanyId,
}: ResolveProductPreviewCompanyIdArgs): string | null => {
  return (
    normalizeValue(productCompanyId) ||
    normalizeValue(userCompanyId) ||
    normalizeValue(storedCompanyId) ||
    normalizeValue(queryCompanyId)
  );
};

export const buildProductPreviewUrl = ({
  origin,
  productId,
  productSlug,
  companyId,
  companySlug,
  customDomain,
}: BuildProductPreviewUrlArgs): string => {
  const normalizedProductId = normalizeValue(productId);
  if (!normalizedProductId) {
    return "";
  }
  const productRouteKey = normalizeValue(productSlug) || normalizedProductId;
  const normalizedCompanySlug = normalizeValue(companySlug);
  const normalizedCustomDomain = normalizeValue(customDomain);
  const normalizedCompanyId = normalizeValue(companyId);

  // If company slug or custom domain is available, preview directly on the merchant's store subdomain
  if (normalizedCompanySlug || normalizedCustomDomain) {
    const rawStoreUrl = buildStoreUrl(
      normalizedCompanySlug || "",
      `/product/${encodeURIComponent(productRouteKey)}`,
      normalizedCustomDomain || undefined,
      normalizedCompanyId,
    );
    const storeUrl = new URL(rawStoreUrl);
    storeUrl.searchParams.set("preview", "1");
    return storeUrl.toString();
  }

  const fallbackOrigin =
    normalizeValue(origin) ||
    (typeof window !== "undefined" ? window.location.origin : "https://maxp.online");

  const url = new URL(
    `/store/product/${encodeURIComponent(productRouteKey)}`,
    fallbackOrigin,
  );

  if (normalizedCompanyId) {
    url.searchParams.set("companyId", normalizedCompanyId);
  }

  url.searchParams.set("preview", "1");

  return url.toString();
};

export const buildProductPublicUrl = ({
  origin,
  productId,
  productSlug,
  companyId,
  companySlug,
  customDomain,
}: BuildProductPreviewUrlArgs): string => {
  const normalizedProductId = normalizeValue(productId);
  if (!normalizedProductId) {
    return "";
  }
  const productRouteKey = normalizeValue(productSlug) || normalizedProductId;
  const normalizedCompanySlug = normalizeValue(companySlug);
  const normalizedCustomDomain = normalizeValue(customDomain);
  const normalizedCompanyId = normalizeValue(companyId);

  // Direct public link on the merchant's store subdomain
  if (normalizedCompanySlug || normalizedCustomDomain) {
    return buildStoreUrl(
      normalizedCompanySlug || "",
      `/product/${encodeURIComponent(productRouteKey)}`,
      normalizedCustomDomain || undefined,
      normalizedCompanyId,
    );
  }

  const fallbackOrigin =
    normalizeValue(origin) ||
    (typeof window !== "undefined" ? window.location.origin : "https://maxp.online");

  const url = new URL(
    `/store/product/${encodeURIComponent(productRouteKey)}`,
    fallbackOrigin,
  );

  if (normalizedCompanyId) {
    url.searchParams.set("companyId", normalizedCompanyId);
  }

  return url.toString();
};

