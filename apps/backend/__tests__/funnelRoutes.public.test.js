/**
 * Public funnel endpoint contract tests.
 *
 * Regression (2026-09-19): GET /api/v1/funnels/public/:slug used to fall back
 * to a hardcoded socks demo payload for unknown slugs, unpublished funnels,
 * and DB outages — so paid ad traffic could silently land on placeholder
 * content that can't take a real order. The contract is now:
 *   - unknown slug            → 404 { error: "not_found" }
 *   - DRAFT/PAUSED funnel     → 404 { error: "not_found" }
 *   - funnel w/o live product → 404 { error: "product_unavailable" }
 *   - DB unavailable          → 503 { error: "store_unavailable" }
 *   - PUBLISHED + product     → 200 with config rebuilt from the live product
 */

const express = require("express");
const request = require("supertest");

const store = {
  funnels: [],
  products: {},
  companies: {},
};

const mockPrisma = {
  productLandingPage: {
    findFirst: jest.fn(async ({ where }) => {
      const statusFilter = where.status;
      return (
        store.funnels.find((f) => {
          if (f.slug !== where.slug) return false;
          if (Array.isArray(statusFilter?.in)) {
            return statusFilter.in.includes(f.status);
          }
          if (statusFilter) return f.status === statusFilter;
          return true;
        }) || null
      );
    }),
    update: jest.fn(async ({ where, data }) => {
      const row = store.funnels.find((f) => f.id === where.id);
      if (row && data?.visits?.increment) row.visits += data.visits.increment;
      if (row && data?.orders?.increment) row.orders += data.orders.increment;
      return row;
    }),
  },
  product: {
    findUnique: jest.fn(async ({ where }) => store.products[where.id] || null),
  },
  company: {
    findUnique: jest.fn(async ({ where }) => store.companies[where.id] || null),
  },
};

jest.mock("../services/sharedDatabase", () => ({
  getSharedPrismaClientAsync: jest.fn(() => Promise.resolve(mockPrisma)),
}));

// Subdomain middleware uses this only for tenant hostnames; supertest runs
// on localhost so it stays dormant — mocked to keep the module light.
jest.mock("../services/companyCacheService", () => ({
  getCompanyLookup: jest.fn(async (_key, _value, loader) => loader()),
}));

const funnelRoutes = require("../routes/funnelRoutes");
const { getSharedPrismaClientAsync } = require("../services/sharedDatabase");

const app = express();
app.use("/api/v1/funnels", funnelRoutes);

const PUBLISHED_FUNNEL = {
  id: "fun_pub_1",
  companyId: "company_1",
  productId: "prod_1",
  slug: "winter-socks",
  title: "شرابات الشتاء",
  status: "PUBLISHED",
  visits: 0,
  orders: 0,
};

const LIVE_PRODUCT = {
  id: "prod_1",
  name: "شرابات الشتاء",
  price: 249,
  comparePrice: 349,
  description: "باكدج 5 أزواج شرابات قطن ممشط.",
  images: JSON.stringify(["https://example.com/socks.jpg"]),
};

const LIVE_COMPANY = {
  id: "company_1",
  name: "Swan",
  slug: "swan",
  currency: "EGP",
  logo: null,
};

const seedStore = () => {
  store.funnels = [{ ...PUBLISHED_FUNNEL }];
  store.products = { prod_1: { ...LIVE_PRODUCT } };
  store.companies = { company_1: { ...LIVE_COMPANY } };
  getSharedPrismaClientAsync.mockImplementation(() =>
    Promise.resolve(mockPrisma),
  );
  mockPrisma.productLandingPage.findFirst.mockReset();
  mockPrisma.productLandingPage.findFirst.mockImplementation(
    async ({ where }) => {
      const statusFilter = where.status;
      return (
        store.funnels.find((f) => {
          if (f.slug !== where.slug) return false;
          if (Array.isArray(statusFilter?.in)) {
            return statusFilter.in.includes(f.status);
          }
          if (statusFilter) return f.status === statusFilter;
          return true;
        }) || null
      );
    },
  );
  mockPrisma.productLandingPage.update.mockClear();
};

describe("GET /api/v1/funnels/public/:slug", () => {
  beforeEach(seedStore);

  it("serves a PUBLISHED funnel with config rebuilt from the live product", async () => {
    const res = await request(app).get("/api/v1/funnels/public/winter-socks");

    expect(res.status).toBe(200);
    expect(res.body.funnel.id).toBe("fun_pub_1");
    expect(res.body.funnel.status).toBe("PUBLISHED");
    expect(res.body.product.id).toBe("prod_1");
    expect(res.body.company.slug).toBe("swan");
    // Config derived from the real product row, not the demo socks template.
    expect(res.body.funnel.config.heroTitle).toBe("شرابات الشتاء");
    expect(res.body.funnel.config.bundleTiers[0].price).toBe(249);
    // Visit counter bumped.
    expect(store.funnels[0].visits).toBe(1);
  });

  it("returns 404 for an unknown slug — never a demo payload", async () => {
    const res = await request(app).get("/api/v1/funnels/public/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
    expect(res.body.funnel).toBeUndefined();
    expect(res.body.product).toBeUndefined();
  });

  it("returns 404 for a DRAFT funnel (unpublished must not serve public traffic)", async () => {
    store.funnels = [{ ...PUBLISHED_FUNNEL, status: "DRAFT" }];

    const res = await request(app).get("/api/v1/funnels/public/winter-socks");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  it("returns 404 when the linked product no longer exists", async () => {
    store.products = {};

    const res = await request(app).get("/api/v1/funnels/public/winter-socks");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("product_unavailable");
  });

  it("returns 503 when the funnel query fails mid-route", async () => {
    mockPrisma.productLandingPage.findFirst.mockRejectedValueOnce(
      new Error("db down"),
    );

    const res = await request(app).get("/api/v1/funnels/public/winter-socks");

    expect(res.status).toBe(503);
    expect(res.body.error).toBe("store_unavailable");
  });

  it("never serves demo content during a full DB outage", async () => {
    getSharedPrismaClientAsync.mockRejectedValue(new Error("db down"));

    const res = await request(app).get("/api/v1/funnels/public/winter-socks");

    // The subdomain middleware fails first (500) — either way, the response
    // must be an error status with no demo funnel/product payload.
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.funnel).toBeUndefined();
    expect(res.body.product).toBeUndefined();
  });
});

describe("POST /api/v1/funnels/public/:slug/order (conversion counter)", () => {
  beforeEach(seedStore);

  it("bumps the orders counter and returns a tracking id", async () => {
    const res = await request(app)
      .post("/api/v1/funnels/public/winter-socks/order")
      .send({ customerName: "أحمد", phone: "01000000000" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.trackingId).toMatch(/^fcs-/);
    expect(res.body.funnelId).toBe("fun_pub_1");
    expect(store.funnels[0].orders).toBe(1);
  });
});
