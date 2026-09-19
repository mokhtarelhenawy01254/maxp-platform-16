/**
 * Pre-publish quality gate tests — critical content issues must block
 * publishing with actionable Arabic errors (both on create/update status
 * transitions). Regression for issues found live on production landings.
 */

const express = require("express");
const request = require("supertest");

const store = { landings: [], products: {} };

const mockPrisma = {
  productLandingPage: {
    findFirst: jest.fn(async ({ where }) =>
      store.landings.find(
        (l) =>
          (!where.companyId || l.companyId === where.companyId) &&
          (!where.slug || l.slug === where.slug) &&
          (!where.id || l.id === where.id),
      ) || null,
    ),
    findMany: jest.fn(async () => store.landings),
    create: jest.fn(),
    update: jest.fn(async ({ where, data }) => {
      const row = store.landings.find((l) => l.id === where.id);
      if (!row) throw new Error("not found");
      Object.assign(row, data);
      return { ...row };
    }),
  },
  product: {
    findFirst: jest.fn(async ({ where }) => store.products[where.id] || null),
  },
  $executeRawUnsafe: jest.fn(async () => 0),
};

jest.mock("../services/sharedDatabase", () => ({
  getSharedPrismaClientAsync: jest.fn(() => Promise.resolve(mockPrisma)),
}));

jest.mock("../middleware/subdomainMiddleware", () => ({
  extractSubdomainMiddleware: jest.fn((req, res, next) => next()),
  requireCompany: jest.fn((req, res, next) => next()),
}));

jest.mock("../utils/verifyToken", () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: "user_1", companyId: "company_1" };
    next();
  }),
  requireRole: jest.fn(() => (req, res, next) => next()),
}));

const landingRoutes = require("../routes/productLandingPagesRoutes");

const app = express();
app.use(express.json());
app.use("/api/v1/product-landings", landingRoutes);

const BASE_LANDING = {
  id: "lp_1",
  companyId: "company_1",
  productId: "prod_1",
  slug: "dash-sneakers",
  title: "كوتشي Dash",
  status: "DRAFT",
  sections: JSON.stringify([
    { id: "sec-1", type: "MEDIA", enabled: true, content: { images: ["/a.png"] } },
  ]),
  formConfig: "{}",
  seo: "{}",
  style: null,
};

const seed = (overrides = {}) => {
  store.landings = [{ ...BASE_LANDING, ...overrides }];
  store.products = {
    prod_1: { id: "prod_1", companyId: "company_1", name: "كوتشي", deletedAt: null, isActive: true },
  };
};

describe("landing publish quality gate", () => {
  beforeEach(() => seed());

  it("blocks publishing a before/after section using the same image twice", async () => {
    const res = await request(app).put("/api/v1/product-landings/lp_1").send({
      status: "PUBLISHED",
      sections: [
        {
          id: "ba-1",
          type: "BEFORE_AFTER",
          enabled: true,
          content: { beforeImage: "/same.png", afterImage: "/same.png" },
        },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("قبل وبعد");
    expect(store.landings[0].status).toBe("DRAFT");
  });

  it("blocks publishing a stock placeholder video", async () => {
    const res = await request(app).put("/api/v1/product-landings/lp_1").send({
      status: "PUBLISHED",
      sections: [
        {
          id: "vr-1",
          type: "VIDEO_REEL",
          enabled: true,
          content: {
            videoUrl: "https://assets.mixkit.co/videos/preview/unboxing-large.mp4",
          },
        },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("فيديو");
    expect(store.landings[0].status).toBe("DRAFT");
  });

  it("allows a different-image before/after and a self-hosted video", async () => {
    const res = await request(app).put("/api/v1/product-landings/lp_1").send({
      status: "PUBLISHED",
      sections: [
        {
          id: "ba-1",
          type: "BEFORE_AFTER",
          enabled: true,
          content: { beforeImage: "/market.png", afterImage: "/product.png" },
        },
        {
          id: "vr-1",
          type: "VIDEO_REEL",
          enabled: true,
          content: { videoUrl: "https://swan.maxp.online/uploads/products/real.mp4" },
        },
      ],
    });

    expect(res.status).toBe(200);
    expect(store.landings[0].status).toBe("PUBLISHED");
  });

  it("ignores disabled sections in the quality gate", async () => {
    const res = await request(app).put("/api/v1/product-landings/lp_1").send({
      status: "PUBLISHED",
      sections: [
        {
          id: "ba-1",
          type: "BEFORE_AFTER",
          enabled: false,
          content: { beforeImage: "/same.png", afterImage: "/same.png" },
        },
        { id: "m-1", type: "MEDIA", enabled: true, content: { images: ["/a.png"] } },
      ],
    });

    expect(res.status).toBe(200);
  });
});
