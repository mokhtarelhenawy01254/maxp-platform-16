"use strict";

const fs = require("fs");
const path = require("path");

const {
  getSharedPrismaClientAsync,
  safeQuery,
} = require("../services/sharedDatabase");
const { getPublicProductSlug } = require("../utils/productSlugValidation");

const isApexHost = (hostname) => {
  const h = String(hostname || "").split(":")[0].trim().toLowerCase();
  return (
    h === "maxp.online" ||
    h === "www.maxp.online" ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
};

const escapeXml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const formatDate = (date) => {
  try {
    if (!date) return new Date().toISOString().split("T")[0];
    const d = new Date(date);
    return isNaN(d.getTime())
      ? new Date().toISOString().split("T")[0]
      : d.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

const resolveAbsoluteImageUrl = (url, baseUrl) => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return `${baseUrl.replace(/\/$/, "")}/${trimmed.replace(/^\//, "")}`;
};

const parseImageList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((img) => typeof img === "string" && img.trim());
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((img) => typeof img === "string" && img.trim());
    }
  } catch {
    return String(value)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

exports.handleStorefrontSitemap = async (req, res, next) => {
  const companyId = req.companyId || req.company?.id;
  const host = (req.get("host") || "").toLowerCase().split(":")[0];
  const isApex = isApexHost(host);

  // If request hits apex and has no specific tenant company, serve apex sitemap
  if (!companyId || !req.company) {
    if (isApex) {
      try {
        const publicRoutesPath = path.resolve(
          __dirname,
          "../../frontend/src/seo/public-routes.json",
        );
        if (fs.existsSync(publicRoutesPath)) {
          const data = JSON.parse(fs.readFileSync(publicRoutesPath, "utf8"));
          const origin = String(data._origin || "https://maxp.online").replace(/\/+$/, "");
          const routes = Array.isArray(data.routes) ? data.routes : [];
          const sitemapRoutes = routes.filter(
            (r) => r.sitemap && r.sitemap.include !== false,
          );

          let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
          xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
          for (const route of sitemapRoutes) {
            let loc =
              route.sitemap?.loc ||
              route.canonicalUrl ||
              `${origin}${route.path === "/" ? "/" : route.path}`;

            // Zero-redirect guard: apex course URLs 302 to company subdomain (قرار مختار 18-10).
            // Any course URL advertised in sitemap must use the canonical 200 destination.
            if (
              loc.startsWith(`${origin}/portal/course/`) ||
              loc.startsWith(`${origin}/academy/course/`)
            ) {
              loc = loc.replace(origin, "https://max-p.maxp.online");
            }

            xml += "  <url>\n";
            xml += `    <loc>${escapeXml(loc)}</loc>\n`;
            if (route.sitemap?.changefreq) {
              xml += `    <changefreq>${escapeXml(route.sitemap.changefreq)}</changefreq>\n`;
            }
            if (route.sitemap?.priority) {
              xml += `    <priority>${escapeXml(route.sitemap.priority)}</priority>\n`;
            }
            xml += "  </url>\n";
          }
          xml += "</urlset>";

          res.set("Content-Type", "application/xml; charset=utf-8");
          res.set(
            "Cache-Control",
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          );
          return res.status(200).send(xml);
        }
      } catch (apexErr) {
        console.error("❌ [SITEMAP] Failed to generate apex sitemap:", apexErr);
      }
    }

    res.set("Content-Type", "application/xml; charset=utf-8");
    return res.status(404).send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<error>Store not found</error>`,
    );
  }

  try {
    const prisma = await getSharedPrismaClientAsync();
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const [products, categories, articles, storePages, academyCourses, storefrontSettings] =
      await Promise.all([
        safeQuery(() =>
          prisma.product.findMany({
            where: {
              companyId,
              isActive: true,
              deletedAt: null,
              isHidden: false,
            },
            select: {
              id: true,
              slug: true,
              name: true,
              mainImage: true,
              images: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 5000,
          }),
        ),
        safeQuery(() =>
          prisma.category.findMany({
            where: {
              companyId,
              isActive: true,
            },
            select: {
              id: true,
              slug: true,
              name: true,
              image: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 500,
          }),
        ),
        safeQuery(() =>
          prisma.article.findMany({
            where: {
              companyId,
              isPublished: true,
            },
            select: {
              id: true,
              slug: true,
              title: true,
              heroImage: true,
              updatedAt: true,
              publishedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 500,
          }),
        ),
        safeQuery(() =>
          prisma.storePage.findMany({
            where: {
              companyId,
              isActive: true,
            },
            select: {
              id: true,
              slug: true,
              title: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 100,
          }),
        ),
        safeQuery(() =>
          prisma.academyCourse.findMany({
            where: {
              companyId,
              isPublished: true,
            },
            select: {
              id: true,
              slug: true,
              title: true,
              thumbnailUrl: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 500,
          }),
        ),
        prisma.storefrontSettings?.findUnique
          ? safeQuery(() =>
              prisma.storefrontSettings.findUnique({
                where: { companyId },
                select: {
                  designTokens: true,
                  updatedAt: true,
                },
              }),
            )
          : Promise.resolve(null),
      ]);

    const safeProducts = Array.isArray(products) ? products : [];
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeArticles = Array.isArray(articles) ? articles : [];
    const safePages = Array.isArray(storePages) ? storePages : [];
    const safeCourses = Array.isArray(academyCourses) ? academyCourses : [];

    const latestDate = formatDate(
      safeProducts[0]?.updatedAt ||
        safeCategories[0]?.updatedAt ||
        req.company.updatedAt ||
        new Date(),
    );

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Homepage
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(baseUrl)}/</loc>\n`;
    xml += `    <lastmod>${latestDate}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // 2. Shop Page
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(baseUrl)}/shop</loc>\n`;
    xml += `    <lastmod>${latestDate}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `  </url>\n`;

    // 3. Category / Collection Pages
    for (const cat of safeCategories) {
      const catSlug = cat.slug || cat.id;
      if (!catSlug) continue;
      const catUrl = `${baseUrl}/collections/${encodeURIComponent(catSlug)}`;
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(catUrl)}</loc>\n`;
      xml += `    <lastmod>${formatDate(cat.updatedAt)}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      const catImage = resolveAbsoluteImageUrl(cat.image, baseUrl);
      if (catImage) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${escapeXml(catImage)}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(cat.name)}</image:title>\n`;
        xml += `    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    // 4. Products
    for (const prod of safeProducts) {
      const prodSlug = prod.slug ? getPublicProductSlug(prod.slug) : prod.id;
      if (!prodSlug) continue;
      const prodUrl = `${baseUrl}/product/${encodeURIComponent(prodSlug)}`;
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(prodUrl)}</loc>\n`;
      xml += `    <lastmod>${formatDate(prod.updatedAt)}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;

      const candidateImages = [
        prod.mainImage,
        ...parseImageList(prod.images),
      ]
        .map((img) => resolveAbsoluteImageUrl(img, baseUrl))
        .filter(Boolean);

      const uniqueImages = [...new Set(candidateImages)].slice(0, 5);
      for (const imgUrl of uniqueImages) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(prod.name)}</image:title>\n`;
        xml += `    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    // 5. Articles / Blog
    for (const art of safeArticles) {
      if (!art.slug) continue;
      const artUrl = `${baseUrl}/articles/${encodeURIComponent(art.slug)}`;
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(artUrl)}</loc>\n`;
      xml += `    <lastmod>${formatDate(art.updatedAt || art.publishedAt)}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      const heroImg = resolveAbsoluteImageUrl(art.heroImage, baseUrl);
      if (heroImg) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${escapeXml(heroImg)}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(art.title)}</image:title>\n`;
        xml += `    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    // 6. Custom Store Pages (About, Policy, etc.) + Published Theme Pages
    const SYSTEM_THEME_PAGE_KEYS = new Set([
      "home",
      "shop",
      "pdp",
      "product",
      "cart",
      "checkout",
    ]);
    const emittedPageSlugs = new Set();

    for (const page of safePages) {
      if (!page.slug) continue;
      const normalizedSlug = String(page.slug).trim().toLowerCase();
      if (!normalizedSlug || emittedPageSlugs.has(normalizedSlug)) continue;
      emittedPageSlugs.add(normalizedSlug);

      const pageUrl = `${baseUrl}/${encodeURIComponent(page.slug)}`;
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(pageUrl)}</loc>\n`;
      xml += `    <lastmod>${formatDate(page.updatedAt)}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.5</priority>\n`;
      xml += `  </url>\n`;
    }

    const effectiveStorefrontSettings =
      storefrontSettings || req.storefrontSettings || req.company?.storefrontSettings || null;
    const rawThemePages =
      effectiveStorefrontSettings?.designTokens &&
      typeof effectiveStorefrontSettings.designTokens === "object" &&
      effectiveStorefrontSettings.designTokens.pages &&
      typeof effectiveStorefrontSettings.designTokens.pages === "object" &&
      !Array.isArray(effectiveStorefrontSettings.designTokens.pages)
        ? effectiveStorefrontSettings.designTokens.pages
        : null;

    if (rawThemePages) {
      for (const [rawSlug, pageConfig] of Object.entries(rawThemePages)) {
        if (!rawSlug || !pageConfig) continue;
        const cleanSlug = String(rawSlug).trim().replace(/^\/+|\/+$/g, "");
        const normalizedSlug = cleanSlug.toLowerCase();
        if (
          !cleanSlug ||
          SYSTEM_THEME_PAGE_KEYS.has(normalizedSlug) ||
          emittedPageSlugs.has(normalizedSlug)
        ) {
          continue;
        }
        if (typeof pageConfig === "object" && pageConfig.status === "draft") {
          continue;
        }
        emittedPageSlugs.add(normalizedSlug);

        const pageUrl = `${baseUrl}/${encodeURIComponent(cleanSlug)}`;
        const pageLastMod = formatDate(
          (typeof pageConfig === "object" && pageConfig.updatedAt) ||
            effectiveStorefrontSettings?.updatedAt ||
            latestDate,
        );
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(pageUrl)}</loc>\n`;
        xml += `    <lastmod>${pageLastMod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.5</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // 7. Academy Courses (always canonical 200 URLs, never 302 redirects)
    if (safeCourses.length > 0) {
      const portalBase = isApex
        ? `https://${req.company.slug || "max-p"}.maxp.online`
        : baseUrl;

      for (const course of safeCourses) {
        const courseSlug = course.slug || course.id;
        if (!courseSlug) continue;
        const courseUrl = `${portalBase}/portal/course/${encodeURIComponent(courseSlug)}`;
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(courseUrl)}</loc>\n`;
        xml += `    <lastmod>${formatDate(course.updatedAt)}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        const courseThumb = resolveAbsoluteImageUrl(course.thumbnailUrl, portalBase);
        if (courseThumb) {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${escapeXml(courseThumb)}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(course.title)}</image:title>\n`;
          xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("X-Robots-Tag", "index, follow");
    res.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    );
    return res.status(200).send(xml);
  } catch (error) {
    console.error("❌ [SITEMAP] Failed to generate sitemap:", error);
    return next(error);
  }
};
