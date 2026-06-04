const express = require("express");
const request = require("supertest");

const merchantService = require("../../services/merchantService");
const mockGetCompanyFromSubdomain = jest.fn((req, _res, next) => next());

const mockPrisma = {
  company: {
    findFirst: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../middleware/companyMiddleware", () => ({
  getCompanyFromSubdomain: (...args) => mockGetCompanyFromSubdomain(...args),
}));

jest.mock("../../services/merchantService", () => ({
  createMerchant: jest.fn(),
}));

const publicMerchantRoutes = require("../../routes/publicMerchantRoutes");

describe("publicMerchantRoutes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCompanyFromSubdomain.mockImplementation((req, _res, next) => next());
    mockPrisma.merchant.findFirst.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    app = express();
    app.use(express.json());
    app.use("/public/merchants", publicMerchantRoutes);
  });

  test("POST /register requires a company identifier on the root domain", async () => {
    const response = await request(app).post("/public/merchants/register").send({
      name: "Merchant Co",
      email: "merchant@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("يجب تحديد الشركة");
  });

  test("POST /register accepts company context from subdomain without requiring companyId in body", async () => {
    mockGetCompanyFromSubdomain.mockImplementation((req, _res, next) => {
      req.company = {
        id: "company-subdomain-1",
        name: "Subdomain Store",
      };
      next();
    });
    merchantService.createMerchant.mockResolvedValue({
      id: "merchant-subdomain-1",
      companyId: "company-subdomain-1",
      email: "subdomain-merchant@example.com",
    });

    const response = await request(app).post("/public/merchants/register").send({
      name: "Subdomain Merchant",
      email: "subdomain-merchant@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(merchantService.createMerchant).toHaveBeenCalledWith(
      "company-subdomain-1",
      expect.objectContaining({
        name: "Subdomain Merchant",
        email: "subdomain-merchant@example.com",
        password: "Password123!",
      }),
    );
  });

  test("POST /register accepts a company slug from the request body and creates the merchant for that company", async () => {
    mockPrisma.company.findFirst.mockResolvedValue({
      id: "company-merchant-1",
      slug: "demo-store",
      isActive: true,
    });
    merchantService.createMerchant.mockResolvedValue({
      id: "merchant-1",
      companyId: "company-merchant-1",
      email: "merchant@example.com",
    });

    const response = await request(app).post("/public/merchants/register").send({
      companyId: "demo-store",
      name: "Merchant Co",
      email: "merchant@example.com",
      password: "Password123!",
      phone: "01000000000",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(merchantService.createMerchant).toHaveBeenCalledWith(
      "company-merchant-1",
      expect.objectContaining({
        name: "Merchant Co",
        email: "merchant@example.com",
        password: "Password123!",
      }),
    );
  });

  test("POST /register rejects duplicate merchant emails", async () => {
    mockPrisma.company.findFirst.mockResolvedValue({
      id: "company-merchant-2",
      slug: "demo-store",
      isActive: true,
    });
    mockPrisma.merchant.findFirst.mockResolvedValue({
      id: "merchant-existing",
      email: "merchant@example.com",
    });

    const response = await request(app).post("/public/merchants/register").send({
      companyId: "demo-store",
      name: "Merchant Co",
      email: "merchant@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("مستخدم بالفعل");
  });
});
