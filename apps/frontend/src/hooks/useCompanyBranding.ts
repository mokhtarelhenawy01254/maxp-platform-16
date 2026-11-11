import { useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";
import { envConfig, getApiUrl } from "../config/environment";
import { getPortalKeyFromPath, isPortalPath } from "../config/portals";
import {
  getCurrentSubdomainFromHost,
  getPortalSubdomainHeaders,
} from "../utils/portalSessionManager";

export interface CompanyBranding {
  logo: string | null;
  name: string;
  accent: string;
  loading: boolean;
  secondaryColor?: string;
  themeMode?: string;
  supportPhone?: string | null;
  companyId?: string | null;
  slug?: string | null;
  publicCode?: string | null;
  customDomain?: string | null;
}

const EMPTY: CompanyBranding = {
  logo: null,
  name: "",
  accent: "",
  loading: true,
};

export function resolveBrandingLogoUrl(logo?: string | null): string | null {
  if (!logo || !logo.trim()) return null;
  const trimmed = logo.trim();
  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;
  const base = envConfig.backendUrl.replace(/\/+$/, "");
  return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function normalizeColor(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb") ||
    trimmed.startsWith("hsl") ||
    trimmed.startsWith("var(")
  ) {
    return trimmed;
  }
  return `#${trimmed}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getSearchParamsSafe(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  try {
    return new URLSearchParams(window.location.search || "");
  } catch {
    return new URLSearchParams();
  }
}

function parsePortalBrandingResponse(rawResData: unknown): CompanyBranding {
  const root = asRecord(rawResData);
  const data = asRecord(root["data"] ?? root);
  const company = asRecord(data["company"] ?? data);
  const brandingObj = asRecord(data["branding"]);
  const storefront = asRecord(data["storefront"]);
  const storefrontSettings = asRecord(storefront["settings"]);
  const designTokens = asRecord(storefront["designTokens"]);
  const colors = asRecord(
    Object.keys(brandingObj).length > 0 ? brandingObj : designTokens["colors"],
  );

  const accent = normalizeColor(
    data["accent"] ??
      data["primaryColor"] ??
      brandingObj["primaryColor"] ??
      colors["primary"] ??
      colors["primaryColor"] ??
      colors["accent"],
  );
  const secondaryColor = normalizeColor(
    data["secondaryColor"] ??
      brandingObj["secondaryColor"] ??
      colors["secondary"] ??
      colors["secondaryColor"],
  );

  return {
    logo: strOrNull(data["logo"] ?? company["logo"]),
    name:
      strOrNull(data["name"]) ||
      strOrNull(data["companyName"]) ||
      strOrNull(company["name"]) ||
      strOrNull(storefrontSettings["storeName"]) ||
      strOrNull(company["nameAr"]) ||
      "",
    accent,
    loading: false,
    ...(secondaryColor ? { secondaryColor } : {}),
    ...(strOrNull(data["themeMode"] ?? data["mode"])
      ? { themeMode: strOrNull(data["themeMode"] ?? data["mode"]) ?? undefined }
      : {}),
    supportPhone: strOrNull(
      data["supportPhone"] ??
        data["phone"] ??
        company["supportPhone"] ??
        company["phone"],
    ),
    companyId: strOrNull(data["companyId"] ?? company["id"]),
    slug: strOrNull(data["slug"] ?? company["slug"]),
    publicCode: strOrNull(
      data["publicCode"] ?? data["code"] ?? company["publicCode"],
    ),
    customDomain: strOrNull(data["customDomain"] ?? company["customDomain"]),
  };
}

function parseStorefrontFallbackResponse(rawResData: unknown): CompanyBranding {
  const root = asRecord(rawResData);
  const data = asRecord(root["data"]);
  const company = asRecord(data["company"]);
  const storefront = asRecord(data["storefront"]);
  const storefrontSettings = asRecord(storefront["settings"]);
  const designTokens = asRecord(storefront["designTokens"]);
  const colors = asRecord(designTokens["colors"]);

  const accent = normalizeColor(
    colors["primary"] ?? colors["primaryColor"] ?? colors["accent"],
  );

  return {
    logo: strOrNull(company["logo"]),
    name:
      strOrNull(company["name"]) ||
      strOrNull(storefrontSettings["storeName"]) ||
      strOrNull(company["nameAr"]) ||
      "",
    accent,
    loading: false,
    companyId: strOrNull(company["id"]),
    slug: strOrNull(company["slug"]),
    customDomain: strOrNull(company["customDomain"]),
  };
}

/**
 * Fetches tenant branding (logo, name, accent, metadata) for isolated portals
 * and storefronts. Uses `/public/portal/branding` with automatic 404 fallback
 * to `/public/storefront/settings`, and applies dynamic portal CSS tokens and
 * PWA head tags exclusively on portal routes.
 */
export const useCompanyBranding = (
  companyId?: string | null,
): CompanyBranding => {
  const [branding, setBranding] = useState<CompanyBranding>(EMPTY);
  const search = typeof window !== "undefined" ? window.location.search : "";

  useEffect(() => {
    let active = true;
    setBranding(EMPTY);

    const searchParams = getSearchParamsSafe();
    const hostSubdomain = getCurrentSubdomainFromHost();
    const slugParam = searchParams.get("slug")?.trim() || "";
    const codeParam = searchParams.get("code")?.trim() || "";
    const urlCompanyId = searchParams.get("companyId")?.trim() || "";
    const resolvedCompanyId = (companyId?.trim() || urlCompanyId || "").trim();

    const shouldSendCompanyId =
      Boolean(resolvedCompanyId) &&
      (!hostSubdomain ||
        resolvedCompanyId.toLowerCase() !== hostSubdomain.toLowerCase());

    const queryParams = new URLSearchParams();
    if (shouldSendCompanyId) queryParams.set("companyId", resolvedCompanyId);
    if (slugParam) queryParams.set("slug", slugParam);
    if (codeParam) queryParams.set("code", codeParam);
    const queryStr = queryParams.toString();

    const requestConfig = {
      headers: getPortalSubdomainHeaders(),
      _skipErrorToast: true as const,
    };

    (async () => {
      try {
        const res = await apiClient.get(
          queryStr
            ? `/public/portal/branding?${queryStr}`
            : "/public/portal/branding",
          requestConfig,
        );
        if (!active) return;
        setBranding(parsePortalBrandingResponse(res.data));
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          try {
            const fallbackQuery = shouldSendCompanyId
              ? `?companyId=${encodeURIComponent(resolvedCompanyId)}`
              : "";
            const fallbackRes = await apiClient.get(
              `/public/storefront/settings${fallbackQuery}`,
              requestConfig,
            );
            if (!active) return;
            setBranding(parseStorefrontFallbackResponse(fallbackRes.data));
            return;
          } catch {
            // Fall through to mark loading complete
          }
        }
        if (active) setBranding((prev) => ({ ...prev, loading: false }));
      }
    })();

    return () => {
      active = false;
    };
  }, [companyId, search]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    const pathname = window.location.pathname || "/";
    if (!isPortalPath(pathname)) {
      return;
    }

    const rootStyle = document.documentElement.style;
    const prevPortalPrimary = rootStyle.getPropertyValue("--portal-primary");
    const prevCompanyPrimary = rootStyle.getPropertyValue("--company-primary");

    if (branding.accent) {
      rootStyle.setProperty("--portal-primary", branding.accent);
      rootStyle.setProperty("--company-primary", branding.accent);
    }

    const searchParams = getSearchParamsSafe();
    const hostSubdomain = getCurrentSubdomainFromHost();
    const portalKey = getPortalKeyFromPath(pathname);
    const manifestParams = new URLSearchParams();
    if (portalKey) manifestParams.set("portal", portalKey);

    const manifestCompanyId =
      branding.companyId ||
      (companyId &&
      (!hostSubdomain ||
        companyId.toLowerCase() !== hostSubdomain.toLowerCase())
        ? companyId
        : null) ||
      searchParams.get("companyId")?.trim() ||
      null;
    const manifestSlug =
      branding.slug ||
      searchParams.get("slug")?.trim() ||
      hostSubdomain ||
      null;
    const manifestCode =
      branding.publicCode || searchParams.get("code")?.trim() || null;

    if (manifestCompanyId) manifestParams.set("companyId", manifestCompanyId);
    if (manifestSlug) manifestParams.set("slug", manifestSlug);
    if (manifestCode) manifestParams.set("code", manifestCode);

    const manifestQuery = manifestParams.toString();
    const baseApi = getApiUrl().replace(/\/+$/, "");
    const manifestHref = `${baseApi}/public/portal/manifest.json${manifestQuery ? `?${manifestQuery}` : ""}`;

    let manifestEl = document.querySelector(
      'link[rel="manifest"]',
    ) as HTMLLinkElement | null;
    const createdManifest = !manifestEl;
    const prevManifestHref = manifestEl?.getAttribute("href") ?? null;
    if (!manifestEl) {
      manifestEl = document.createElement("link");
      manifestEl.rel = "manifest";
      document.head.appendChild(manifestEl);
    }
    manifestEl.href = manifestHref;

    let themeMetaEl: HTMLMetaElement | null = null;
    let createdThemeMeta = false;
    let prevThemeMetaContent: string | null = null;
    if (branding.accent) {
      themeMetaEl = document.querySelector(
        'meta[name="theme-color"]',
      ) as HTMLMetaElement | null;
      createdThemeMeta = !themeMetaEl;
      prevThemeMetaContent = themeMetaEl?.getAttribute("content") ?? null;
      if (!themeMetaEl) {
        themeMetaEl = document.createElement("meta");
        themeMetaEl.name = "theme-color";
        document.head.appendChild(themeMetaEl);
      }
      themeMetaEl.content = branding.accent;
    }

    let appleTitleEl: HTMLMetaElement | null = null;
    let createdAppleTitle = false;
    let prevAppleTitleContent: string | null = null;
    if (branding.name) {
      appleTitleEl = document.querySelector(
        'meta[name="apple-mobile-web-app-title"]',
      ) as HTMLMetaElement | null;
      createdAppleTitle = !appleTitleEl;
      prevAppleTitleContent = appleTitleEl?.getAttribute("content") ?? null;
      if (!appleTitleEl) {
        appleTitleEl = document.createElement("meta");
        appleTitleEl.name = "apple-mobile-web-app-title";
        document.head.appendChild(appleTitleEl);
      }
      appleTitleEl.content = branding.name;
    }

    return () => {
      if (branding.accent) {
        if (prevPortalPrimary) {
          rootStyle.setProperty("--portal-primary", prevPortalPrimary);
        } else {
          rootStyle.removeProperty("--portal-primary");
        }
        if (prevCompanyPrimary) {
          rootStyle.setProperty("--company-primary", prevCompanyPrimary);
        } else {
          rootStyle.removeProperty("--company-primary");
        }
      }

      if (manifestEl) {
        if (createdManifest) {
          manifestEl.remove();
        } else if (prevManifestHref !== null) {
          manifestEl.href = prevManifestHref;
        }
      }

      if (themeMetaEl) {
        if (createdThemeMeta) {
          themeMetaEl.remove();
        } else if (prevThemeMetaContent !== null) {
          themeMetaEl.content = prevThemeMetaContent;
        }
      }

      if (appleTitleEl) {
        if (createdAppleTitle) {
          appleTitleEl.remove();
        } else if (prevAppleTitleContent !== null) {
          appleTitleEl.content = prevAppleTitleContent;
        }
      }
    };
  }, [branding.accent, branding.name, branding.companyId, branding.slug, branding.publicCode, companyId]);

  return branding;
};
