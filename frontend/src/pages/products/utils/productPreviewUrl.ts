import { buildStoreUrl } from "../../../utils/storeUrl";

type ResolveProductPreviewCompanyIdArgs = {
  productCompanyId?: string | null;
  userCompanyId?: string | null;
  storedCompanyId?: string | null;
  queryCompanyId?: string | null;
};

type BuildProductPreviewUrlArgs = {
  origin: string;
  productId: string;
  productSlug?: string | null;
  companyId?: string | null;
  storeSlug?: string | null;
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
  storeSlug,
  customDomain,
}: BuildProductPreviewUrlArgs): string => {
  const normalizedProductId = normalizeValue(productId);
  if (!normalizedProductId) {
    return "";
  }
  const productRouteKey = normalizeValue(productSlug) || normalizedProductId;
  const productPath = `/product/${encodeURIComponent(productRouteKey)}`;
  const normalizedCompanyId = normalizeValue(companyId);
  const normalizedStoreSlug = normalizeValue(storeSlug);
  const normalizedCustomDomain = normalizeValue(customDomain);

  if (normalizedStoreSlug || normalizedCustomDomain) {
    return buildStoreUrl(
      normalizedStoreSlug || normalizedCompanyId || "",
      productPath,
      normalizedCustomDomain || undefined,
      normalizedCompanyId,
    );
  }

  const url = new URL(
    `/store${productPath}`,
    origin,
  );

  if (normalizedCompanyId) {
    url.searchParams.set("companyId", normalizedCompanyId);
  }

  return url.toString();
};
