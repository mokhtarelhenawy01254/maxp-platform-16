"use strict";

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClientAsync: jest.fn(),
  safeQuery: jest.fn((fn, fallback) => fn().catch(() => fallback)),
}));

const { handleStorefrontShell } = require("../../controller/storefrontHtmlController");
const { getSharedPrismaClientAsync, safeQuery } = require("../../services/sharedDatabase");

describe("Storefront Slug Auto-Redirect", () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      homepageTemplate: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      storePage: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
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

  it("redirects product URL with spaces or encoded variants /product/%C5%9E%C4%B1k%20Sole to canonical /product/%C5%9E%C4%B1k-Sole with 301", async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "prod-sik-1",
      slug: "Şık Sole",
    });

    const req = {
      method: "GET",
      path: "/product/Şık Sole",
      url: "/product/%C5%9E%C4%B1k%20Sole",
      originalUrl: "/product/%C5%9E%C4%B1k%20Sole",
      companyId: "comp-1",
      company: { id: "comp-1", name: "Swan" },
      headers: {
        host: "swan.maxp.online",
        accept: "text/html,application/xhtml+xml",
      },
      get: jest.fn((h) => (h === "host" ? "swan.maxp.online" : null)),
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

    expect(res.redirect).toHaveBeenCalledWith(301, "/product/%C5%9E%C4%B1k-Sole");
  });

  it("redirects product URL accessed by ID to canonical slug with 301", async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "prod-sik-1",
      slug: "Şık Sole",
    });

    const req = {
      method: "GET",
      path: "/product/prod-sik-1",
      url: "/product/prod-sik-1?source=ad",
      originalUrl: "/product/prod-sik-1?source=ad",
      companyId: "comp-1",
      company: { id: "comp-1", name: "Swan" },
      headers: {
        host: "swan.maxp.online",
        accept: "text/html,application/xhtml+xml",
      },
      get: jest.fn((h) => (h === "host" ? "swan.maxp.online" : null)),
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

    expect(res.redirect).toHaveBeenCalledWith(301, "/product/%C5%9E%C4%B1k-Sole?source=ad");
  });
  it("does NOT redirect when product has underscore slug and is requested by that slug (/product/Hagar_Khfaf -> 200)", async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "cmv45r1uz19oxjup993hrp3ov",
      slug: "Hagar_Khfaf",
    });

    const req = {
      method: "GET",
      path: "/product/Hagar_Khfaf",
      url: "/product/Hagar_Khfaf",
      originalUrl: "/product/Hagar_Khfaf",
      companyId: "cmttxw3hg1wq4ju430g8muja0",
      company: { id: "cmttxw3hg1wq4ju430g8muja0", name: "Ahmed Gad" },
      headers: {
        host: "ahmedgad.maxp.online",
        accept: "text/html,application/xhtml+xml",
      },
      get: jest.fn((h) => (h === "host" ? "ahmedgad.maxp.online" : null)),
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

    // Strict SLUG-404 rule: NO redirect when requested URL matches stored slug
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalled();
  });

  it("redirects hyphenated alias /product/Hagar-Khfaf to stored slug /product/Hagar_Khfaf with 301", async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "cmv45r1uz19oxjup993hrp3ov",
      slug: "Hagar_Khfaf",
    });

    const req = {
      method: "GET",
      path: "/product/Hagar-Khfaf",
      url: "/product/Hagar-Khfaf",
      originalUrl: "/product/Hagar-Khfaf",
      companyId: "cmttxw3hg1wq4ju430g8muja0",
      company: { id: "cmttxw3hg1wq4ju430g8muja0", name: "Ahmed Gad" },
      headers: {
        host: "ahmedgad.maxp.online",
        accept: "text/html,application/xhtml+xml",
      },
      get: jest.fn((h) => (h === "host" ? "ahmedgad.maxp.online" : null)),
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

    expect(res.redirect).toHaveBeenCalledWith(301, "/product/Hagar_Khfaf");
  });

  it("redirects product URL accessed by ID to stored underscore slug with 301", async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "cmv45r1uz19oxjup993hrp3ov",
      slug: "Hagar_Khfaf",
    });

    const req = {
      method: "GET",
      path: "/product/cmv45r1uz19oxjup993hrp3ov",
      url: "/product/cmv45r1uz19oxjup993hrp3ov?ref=fb",
      originalUrl: "/product/cmv45r1uz19oxjup993hrp3ov?ref=fb",
      companyId: "cmttxw3hg1wq4ju430g8muja0",
      company: { id: "cmttxw3hg1wq4ju430g8muja0", name: "Ahmed Gad" },
      headers: {
        host: "ahmedgad.maxp.online",
        accept: "text/html,application/xhtml+xml",
      },
      get: jest.fn((h) => (h === "host" ? "ahmedgad.maxp.online" : null)),
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

    expect(res.redirect).toHaveBeenCalledWith(301, "/product/Hagar_Khfaf?ref=fb");
  });

  it("queries products on /shop route with valid Prisma fields (no invalid image field)", async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "prod-shop-1",
        name: "Test Shoe",
        slug: "test-shoe",
        mainImage: "https://example.com/shoe.jpg",
        images: JSON.stringify(["https://example.com/shoe.jpg"]),
      },
    ]);

    const req = {
      method: "GET",
      path: "/shop",
      url: "/shop",
      originalUrl: "/shop",
      companyId: "comp-1",
      company: { id: "comp-1", name: "Soco Store" },
      headers: {
        host: "soco.maxp.online",
        accept: "text/html,application/xhtml+xml",
      },
      get: jest.fn((h) => (h === "host" ? "soco.maxp.online" : null)),
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

    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.product.findMany).toHaveBeenCalled();
    const findManyCall = mockPrisma.product.findMany.mock.calls[0][0];
    expect(findManyCall.select).toBeDefined();
    expect(findManyCall.select.image).toBeUndefined();
    expect(findManyCall.select.mainImage).toBe(true);
    expect(findManyCall.select.images).toBe(true);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("gracefully catches and handles errors from product.findMany on /shop without crashing the shell", async () => {
    mockPrisma.product.findMany.mockRejectedValue(
      new Error("Unknown field `image` for select statement on model `Product`."),
    );

    const req = {
      method: "GET",
      path: "/shop",
      url: "/shop",
      originalUrl: "/shop",
      companyId: "comp-1",
      company: { id: "comp-1", name: "Soco Store" },
      headers: {
        host: "soco.maxp.online",
        accept: "text/html,application/xhtml+xml",
      },
      get: jest.fn((h) => (h === "host" ? "soco.maxp.online" : null)),
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

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
