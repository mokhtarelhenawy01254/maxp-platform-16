"use strict";

const {
  isInvalidProductSlug,
  getCanonicalProductSlug,
  INVALID_SLUG_ERROR_MESSAGE,
} = require("../../utils/productSlugValidation");

describe("Product Slug Validation & Normalization Unit Tests", () => {
  describe("isInvalidProductSlug", () => {
    it("rejects slugs containing spaces", () => {
      expect(isInvalidProductSlug("my product slug")).toBe(true);
      expect(isInvalidProductSlug("Şık Sole")).toBe(true);
      expect(isInvalidProductSlug("swan edge")).toBe(true);
      expect(isInvalidProductSlug(" leading-space")).toBe(true);
      expect(isInvalidProductSlug("trailing-space ")).toBe(true);
    });

    it("rejects slugs containing percent-encoded sequences or %", () => {
      expect(isInvalidProductSlug("%C5%9E%C4%B1k%20Sole")).toBe(true);
      expect(isInvalidProductSlug("product%20slug")).toBe(true);
      expect(isInvalidProductSlug("sale-50%")).toBe(true);
    });

    it("rejects slugs containing only digits (e.g. phone numbers as slugs)", () => {
      expect(isInvalidProductSlug("01123087745")).toBe(true);
      expect(isInvalidProductSlug("1234567890")).toBe(true);
    });

    it("accepts clean, valid slugs", () => {
      expect(isInvalidProductSlug("Dash")).toBe(false);
      expect(isInvalidProductSlug("kotshy-soan-eskotsh")).toBe(false);
      expect(isInvalidProductSlug("platform-sneakers-12")).toBe(false);
      expect(isInvalidProductSlug("كوتشي-dash-حريمي-مريح-للمشاوير-1790433814")).toBe(false);
      expect(isInvalidProductSlug("Şık-Sole")).toBe(false);
      expect(isInvalidProductSlug(null)).toBe(false);
      expect(isInvalidProductSlug("")).toBe(false);
    });
  });

  describe("getCanonicalProductSlug", () => {
    it("converts spaces and underscores to hyphens and strips duplicates", () => {
      expect(getCanonicalProductSlug("Şık Sole")).toBe("Şık-Sole");
      expect(getCanonicalProductSlug("swan edge")).toBe("swan-edge");
      expect(getCanonicalProductSlug("  multiple   spaces   ")).toBe("multiple-spaces");
      expect(getCanonicalProductSlug("hello_world_test")).toBe("hello-world-test");
    });

    it("decodes percent-encoded characters before normalizing", () => {
      expect(getCanonicalProductSlug("%C5%9E%C4%B1k%20Sole")).toBe("Şık-Sole");
      expect(getCanonicalProductSlug("my%20product%20name")).toBe("my-product-name");
    });

    it("preserves already clean slugs", () => {
      expect(getCanonicalProductSlug("Dash")).toBe("Dash");
      expect(getCanonicalProductSlug("platform-sneakers-12")).toBe("platform-sneakers-12");
    });
  });
});

