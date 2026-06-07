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
}: BuildProductPreviewUrlArgs): string => {
  const normalizedProductId = normalizeValue(productId);
  if (!normalizedProductId) {
    return "";
  }
  const productRouteKey = normalizeValue(productSlug) || normalizedProductId;

  const url = new URL(
    `/store/product/${encodeURIComponent(productRouteKey)}`,
    origin,
  );
  const normalizedCompanyId = normalizeValue(companyId);

  if (normalizedCompanyId) {
    url.searchParams.set("companyId", normalizedCompanyId);
  }

  url.searchParams.set("productPreview", "1");
  url.searchParams.set("previewSource", "admin");
  url.searchParams.set("previewProductId", normalizedProductId);

  return url.toString();
};

export const buildProductPublicUrl = ({
  origin,
  productId,
  productSlug,
  companyId,
}: BuildProductPreviewUrlArgs): string => {
  const normalizedProductId = normalizeValue(productId);
  if (!normalizedProductId) {
    return "";
  }
  const productRouteKey = normalizeValue(productSlug) || normalizedProductId;

  const url = new URL(
    `/store/product/${encodeURIComponent(productRouteKey)}`,
    origin,
  );
  const normalizedCompanyId = normalizeValue(companyId);

  if (normalizedCompanyId) {
    url.searchParams.set("companyId", normalizedCompanyId);
  }

  return url.toString();
};
