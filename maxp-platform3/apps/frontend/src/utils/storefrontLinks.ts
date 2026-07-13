import { getCompanyId } from "./storefrontApi";

const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export const withStorefrontCompany = (
  href: string,
  companyId?: string | null,
): string => {
  const normalizedHref = String(href || "").trim();
  if (!normalizedHref) {
    return "/";
  }

  const resolvedCompanyId = companyId || getCompanyId();
  if (!resolvedCompanyId) {
    return normalizedHref;
  }

  if (ABSOLUTE_URL_PATTERN.test(normalizedHref)) {
    try {
      const url = new URL(
        normalizedHref,
        typeof window !== "undefined" ? window.location.origin : "http://localhost",
      );
      if (!url.searchParams.has("companyId")) {
        url.searchParams.set("companyId", resolvedCompanyId);
      }
      return url.toString();
    } catch {
      return normalizedHref;
    }
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(
    normalizedHref.startsWith("/") ? normalizedHref : `/${normalizedHref}`,
    origin,
  );

  if (!url.searchParams.has("companyId")) {
    url.searchParams.set("companyId", resolvedCompanyId);
  }

  return `${url.pathname}${url.search}${url.hash}`;
};
