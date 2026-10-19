"use strict";

const { getSharedPrismaClientAsync, safeQuery } = require("../services/sharedDatabase");

// Fast in-memory cache for courseKey -> companySlug
const courseSlugCache = new Map();
// Pre-populate known Primary Course (Course 1)
courseSlugCache.set("cmuzmwaxs07r2juml2v04xon5", "max-p");

const normalizeHostname = (value) =>
  String(value || "").split(":")[0].trim().toLowerCase();

const isApexHost = (hostname) => {
  const h = normalizeHostname(hostname);
  if (!h) return true;
  if (
    h === "maxp.online" ||
    h === "www.maxp.online" ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0"
  ) {
    return true;
  }
  // Subdomains like max-p.maxp.online or swan.maxp.online have >= 3 segments
  const parts = h.split(".");
  if (h.endsWith(".maxp.online") && parts.length === 3 && parts[0] !== "www") {
    return false;
  }
  // Local subdomains (e.g. max-p.localhost)
  if (h.endsWith(".localhost") && parts.length === 2) {
    return false;
  }
  return true;
};

/**
 * 🔀 Course Subdomain Redirect Middleware (قرار مختار 18-10)
 *
 * Redirects central apex course landing requests (/portal/course/:id) to the
 * dedicated company subdomain (https://<companySlug>.maxp.online/portal/course/:id)
 * via HTTP 302 Temporary Redirect, strictly preserving all UTM and query parameters.
 *
 * - Never redirects /api/v1/* requests.
 * - Prevents redirect loops when already on the company subdomain.
 */
const handleCourseSubdomainRedirect = async (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  // Match /portal/course/:id or /academy/course/:id
  const match = req.path.match(/^\/(?:portal|academy)\/course\/([^\/\?#]+)$/i);
  if (!match) return next();

  const courseKey = match[1];
  const host = normalizeHostname(req.get("host"));

  // Only redirect if requested from apex / central domain
  if (!isApexHost(host)) {
    return next();
  }

  let targetSlug = courseSlugCache.get(courseKey);

  if (!targetSlug) {
    try {
      const prisma = await getSharedPrismaClientAsync();
      const course = await safeQuery(() =>
        prisma.academyCourse.findFirst({
          where: {
            OR: [{ id: courseKey }, { slug: courseKey }],
          },
          select: { companyId: true },
        })
      );

      if (course?.companyId) {
        const company = await safeQuery(() =>
          prisma.company.findUnique({
            where: { id: course.companyId },
            select: { slug: true },
          })
        );
        if (company?.slug) {
          targetSlug = company.slug;
          courseSlugCache.set(courseKey, targetSlug);
        }
      }
    } catch (err) {
      console.warn("⚠️ [CourseRedirect] DB lookup warning:", err.message);
    }
  }

  // Fallback for primary course
  if (!targetSlug && courseKey === "cmuzmwaxs07r2juml2v04xon5") {
    targetSlug = "max-p";
  }

  if (targetSlug) {
    // Preserve full query string (UTM params, etc.)
    const originalUrl = req.originalUrl || req.url || "";
    const questionIndex = originalUrl.indexOf("?");
    const queryString = questionIndex !== -1 ? originalUrl.slice(questionIndex) : "";

    const targetUrl = `https://${targetSlug}.maxp.online/portal/course/${courseKey}${queryString}`;
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    return res.redirect(302, targetUrl);
  }

  next();
};

module.exports = {
  handleCourseSubdomainRedirect,
  isApexHost,
  courseSlugCache,
};
