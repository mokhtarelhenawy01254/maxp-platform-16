"use strict";

const { handleStorefrontShell } = require("../../controller/storefrontHtmlController");

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClientAsync: jest.fn(),
  safeQuery: jest.fn((fn, fallback) => fn().catch(() => fallback)),
}));

const { getSharedPrismaClientAsync, safeQuery } = require("../../services/sharedDatabase");

describe("Storefront Slug Auto-Redirect", () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      storePage: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      product: {
        findFirst: jest.fn(),
      },
      productLandingPage: {
        findFirst: jest.fn(),
      },
      storefrontSettings: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    getSharedPrismaClientAsync.mockResolvedValue(mockPrisma);
  });

  it("redirects direct product slug /car-sunshades to /product/car-sunshades with 301", async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "prod-123",
      slug: "car-sunshades",
    });

    const req = {
      method: "GET",
      path: "/car-sunshades",
      url: "/car-sunshades?utm_source=facebook",
      originalUrl: "/car-sunshades?utm_source=facebook",
      companyId: "comp-1",
      company: { id: "comp-1", name: "Red Line" },
      headers: {
        host: "red-line.maxp.online",
        accept: "text/html,application/xhtml+xml",
      },
      get: jest.fn((h) => (h === "host" ? "red-line.maxp.online" : null)),
      protocol: "https",
    };

    const res = {
      redirect: jest.fn(),
      set: jest.fn(),
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
      getHeader: jest.fn().mockReturnValue(null),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    const next = jest.fn();

    await handleStorefrontShell(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(301, "/product/car-sunshades?utm_source=facebook");
  });

  it("redirects direct landing slug to /lp/:slug with 301", async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.productLandingPage.findFirst.mockResolvedValue({
      id: "lp-123",
      slug: "exclusive-deal",
    });

    const req = {
      method: "GET",
      path: "/exclusive-deal",
      url: "/exclusive-deal",
      originalUrl: "/exclusive-deal",
      companyId: "comp-1",
      company: { id: "comp-1", name: "Red Line" },
      headers: {
        host: "red-line.maxp.online",
        accept: "text/html,application/xhtml+xml",
      },
      get: jest.fn((h) => (h === "host" ? "red-line.maxp.online" : null)),
      protocol: "https",
    };

    const res = {
      redirect: jest.fn(),
      set: jest.fn(),
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
      getHeader: jest.fn().mockReturnValue(null),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    const next = jest.fn();

    await handleStorefrontShell(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(301, "/lp/exclusive-deal");
  });
});
