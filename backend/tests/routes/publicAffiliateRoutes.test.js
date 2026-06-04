const express = require("express");
const request = require("supertest");
const affiliateService = require("../../services/affiliateService");
let mockUploadedIdentityDocumentFile = null;

const mockPrisma = {
  affiliate: {
    findUnique: jest.fn(),
  },
  company: {
    findFirst: jest.fn(),
  },
  affiliateSetting: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/affiliateService", () => ({
  registerAffiliate: jest.fn(),
}));
jest.mock("../../middleware/affiliateIdentityDocumentUpload", () => ({
  single: jest.fn(() => (req, _res, next) => {
    req.file = mockUploadedIdentityDocumentFile;
    next();
  }),
}));
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "signed-token"),
}));
jest.mock("../../utils/jwtSecret", () => ({
  getJwtSecret: jest.fn(() => "test-secret"),
}));

const publicAffiliateRoutes = require("../../routes/publicAffiliateRoutes");

describe("publicAffiliateRoutes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadedIdentityDocumentFile = null;
    mockPrisma.company.findFirst.mockResolvedValue(null);
    mockPrisma.affiliateSetting.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.affiliate.findUnique.mockResolvedValue(null);
    app = express();
    app.use(express.json());
    app.use("/public/affiliates", publicAffiliateRoutes);
  });

  test("GET /companies/:slug returns affiliate program settings with company branding", async () => {
    mockPrisma.company.findFirst.mockResolvedValue({
      id: "company-1",
      name: "Demo Store",
      logo: "https://example.com/logo.png",
      slug: "demo-store",
      affiliate_settings: {
        commissionType: "PERCENTAGE",
        commissionRate: 12,
        cookieDuration: 45,
        termsAndConditions: "line 1\nline 2",
        isActive: true,
        autoApproveAffiliates: true,
        defaultMinPayout: 180,
        defaultCanCreateOrdersForOthers: false,
        defaultCanViewCustomerData: false,
        requireIdentityDocument: true,
        identityDocumentLabel: "صورة البطاقة",
        payoutSlaDays: 4,
        platformMarginType: "FIXED",
        platformMarginValue: 30,
      },
    });

    const response = await request(app).get(
      "/public/affiliates/companies/demo-store",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: "company-1",
        name: "Demo Store",
        slug: "demo-store",
        affiliateProgram: expect.objectContaining({
          termsAndConditions: "line 1\nline 2",
          isActive: true,
          autoApproveAffiliates: true,
          defaultMinPayout: 180,
          defaultCanCreateOrdersForOthers: false,
          defaultCanViewCustomerData: false,
          requireIdentityDocument: true,
          identityDocumentLabel: "صورة البطاقة",
          payoutSlaDays: 4,
          platformMarginType: "FIXED",
          platformMarginValue: 30,
        }),
      }),
    );
  });

  test("POST /register rejects company-scoped signup when affiliate program is inactive", async () => {
    mockPrisma.company.findFirst.mockResolvedValue({
      id: "company-2",
      name: "Paused Store",
      slug: "paused-store",
      affiliate_settings: {
        isActive: false,
      },
    });

    const response = await request(app)
      .post("/public/affiliates/register")
      .send({
        email: "affiliate@example.com",
        password: "secret123",
        firstName: "Test",
        lastName: "Affiliate",
        companySlug: "paused-store",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("غير متاح");
  });

  test("POST /register links the affiliate to the requested company and creates an AFFILIATE user-company membership", async () => {
    mockPrisma.company.findFirst.mockResolvedValue({
      id: "company-3",
      name: "Active Store",
      slug: "active-store",
      affiliate_settings: {
        isActive: true,
        commissionType: "PERCENTAGE",
        commissionRate: 8,
        autoApproveAffiliates: true,
        defaultMinPayout: 250,
        defaultCanCreateOrdersForOthers: false,
        defaultCanViewCustomerData: false,
        requireIdentityDocument: false,
        identityDocumentLabel: "صورة البطاقة",
      },
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "user-3",
      email: "affiliate@active.test",
      firstName: "Ali",
      lastName: "Tester",
      role: "AFFILIATE",
    });
    affiliateService.registerAffiliate.mockResolvedValue({
      id: "affiliate-3",
      companyId: "company-3",
      status: "PENDING",
    });

    const response = await request(app)
      .post("/public/affiliates/register")
      .send({
        email: "affiliate@active.test",
        password: "secret123",
        firstName: "Ali",
        lastName: "Tester",
        companySlug: "active-store",
        commissionType: "MARKUP",
        commissionRate: 999,
        minPayout: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-3",
          role: "AFFILIATE",
          userCompanies: {
            create: expect.objectContaining({
              companyId: "company-3",
              role: "AFFILIATE",
              isActive: true,
              isDefault: true,
            }),
          },
        }),
      }),
    );
    expect(affiliateService.registerAffiliate).toHaveBeenCalledWith(
      "user-3",
      expect.objectContaining({
        companyId: "company-3",
        commissionType: "PERCENTAGE",
        commissionRate: 8,
        minPayout: 250,
        canCreateOrdersForOthers: false,
        canViewCustomerData: false,
        status: "ACTIVE",
      }),
    );
  });

  test("POST /register rejects duplicate affiliate email registrations", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-existing",
      email: "affiliate@active.test",
    });
    mockPrisma.affiliate.findUnique.mockResolvedValue({
      id: "affiliate-existing",
      userId: "user-existing",
    });

    const response = await request(app)
      .post("/public/affiliates/register")
      .send({
        email: "affiliate@active.test",
        password: "secret123",
        firstName: "Ali",
        lastName: "Tester",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("مسجل بالفعل");
  });

  test("POST /register requires the identity document when the company policy enforces it", async () => {
    mockPrisma.company.findFirst.mockResolvedValue({
      id: "company-4",
      name: "Review Store",
      slug: "review-store",
      affiliate_settings: {
        isActive: true,
        requireIdentityDocument: true,
        identityDocumentLabel: "صورة البطاقة",
      },
    });

    const response = await request(app)
      .post("/public/affiliates/register")
      .send({
        email: "affiliate@review.test",
        password: "secret123",
        firstName: "Noor",
        lastName: "Reviewer",
        companySlug: "review-store",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("صورة البطاقة");
    expect(affiliateService.registerAffiliate).not.toHaveBeenCalled();
  });

  test("POST /register stores the uploaded identity document on the affiliate profile", async () => {
    mockUploadedIdentityDocumentFile = {
      filename: "affiliate-document-test.png",
      originalname: "id.png",
      mimetype: "image/png",
      path: "H:\\fake\\affiliate-document-test.png",
    };
    mockPrisma.company.findFirst.mockResolvedValue({
      id: "company-5",
      name: "Docs Store",
      slug: "docs-store",
      affiliate_settings: {
        isActive: true,
        requireIdentityDocument: true,
        identityDocumentLabel: "صورة البطاقة",
        autoApproveAffiliates: false,
      },
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "user-5",
      email: "affiliate@docs.test",
      firstName: "Sara",
      lastName: "Docs",
      role: "AFFILIATE",
    });
    affiliateService.registerAffiliate.mockResolvedValue({
      id: "affiliate-5",
      companyId: "company-5",
      status: "PENDING",
      identityDocumentUrl: "/uploads/affiliate-documents/affiliate-document-test.png",
    });

    const response = await request(app)
      .post("/public/affiliates/register")
      .send({
        email: "affiliate@docs.test",
        password: "secret123",
        firstName: "Sara",
        lastName: "Docs",
        companySlug: "docs-store",
        paymentMethod: "INSTAPAY",
        paymentDetails: JSON.stringify({ phoneNumber: "01000000000" }),
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(affiliateService.registerAffiliate).toHaveBeenCalledWith(
      "user-5",
      expect.objectContaining({
        identityDocumentUrl:
          "/uploads/affiliate-documents/affiliate-document-test.png",
      }),
    );
  });
});