describe("Product Controller Slug Validation (Integration with controller)", () => {
  let mockPrisma;
  let productController;

  beforeEach(() => {
    jest.resetModules();

    mockPrisma = {
      product: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    jest.mock("../../services/sharedDatabase", () => ({
      getSharedPrismaClient: jest.fn(() => mockPrisma),
      safeQuery: jest.fn(async (operation) => operation()),
      executeWithRetry: jest.fn(async (operation) => operation()),
    }));

    jest.mock("../../utils/planLimitPayloads", () => ({
      ensureWithinPlanLimit: jest.fn().mockResolvedValue({ allowed: true }),
    }));

    jest.mock("../../utils/merchantAccountScope", () => ({
      isMerchantUser: jest.fn(() => false),
      requireMerchantAccountForUser: jest.fn().mockResolvedValue(null),
      isCompanyWarehouseMerchant: jest.fn(() => false),
    }));

    jest.mock("../../services/rag/RagKnowledgeMaintenanceService", () => ({
      scheduleProductSync: jest.fn(),
    }));

    jest.mock("../../services/aiServiceAdminClient", () => ({
      syncProduct: jest.fn(),
    }));

    jest.mock("../../services/whatsapp/productOfferService", () => ({
      handleProductCreated: jest.fn(),
    }));

    jest.mock("../../services/internalSyncService", () => ({
      syncProductUpdate: jest.fn().mockResolvedValue(),
    }));

    jest.mock("../../services/redisCacheService", () => ({
      del: jest.fn().mockResolvedValue(),
      delPattern: jest.fn().mockReturnValue(Promise.resolve()),
    }));

    productController = require("../../controller/productController");
  });

  describe("createProduct slug validation", () => {
    it("rejects slug with space with 400 and Arabic error message", async () => {
      const req = {
        user: { companyId: "comp-1" },
        body: {
          name: "Test Shoes",
          price: 150,
          slug: "invalid slug with spaces",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: INVALID_SLUG_ERROR_MESSAGE,
        }),
      );
    });

    it("rejects slug with digits only with 400", async () => {
      const req = {
        user: { companyId: "comp-1" },
        body: {
          name: "Phone Product",
          price: 100,
          slug: "01123087745",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: INVALID_SLUG_ERROR_MESSAGE,
        }),
      );
    });

    it("rejects slug with encoded characters with 400", async () => {
      const req = {
        user: { companyId: "comp-1" },
        body: {
          name: "Encoded Product",
          price: 100,
          slug: "%C5%9Eik%20Sole",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: INVALID_SLUG_ERROR_MESSAGE,
        }),
      );
    });
  });

  describe("updateSingleProduct slug validation", () => {
    it("allows editing an existing product without changing the slug (200), even if existing slug has a space", async () => {
      const existingProduct = {
        id: "prod-1",
        companyId: "comp-1",
        name: "Şık Sole",
        slug: "Şık Sole",
        price: 200,
        images: "[]",
        metadata: "{}",
        isActive: true,
      };

      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue({
        ...existingProduct,
        price: 250,
      });

      const req = {
        user: { id: "user-1", companyId: "comp-1" },
        params: { id: "prod-1" },
        body: {
          price: 250,
          slug: "Şık Sole", // Unchanged slug with space!
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await productController.updateSingleProduct(req, res);

      // Must NOT be rejected with 400
      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(mockPrisma.product.update).toHaveBeenCalled();
    });

    it("rejects update when new slug contains spaces (400)", async () => {
      const existingProduct = {
        id: "prod-1",
        companyId: "comp-1",
        name: "Clean Product",
        slug: "clean-product",
        price: 200,
        images: "[]",
        metadata: "{}",
        isActive: true,
      };

      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);

      const req = {
        user: { id: "user-1", companyId: "comp-1" },
        params: { id: "prod-1" },
        body: {
          slug: "bad new slug",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await productController.updateSingleProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: INVALID_SLUG_ERROR_MESSAGE,
        }),
      );
    });

    it("allows update when new slug is valid and clean (200)", async () => {
      const existingProduct = {
        id: "prod-1",
        companyId: "comp-1",
        name: "Old Product",
        slug: "old-product",
        price: 200,
        images: "[]",
        metadata: "{}",
        isActive: true,
      };

      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.findFirst.mockResolvedValue(null); // No slug conflict
      mockPrisma.product.update.mockResolvedValue({
        ...existingProduct,
        slug: "new-clean-slug",
      });

      const req = {
        user: { id: "user-1", companyId: "comp-1" },
        params: { id: "prod-1" },
        body: {
          slug: "new-clean-slug",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await productController.updateSingleProduct(req, res);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(mockPrisma.product.update).toHaveBeenCalled();
    });
  });
});
