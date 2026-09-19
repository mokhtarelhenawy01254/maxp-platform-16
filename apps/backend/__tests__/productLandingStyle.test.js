/**
 * Landing page style persistence contract tests.
 *
 * The `style` column (JSON: { preset, brandColor, buttonRadius, headingFont })
 * must survive the admin round-trip and come back parsed on every read —
 * including the public storefront endpoint that ProductImageLandingPage
 * consumes to apply the --pil-* variables.
 */

const express = require("express");
const request = require("supertest");

const store = { landings: [], products: {}, companies: {} };

const mockPrisma = {
  productLandingPage: {
    findFirst: jest.fn(async ({ where, include }) => {
      const rows = store.landings.filter(
        (l) =>
          (!where.companyId || l.companyId === where.companyId) &&
          (!where.slug || l.slug === where.slug) &&
          (!where.id || l.id === where.id),
      );
      const row =
        where.status
          ? rows.find((l) =>
              Array.isArray(where.status.in)
                ? where.status.in.includes(l.status)
                : l.status === where.status,
            ) || null
          : rows[0] || null;

      if (row && include?.product) {
        return {
          ...row,
          product: store.products[row.productId] || null,
          company: store.companies[row.companyId] || null,
        };
      }

      return row;
    }),
    findMany: jest.fn(async () => store.landings),
    create: jest.fn(),
    update: jest.fn(async ({ where, data }) => {
      const row = store.landings.find((l) => l.id === where.id);
      if (!row) throw new Error("not found");
      Object.assign(row, data);
      return { ...row, product: store.products[row.productId] || null };
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

const LANDING = {
  id: "lp_1",
  companyId: "company_1",
  productId: "prod_1",
  slug: "dash-sneakers",
  title: "كوتشي Dash",
  status: "PUBLISHED",
  generationMode: "IMAGE_STACK",
  generationStatus: "READY",
  slices: "[]",
  sections: JSON.stringify([
    { id: "sec-1", type: "MEDIA", enabled: true, content: {} },
  ]),
  formConfig: "{}",
  seo: "{}",
  style: null,
  visits: 0,
  orders: 0,
  product: null,
};

const seed = () => {
  store.landings = [{ ...LANDING }];
  store.products = {
    prod_1: {
      id: "prod_1",
      companyId: "company_1",
      name: "كوتشي Dash",
      deletedAt: null,
      isActive: true,
    },
  };
  store.companies = {
    company_1: {
      id: "company_1",
      name: "Swan",
      slug: "swan",
      logo: null,
      currency: "EGP",
      customDomain: null,
    },
  };
};

describe("product landing style persistence", () => {
  beforeEach(seed);

  it("PUT persists the style object as JSON and returns it parsed", async () => {
    const style = {
      preset: "warm-cream",
      brandColor: "#b4552d",
      buttonRadius: 16,
      headingFont: "cairo",
    };

    const res = await request(app).put("/api/v1/product-landings/lp_1").send({
      style,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.style).toEqual(style);
    // Stored column is a JSON string.
    expect(typeof store.landings[0].style).toBe("string");
    expect(JSON.parse(store.landings[0].style)).toEqual(style);
  });

  it("GET /public/:slug returns the parsed style for the storefront renderer", async () => {
    store.landings[0].style = JSON.stringify({
      preset: "royal-blue",
      brandColor: "#4f46e5",
    });

    const res = await request(app).get("/api/v1/product-landings/public/dash-sneakers");

    expect(res.status).toBe(200);
    expect(res.body.data.landing.style).toEqual({
      preset: "royal-blue",
      brandColor: "#4f46e5",
    });
  });

  it("missing style column data degrades to an empty object, never a crash", async () => {
    store.landings[0].style = undefined;

    const res = await request(app).get("/api/v1/product-landings/public/dash-sneakers");

    expect(res.status).toBe(200);
    expect(res.body.data.landing.style).toEqual({});
  });
});
