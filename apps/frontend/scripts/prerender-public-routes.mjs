#!/usr/bin/env node
/**
 * Build-time SEO shells for the MaxP apex public routes.
 *
 * nginx serves one static shell for every apex path (maxp.online / www.maxp.online)
 * and the backend never sees that HTML, so a crawler that does not execute
 * JavaScript (WhatsApp/Facebook/Telegram link previews, most non-Google bots)
 * used to get the homepage tags for every URL. This script writes, for each
 * public route, a small `dist/<route>.seo.html` — a byte-copy of the built
 * index.html with <title>/description/og/twitter/canonical (and noindex where
 * the route asks for it) plus an sr-only heading/paragraph for text-only
 * crawlers. The SPA boots from it exactly like from index.html.
 *
 * nginx picks these up via `try_files $uri $uri.seo.html /index.html`
 * (nginx_configs/maxp.online.conf) — a missing file simply falls back to the SPA
 * shell, so shipping this script without the nginx rule (or the other way
 * round) is harmless.
 *
 * The route list is NOT duplicated here: it is read from
 * src/seo/public-routes.json — the same file the client module uses.
 *
 * Usage: node scripts/prerender-public-routes.mjs [distDir]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, "dist");
const DATA_FILE = path.join(ROOT, "src", "seo", "public-routes.json");
const SUFFIX = ".seo.html";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const upsertTitle = (html, title) =>
  html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(title)}</title>`,
  );

const upsertMeta = (html, attr, key, value) => {
  if (!value) return html;
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]+${attr}=["']${escapedKey}["'][^>]*>`,
    "i",
  );
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`;
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
};

const upsertCanonical = (html, url) => {
  const tag = `<link rel="canonical" href="${escapeHtml(url)}" />`;
  const pattern = /<link[^>]+rel=["']canonical["'][^>]*>/i;
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
};

// Text-only crawlers (and any scraper that ignores JS) see this instead of an
// empty <div id="root">; React replaces the node on mount. Same pattern the
// tenant storefronts already ship (storefrontHtmlController).
const injectSemanticSnippet = (html, title, description) => {
  const snippet =
    `<div class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true">` +
    `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>`;
  if (/<div id="root"\s*><\/div>/i.test(html)) {
    return html.replace(
      /<div id="root"\s*><\/div>/i,
      `<div id="root">${snippet}</div>`,
    );
  }
  return html;
};

const main = () => {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`[prerender] ✗ route data missing: ${DATA_FILE}`);
    process.exit(1);
  }

  const indexHtmlPath = path.join(DIST, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(
      `[prerender] ✗ ${indexHtmlPath} not found — run the vite build first`,
    );
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const origin = String(data._origin || "").replace(/\/+$/, "");
  const routes = Array.isArray(data.routes) ? data.routes : [];
  const shell = fs.readFileSync(indexHtmlPath, "utf8");

  if (!/<div id="root"\s*><\/div>/i.test(shell)) {
    console.warn(
      "[prerender] ⚠ <div id=\"root\"></div> not found in the built shell — semantic snippet skipped",
    );
  }

  let written = 0;
  const writtenPaths = [];

  for (const route of routes) {
    if (route.prerender === false) continue;
    if (!route.path || !route.title || !route.description) {
      console.warn(`[prerender] ⚠ skipping incomplete route: ${route.path}`);
      continue;
    }

    const canonicalPath = route.canonicalPath || route.path;
    const canonicalUrl = `${origin}${canonicalPath === "/" ? "/" : canonicalPath}`;

    let html = shell;
    html = upsertTitle(html, route.title);
    html = upsertMeta(html, "name", "description", route.description);
    html = upsertMeta(html, "property", "og:title", route.title);
    html = upsertMeta(html, "property", "og:description", route.description);
    html = upsertMeta(html, "property", "og:url", canonicalUrl);
    html = upsertMeta(html, "name", "twitter:title", route.title);
    html = upsertMeta(html, "name", "twitter:description", route.description);
    html = upsertCanonical(html, canonicalUrl);

    if (route.image) {
      const imageUrl = route.image.startsWith("http")
        ? route.image
        : `${origin}${route.image.startsWith("/") ? "" : "/"}${route.image}`;
      html = upsertMeta(html, "property", "og:image", imageUrl);
      html = upsertMeta(html, "name", "twitter:image", imageUrl);
    }
    if (route.ogType) {
      html = upsertMeta(html, "property", "og:type", route.ogType);
    }
    if (route.twitterCard) {
      html = upsertMeta(html, "name", "twitter:card", route.twitterCard);
    }
    if (route.robots) {
      html = upsertMeta(html, "name", "robots", route.robots);
    } else if (route.noindex === true) {
      html = upsertMeta(html, "name", "robots", "noindex, follow");
    }

    html = injectSemanticSnippet(html, route.title, route.description);

    const outFile = path.join(
      DIST,
      `${String(route.path).replace(/^\/+/, "")}${SUFFIX}`,
    );
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html, "utf8");
    written += 1;
    writtenPaths.push(outFile);
  }

  // sitemap.xml from the same data (aliases/auth/ad-only routes excluded)
  const sitemapRoutes = routes.filter(
    (route) => route.sitemap && route.sitemap.include !== false,
  );
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const route of sitemapRoutes) {
    const loc = `${origin}${route.path === "/" ? "/" : route.path}`;
    xml += "  <url>\n";
    xml += `    <loc>${escapeHtml(loc)}</loc>\n`;
    if (route.sitemap.changefreq) {
      xml += `    <changefreq>${escapeHtml(route.sitemap.changefreq)}</changefreq>\n`;
    }
    if (route.sitemap.priority) {
      xml += `    <priority>${escapeHtml(route.sitemap.priority)}</priority>\n`;
    }
    xml += "  </url>\n";
  }
  xml += "</urlset>\n";
  const sitemapPath = path.join(DIST, "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf8");

  console.log(
    `[prerender] ✓ ${written} SEO shell(s) + sitemap.xml (${sitemapRoutes.length} urls) written to ${DIST}`,
  );
  for (const file of writtenPaths) {
    console.log(`[prerender]   · ${path.relative(DIST, file)}`);
  }
};

main();
