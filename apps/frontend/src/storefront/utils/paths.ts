import {
  applyCatalogFilters,
  type CatalogPriceRangeValue,
  type CatalogSortValue,
} from "./catalogFilters";
import { getBaseDomain } from "../../utils/storeUrl";

const STOREFRONT_PRODUCT_PATH_PATTERN =
  /^\/(?:store\/)?(?:product|shop\/products)\/([^/?#]+)\/?$/;
const STOREFRONT_PREVIEW_QUERY_KEYS = [
  "companyId",
  "previewTheme",
  "previewSource",
  "previewAdminOrigin",
] as const;

type NullablePathInput = string | null | undefined;

const normalizePathnameInput = (value: NullablePathInput): string =>
  typeof value === "string" ? value : "";

const normalizeRouteInput = (value: NullablePathInput): string => {
  const trimmedValue = typeof value === "string" ? value.trim() : "";
  if (!trimmedValue) {
    return "/";
  }

  return trimmedValue.startsWith("/") ? trimmedValue : `/${trimmedValue}`;
};

const normalizeSearchInput = (value: NullablePathInput): string =>
  typeof value === "string" ? value : "";

export const getStorefrontBasePath = (pathname: NullablePathInput): string => {
  return normalizePathnameInput(pathname).startsWith("/store") ? "/store" : "";
};

export const buildStorefrontPath = (
  pathname: NullablePathInput,
  route: NullablePathInput,
  search: NullablePathInput = "",
): string => {
  const basePath = getStorefrontBasePath(pathname);
  const normalizedRoute = normalizeRouteInput(route);
  const routeTarget = new URL(
    normalizedRoute,
    "https://storefront.local",
  );
  const nextPath = basePath
    ? `${basePath}${routeTarget.pathname}`
    : routeTarget.pathname;
  const currentParams = new URLSearchParams(normalizeSearchInput(search));
  const nextParams = new URLSearchParams(routeTarget.search);

  STOREFRONT_PREVIEW_QUERY_KEYS.forEach((key) => {
    const value = currentParams.get(key);
    if (value && !nextParams.has(key)) {
      nextParams.set(key, value);
    }
  });

  const queryString = nextParams.toString();
  return `${nextPath}${queryString ? `?${queryString}` : ""}${routeTarget.hash}`;
};

export const getStorefrontProductRouteKey = (
  pathname: NullablePathInput,
): string | null => {
  const normalizedPathname =
    normalizePathnameInput(pathname).replace(/\/+$/, "") || "/";
  const match = normalizedPathname.match(STOREFRONT_PRODUCT_PATH_PATTERN);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

interface BuildStorefrontPreviewPathOptions {
  companyId?: string | null;
  companySlug?: string | null;
  customDomain?: string | null;
  previewTheme?: string | null;
  previewSource?: string | null;
  previewAdminOrigin?: string | null;
}

const isIpAddress = (hostname: string): boolean =>
  /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

const isLocalPreviewDomain = (domainWithOptionalPort: string): boolean => {
  const hostname = (domainWithOptionalPort.split(":")[0] || "").toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "lvh.me" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".lvh.me") ||
    hostname.endsWith(".test") ||
    isIpAddress(hostname)
  );
};

export const buildStorefrontPreviewPath = (
  route: NullablePathInput,
  options: BuildStorefrontPreviewPathOptions = {},
): string => {
  const companyId = options.companyId?.trim() || "";
  const companySlug = options.companySlug?.trim() || "";
  const customDomain = options.customDomain?.trim() || "";

  if (!companySlug && !customDomain && !companyId) {
    return "";
  }

  const routePath = normalizeRouteInput(route);
  const subdomainSlug = companySlug || companyId;
  const previewUrl = customDomain
    ? `https://${customDomain}${routePath}`
    : `${isLocalPreviewDomain(getBaseDomain()) ? "http:" : window.location.protocol}//${subdomainSlug}.${getBaseDomain()}${routePath}`;
  const url = new URL(previewUrl, window.location.origin);

  if (options.previewTheme?.trim()) {
    url.searchParams.set("previewTheme", options.previewTheme.trim());
  }

  if (options.previewSource?.trim()) {
    url.searchParams.set("previewSource", options.previewSource.trim());
  }

  if (options.previewAdminOrigin?.trim()) {
    url.searchParams.set("previewAdminOrigin", options.previewAdminOrigin.trim());
  }

  return url.toString();
};

export const resolveStorefrontPreviewAdminOrigin = (
  search: NullablePathInput = window.location.search,
): string | null => {
  const rawOrigin = new URLSearchParams(normalizeSearchInput(search))
    .get("previewAdminOrigin")
    ?.trim();
  if (!rawOrigin) {
    return null;
  }

  try {
    const parsed = new URL(rawOrigin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
};

export const resolveImplicitStorefrontPreviewAdminOrigin = (
  currentHost = window.location.host,
  protocol = window.location.protocol,
  baseHost = getBaseDomain(),
): string | null => {
  const normalizedCurrentHost = currentHost.toLowerCase();
  const normalizedBaseHost = baseHost.toLowerCase();

  if (!normalizedBaseHost || normalizedCurrentHost === normalizedBaseHost) {
    return null;
  }

  if (normalizedCurrentHost.endsWith(`.${normalizedBaseHost}`)) {
    return `${protocol}//${normalizedBaseHost}`;
  }

  return null;
};

export const buildStorefrontPreviewAdminPath = (
  route: NullablePathInput,
  search: NullablePathInput = window.location.search,
): string => {
  const adminOrigin =
    resolveStorefrontPreviewAdminOrigin(search) ||
    resolveImplicitStorefrontPreviewAdminOrigin();
  const normalizedRoute = normalizeRouteInput(route);

  if (!adminOrigin) {
    const relativeTarget = new URL(normalizedRoute, "https://storefront-admin.local");
    return `${relativeTarget.pathname}${relativeTarget.search}${relativeTarget.hash}`;
  }

  const target = new URL(normalizedRoute, adminOrigin);
  return target.toString();
};

export const buildStorefrontProductPreviewPath = (
  productSlugOrId: string,
  options: BuildStorefrontPreviewPathOptions = {},
): string => {
  const normalizedProductKey = productSlugOrId.trim();
  return buildStorefrontPreviewPath(
    `/product/${encodeURIComponent(normalizedProductKey)}`,
    options,
  );
};

interface BuildStorefrontCatalogPreviewPathOptions
  extends BuildStorefrontPreviewPathOptions {
  pageKey?: "shop" | "sale";
  categoryId?: string | null;
  sortValue?: CatalogSortValue;
  priceRangeValue?: CatalogPriceRangeValue | null;
}

export const buildStorefrontCatalogPreviewPath = (
  options: BuildStorefrontCatalogPreviewPathOptions = {},
): string => {
  const pageKey = options.pageKey || "shop";
  const nextParams = applyCatalogFilters(new URLSearchParams(), {
    categoryId: options.categoryId ?? null,
    sortValue: options.sortValue || "featured",
    priceRangeValue: options.priceRangeValue ?? null,
  });
  const routeBase = pageKey === "sale" ? "/sale" : "/shop";
  const queryString = nextParams.toString();

  return buildStorefrontPreviewPath(
    `${routeBase}${queryString ? `?${queryString}` : ""}`,
    options,
  );
};
