"use strict";

exports.handleStorefrontRobots = async (req, res) => {
  const host = req.get("host") || "maxp.online";
  const protocol = req.protocol || "https";
  const baseUrl = `${protocol}://${host}`;

  // If company context is inactive
  if (req.company && req.company.isActive === false) {
    res.set("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send("User-agent: *\nDisallow: /\n");
  }

  const robotsTxt = [
    "User-agent: *",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /thank-you",
    "Disallow: /admin/",
    "Disallow: /super-admin/",
    "Disallow: /api/",
    "Disallow: /*?search=*",
    "Disallow: /*?sortBy=*",
    "Disallow: /*?previewTheme=*",
    "Disallow: /*?previewProductId=*",
    "Allow: /",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ].join("\n");

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
  );
  return res.status(200).send(robotsTxt);
};
