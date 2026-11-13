"use strict";

const mockPrisma = {
  product: {
    findMany: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
  article: {
    findMany: jest.fn(),
  },
  storePage: {
    findMany: jest.fn(),
  },
  academyCourse: {
    findMany: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClientAsync: jest.fn().mockImplementation(async () => mockPrisma),
  safeQuery: jest.fn((fn, fallback) => fn().catch(() => fallback)),
}));

const { handleStorefrontRobots } = require("../../controller/storefrontRobotsController");
const { handleStorefrontSitemap } = require("../../controller/storefrontSitemapController");

describe("Storefront SEO Controllers", () => {
  beforeEach(() => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.category.findMany.mockResolvedValue([]);
    mockPrisma.article.findMany.mockResolvedValue([]);
    mockPrisma.storePage.findMany.mockResolvedValue([]);
    mockPrisma.academyCourse.findMany.mockResolvedValue([]);
  });

  describe("storefrontRobotsController", () => {
    it("returns standard robots.txt with sitemap reference and disallow rules", async () => {
      const req = {
        get: jest.fn((header) => (header.toLowerCase() === "host" ? "swan.maxp.online" : null)),
        protocol: "https",
        company: { isActive: true },
      };
      const res = {
        headers: {},
        set: jest.fn((key, value) => {
          res.headers[key] = value;
        }),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await handleStorefrontRobots(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.headers["Content-Type"]).toBe("text/plain; charset=utf-8");
      expect(res.send).toHaveBeenCalled();
      const output = res.send.mock.calls[0][0];
      expect(output).toContain("Disallow: /cart");
      expect(output).toContain("Disallow: /checkout");
      expect(output).toContain("Disallow: /*?search=*");
      expect(output).toContain("Sitemap: https://swan.maxp.online/sitemap.xml");
    });

    it("returns Disallow all if company is inactive", async () => {
      const req = {
        get: jest.fn(() => "swan.maxp.online"),
        protocol: "https",
        company: { isActive: false },
      };
      const res = {
        headers: {},
        set: jest.fn((key, value) => {
          res.headers[key] = value;
        }),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await handleStorefrontRobots(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("User-agent: *\nDisallow: /\n");
    });
  });

  describe("storefrontSitemapController", () => {
    it("generates valid XML sitemap with homepage, categories, products, and articles", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: "prod-1",
          slug: "summer-dress",
          name: "فستان صيفي",
          updatedAt: new Date("2026-08-01T12:00:00Z"),
          images: JSON.stringify(["https://img.cdn/dress1.jpg"]),
        },
      ]);
      mockPrisma.category.findMany.mockResolvedValue([
        {
          id: "cat-1",
          slug: "dresses",
          name: "فساتين",
          updatedAt: new Date("2026-07-15T10:00:00Z"),
        },
      ]);
      mockPrisma.article.findMany.mockResolvedValue([
        {
          id: "art-1",
          slug: "summer-trends",
          title: "صيحات الصيف",
          publishedAt: new Date("2026-08-10T09:00:00Z"),
          updatedAt: new Date("2026-08-10T09:00:00Z"),
          heroImage: "https://img.cdn/trend.jpg",
        },
      ]);
      mockPrisma.storePage.findMany.mockResolvedValue([
        {
          id: "page-1",
          slug: "about-us",
          updatedAt: new Date("2026-06-01T00:00:00Z"),
        },
      ]);

      const req = {
        get: jest.fn((header) => (header.toLowerCase() === "host" ? "swan.maxp.online" : null)),
        protocol: "https",
        company: { id: "company-123", isActive: true },
      };
      const res = {
        headers: {},
        set: jest.fn((key, value) => {
          res.headers[key] = value;
        }),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await handleStorefrontSitemap(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.headers["Content-Type"]).toBe("application/xml; charset=utf-8");
      expect(res.headers["X-Robots-Tag"]).toBe("index, follow");
      expect(res.send).toHaveBeenCalled();
      const xml = res.send.mock.calls[0][0];

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain("<loc>https://swan.maxp.online/</loc>");
      expect(xml).toContain("<loc>https://swan.maxp.online/shop</loc>");
      expect(xml).toContain("<loc>https://swan.maxp.online/collections/dresses</loc>");
      expect(xml).toContain("<loc>https://swan.maxp.online/product/summer-dress</loc>");
      expect(xml).toContain("<image:loc>https://img.cdn/dress1.jpg</image:loc>");
      expect(xml).toContain("<loc>https://swan.maxp.online/articles/summer-trends</loc>");
      expect(xml).toContain("<loc>https://swan.maxp.online/about-us</loc>");
    });

    it("advertises exact reachable slug for products with underscores (e.g. Hagar_Khfaf) instead of dead 404 links", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: "cmv45r1uz19oxjup993hrp3ov",
          slug: "Hagar_Khfaf",
          name: "كرتونة حجر خفاف",
          updatedAt: new Date("2026-10-22T12:00:00Z"),
          images: JSON.stringify(["https://img.cdn/hagar.jpg"]),
        },
      ]);

      const req = {
        get: jest.fn((header) => (header.toLowerCase() === "host" ? "ahmedgad.maxp.online" : null)),
        protocol: "https",
        company: { id: "cmttxw3hg1wq4ju430g8muja0", isActive: true },
      };
      const res = {
        headers: {},
        set: jest.fn((key, value) => {
          res.headers[key] = value;
        }),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await handleStorefrontSitemap(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      const xml = res.send.mock.calls[0][0];

      // Must advertise the reachable URL that returns 200, NEVER the dead hyphenated one
      expect(xml).toContain("<loc>https://ahmedgad.maxp.online/product/Hagar_Khfaf</loc>");
      expect(xml).not.toContain("<loc>https://ahmedgad.maxp.online/product/Hagar-Khfaf</loc>");
    });

    it("includes published academy courses on company subdomain without 302 apex redirects", async () => {
      mockPrisma.academyCourse.findMany.mockResolvedValue([
        {
          id: "cmuzmwaxs07r2juml2v04xon5",
          slug: "cmuzmwaxs07r2juml2v04xon5",
          title: "كورس MaxP — من أول إعلان لأول نظام",
          thumbnailUrl: "https://maxp.online/og/p1_course-path_1200x628.png",
          updatedAt: new Date("2026-10-18T10:00:00Z"),
        },
      ]);

      const req = {
        get: jest.fn((header) => (header.toLowerCase() === "host" ? "max-p.maxp.online" : null)),
        protocol: "https",
        company: { id: "cmopgxu3a07i4jujj6f1oh32h", slug: "max-p", isActive: true },
      };
      const res = {
        headers: {},
        set: jest.fn((key, value) => {
          res.headers[key] = value;
        }),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await handleStorefrontSitemap(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      const xml = res.send.mock.calls[0][0];

      expect(xml).toContain("<loc>https://max-p.maxp.online/portal/course/cmuzmwaxs07r2juml2v04xon5</loc>");
      expect(xml).not.toContain("<loc>https://maxp.online/portal/course/");
    });

    it("serves apex public routes sitemap with canonical course subdomain when called without company on apex", async () => {
      const req = {
        get: jest.fn((header) => (header.toLowerCase() === "host" ? "maxp.online" : null)),
        protocol: "https",
        company: null,
      };
      const res = {
        headers: {},
        set: jest.fn((key, value) => {
          res.headers[key] = value;
        }),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await handleStorefrontSitemap(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      const xml = res.send.mock.calls[0][0];

      expect(xml).toContain("<loc>https://max-p.maxp.online/portal/course/cmuzmwaxs07r2juml2v04xon5</loc>");
      expect(xml).not.toContain("<loc>https://maxp.online/portal/course/");
    });
  });
});
