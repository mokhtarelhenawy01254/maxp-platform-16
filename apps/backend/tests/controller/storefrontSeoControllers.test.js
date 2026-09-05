"use strict";

const { handleStorefrontRobots } = require("../../controller/storefrontRobotsController");
const { handleStorefrontSitemap } = require("../../controller/storefrontSitemapController");

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClientAsync: jest.fn(),
  safeQuery: jest.fn((fn, fallback) => fn().catch(() => fallback)),
}));

describe("Storefront SEO Controllers", () => {
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
      const mockPrisma = {
        product: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "prod-1",
              slug: "summer-dress",
              name: "فستان صيفي",
              updatedAt: new Date("2026-08-01T12:00:00Z"),
              images: JSON.stringify(["https://img.cdn/dress1.jpg"]),
            },
          ]),
        },
        category: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "cat-1",
              slug: "dresses",
              name: "فساتين",
              updatedAt: new Date("2026-07-15T10:00:00Z"),
            },
          ]),
        },
        article: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "art-1",
              slug: "summer-trends",
              title: "صيحات الصيف",
              publishedAt: new Date("2026-08-10T09:00:00Z"),
              updatedAt: new Date("2026-08-10T09:00:00Z"),
              heroImage: "https://img.cdn/trend.jpg",
            },
          ]),
        },
        storePage: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "page-1",
              slug: "about-us",
              updatedAt: new Date("2026-06-01T00:00:00Z"),
            },
          ]),
        },
      };

      const { getSharedPrismaClientAsync } = require("../../services/sharedDatabase");
      getSharedPrismaClientAsync.mockResolvedValue(mockPrisma);

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

      await handleStorefrontSitemap(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.headers["Content-Type"]).toBe("application/xml; charset=utf-8");
      expect(res.headers["X-Robots-Tag"]).toBe("noindex, follow");
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
  });
});
