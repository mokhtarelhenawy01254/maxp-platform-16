/**
 * Per-route SEO for the public marketing pages on the MaxP apex domain.
 *
 * Why this lives in the client: nginx serves a static shell for every apex path
 * (maxp.online / www.maxp.online), so the server-side route map
 * (apps/backend/middleware/platformSeoMiddleware.js) never runs there. The
 * build-time shells written by scripts/prerender-public-routes.mjs carry the
 * correct tags for non-JS crawlers; this module keeps them correct once the SPA
 * mounts (and fixes the canonical, which the static file pinned to the homepage
 * for EVERY route — that is what kept the marketing pages out of the index).
 *
 * Route data lives in ./public-routes.json — one source of truth shared with the
 * prerender script (no second map to keep in sync). Tenant storefronts
 * (swan.maxp.online, …) receive their tags server-side and this module is a
 * no-op on any other host, so it can never canonicalize a store page to the
 * platform domain.
 */

import routeSeoData from "./public-routes.json";

interface RawRoute {
  path: string;
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  ogType?: string;
  twitterCard?: string;
  robots?: string;
  noindex?: boolean;
}

export interface RouteSeo {
  title: string;
  description: string;
  /** Canonical path when it differs from the route itself (alias pages). */
  canonicalPath?: string;
  image?: string;
  ogType?: string;
  twitterCard?: string;
  robots?: string;
}

const ROUTES: RawRoute[] = (routeSeoData.routes || []) as RawRoute[];

const APEX_HOSTS = ["maxp.online", "www.maxp.online"];
export const SITE_ORIGIN: string = routeSeoData._origin;

/** path -> SEO entry (aliases included; canonicalPath resolves the alias target). */
export const ROUTE_SEO: Record<string, RouteSeo> = ROUTES.reduce(
  (acc, route) => {
    acc[route.path] = {
      title: route.title,
      description: route.description,
      ...(route.canonicalPath ? { canonicalPath: route.canonicalPath } : {}),
      ...(route.image ? { image: route.image } : {}),
      ...(route.ogType ? { ogType: route.ogType } : {}),
      ...(route.twitterCard ? { twitterCard: route.twitterCard } : {}),
      ...(route.robots ? { robots: route.robots } : {}),
    };
    return acc;
  },
  {} as Record<string, RouteSeo>,
);

/** Routes that must carry `<meta name="robots" content="noindex, follow">`. */
export const NOINDEX_PATHS: string[] = ROUTES.filter(
  (route) => route.noindex === true,
).map((route) => route.path);

/** Thin auth pages — kept out of the index even if a path is missing from the JSON. */
export const NOINDEX_PREFIXES = ["/auth/"];

const normalizePath = (pathname: string): string => {
  const clean = (pathname || "/").split("?")[0].split("#")[0];
  if (!clean || clean === "/") return "/";
  return clean.replace(/\/+$/, "") || "/";
};

const upsertMeta = (
  attr: "name" | "property",
  key: string,
  content: string,
): void => {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertCanonical = (href: string): void => {
  // Exactly one canonical is allowed — update the one from index.html.
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

export function buildCanonicalUrl(pathname: string): string {
  const path = normalizePath(pathname);
  const entry = ROUTE_SEO[path];
  const canonicalPath = entry?.canonicalPath ?? path;
  return `${SITE_ORIGIN}${canonicalPath === "/" ? "/" : canonicalPath}`;
}

/**
 * Applies the SEO tags for `pathname`. No-op outside the apex domain, so
 * tenant storefronts and the admin shell keep the tags the backend injected.
 */
export function applyPublicRouteSeo(pathname: string): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const host = (window.location.hostname || "").toLowerCase();
  if (!APEX_HOSTS.includes(host)) return;

  const path = normalizePath(pathname);
  const entry = ROUTE_SEO[path];
  const canonicalUrl = buildCanonicalUrl(path);

  upsertCanonical(canonicalUrl);

  if (entry) {
    document.title = entry.title;
    upsertMeta("name", "description", entry.description);
    upsertMeta("property", "og:title", entry.title);
    upsertMeta("property", "og:description", entry.description);
    upsertMeta("name", "twitter:title", entry.title);
    upsertMeta("name", "twitter:description", entry.description);
    upsertMeta("property", "og:url", canonicalUrl);

    if (entry.image) {
      const imageUrl = entry.image.startsWith("http")
        ? entry.image
        : `${SITE_ORIGIN}${entry.image.startsWith("/") ? "" : "/"}${entry.image}`;
      upsertMeta("property", "og:image", imageUrl);
      upsertMeta("name", "twitter:image", imageUrl);
    }
    if (entry.ogType) {
      upsertMeta("property", "og:type", entry.ogType);
    }
    if (entry.twitterCard) {
      upsertMeta("name", "twitter:card", entry.twitterCard);
    }
    if (entry.robots) {
      upsertMeta("name", "robots", entry.robots);
    }
  }

  const shouldNoindex =
    NOINDEX_PATHS.includes(path) ||
    NOINDEX_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (shouldNoindex) {
    upsertMeta("name", "robots", "noindex, follow");
  } else if (!entry?.robots) {
    // If route is public and no custom robots, ensure any stale noindex tag is normalized
    const robotsMeta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robotsMeta && robotsMeta.getAttribute("content")?.includes("noindex")) {
      robotsMeta.setAttribute("content", "index, follow");
    }
  }
}
