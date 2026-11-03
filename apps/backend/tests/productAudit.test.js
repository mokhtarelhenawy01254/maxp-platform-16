/**
 * Tests for Product Audit Log System (سجل تعديلات المنتجات)
 * 6 Required Cases:
 * 1. تعديل السعر (من 550 لـ 400 مع المستخدم الحقيقي)
 * 2. تعديل الاسم بالعربي
 * 3. تعديل جماعي لـ 10 منتجات = 10 صفوف BULK_UPDATE
 * 4. استيراد منتجات بـ source=IMPORT
 * 5. حماية الصلاحيات و Pagination والمنتج القديم بدون سجل
 * 6. عدم قابلية التعديل (منع PATCH/DELETE بـ 405/403)
 */

const mockPrisma = {
  product: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  productAuditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $executeRawUnsafe: jest.fn(),
  $queryRawUnsafe: jest.fn(),
};

jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }), { virtual: true });
jest.mock('multer', () => {
  const multerMock = () => ({
    single: () => (req, res, next) => next(),
    array: () => (req, res, next) => next(),
    any: () => (req, res, next) => next(),
  });
  multerMock.diskStorage = () => ({});
  return multerMock;
}, { virtual: true });

jest.mock('express', () => {
  const routesStack = [];
  const createRouter = () => {
    const router = {
      stack: routesStack,
      get: (path, ...handlers) => {
        routesStack.push({ route: { path, methods: { get: true }, stack: handlers.map(h => ({ handle: h })) } });
        return router;
      },
      post: (path, ...handlers) => {
        routesStack.push({ route: { path, methods: { post: true }, stack: handlers.map(h => ({ handle: h })) } });
        return router;
      },
      put: (path, ...handlers) => {
        routesStack.push({ route: { path, methods: { put: true }, stack: handlers.map(h => ({ handle: h })) } });
        return router;
      },
      patch: (path, ...handlers) => {
        routesStack.push({ route: { path, methods: { patch: true }, stack: handlers.map(h => ({ handle: h })) } });
        return router;
      },
      delete: (path, ...handlers) => {
        routesStack.push({ route: { path, methods: { delete: true }, stack: handlers.map(h => ({ handle: h })) } });
        return router;
      },
      all: (path, ...handlers) => {
        routesStack.push({ route: { path, methods: { all: true, patch: true, delete: true, put: true, post: true }, stack: handlers.map(h => ({ handle: h })) } });
        return router;
      },
      use: () => router,
    };
    return router;
  };
  return {
    Router: createRouter,
  };
}, { virtual: true });

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }), { virtual: true });
jest.mock('sharp', () => ({}), { virtual: true });
jest.mock('../utils/imageProcessor', () => ({
  processImage: jest.fn(),
  isProcessableImage: jest.fn(),
}));
jest.mock('../services/internalSyncService', () => ({
  syncProductUpdate: jest.fn().mockResolvedValue({}),
}));
jest.mock('../services/merchantService', () => ({
  decorateMerchantProductsWithInventorySnapshot: jest.fn().mockResolvedValue([]),
}));
jest.mock('../services/fulfillmentService', () => ({
  normalizeFulfillmentMode: jest.fn().mockReturnValue('MERCHANT'),
}));
jest.mock('../services/rag/RagKnowledgeMaintenanceService', () => ({
  backfillProductEmbeddings: jest.fn().mockResolvedValue({}),
}));
jest.mock('../services/aiServiceAdminClient', () => ({
  triggerProductEmbeddingSync: jest.fn().mockResolvedValue({}),
  embedKnowledgeItem: jest.fn().mockResolvedValue({}),
  visualSearch: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock('../services/whatsapp/productOfferService', () => ({
  autoSendNewProduct: jest.fn().mockResolvedValue({}),
}));
jest.mock('../services/inventorySyncService', () => ({
  syncProductToInventory: jest.fn(),
  syncProductVariantsStock: jest.fn(),
}));
jest.mock('../services/redisCacheService', () => ({
  del: jest.fn(),
  delPattern: jest.fn(),
}));
jest.mock('../controller/storefrontHtmlController', () => ({
  invalidateCompanyStorefrontHtmlCache: jest.fn(),
}));
jest.mock('../controller/volumeDiscountController', () => ({
  getVolumeDiscounts: jest.fn(),
  createVolumeDiscount: jest.fn(),
  updateVolumeDiscount: jest.fn(),
  deleteVolumeDiscount: jest.fn(),
}));
jest.mock('../controller/productPresentationController', () => ({
  createPresentation: jest.fn(),
  getPresentations: jest.fn(),
  getSinglePresentation: jest.fn(),
  updatePresentation: jest.fn(),
  deletePresentation: jest.fn(),
}));
jest.mock('../controller/productConversionController', () => ({
  convertProductToPresentation: jest.fn(),
  convertBulkProductsToPresentations: jest.fn(),
}));
jest.mock('../middleware/rbacMiddleware', () => ({
  requireDbPermission: () => (req, res, next) => next(),
}));
jest.mock('../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => next(),
}));

jest.mock('../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  safeQuery: jest.fn((cb) => cb()),
  executeWithRetry: jest.fn((cb) => cb()),
}));

const productAuditService = require('../services/productAuditService');
const productController = require('../controller/productController');
const productRoutes = require('../routes/productRoutes');

describe('Product Audit Log System Tests (سجل تعديلات المنتجات)', () => {
  const companyId = 'comp-test-123';
  const testUser = {
    id: 'user-789',
    name: 'أحمد علي',
    email: 'ahmed.ali@example.com',
    companyId,
    role: 'COMPANY_ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1) تعديل سعر منتج من 550 لـ 400
  describe('Case 1: Price modification audit (تعديل السعر)', () => {
    it('records price change from 550 to 400 with real user snapshot', async () => {
      const productId = 'prod-price-1';
      const beforeProduct = {
        id: productId,
        companyId,
        name: 'منتج تجريبي',
        price: 550,
        stock: 20,
      };
      const afterProduct = {
        id: productId,
        companyId,
        name: 'منتج تجريبي',
        price: 400,
        stock: 20,
      };

      const diff = productAuditService.computeProductDiff(beforeProduct, afterProduct);
      expect(diff).toEqual({
        price: { before: 550, after: 400 },
      });

      mockPrisma.productAuditLog.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'audit-log-1', ...data })
      );

      const logged = await productAuditService.logProductChange({
        companyId,
        productId,
        user: testUser,
        action: 'UPDATE',
        before: beforeProduct,
        after: afterProduct,
        source: 'UI',
      });

      expect(mockPrisma.productAuditLog.create).toHaveBeenCalledTimes(1);
      const callData = mockPrisma.productAuditLog.create.mock.calls[0][0].data;

      expect(callData.companyId).toBe(companyId);
      expect(callData.productId).toBe(productId);
      expect(callData.userId).toBe(testUser.id);
      expect(callData.userName).toBe('أحمد علي');
      expect(callData.action).toBe('UPDATE');
      expect(callData.source).toBe('UI');
      expect(callData.changes).toEqual({
        price: { before: 550, after: 400 },
      });
      expect(logged.changes.price).toEqual({ before: 550, after: 400 });
    });
  });

  // 2) تعديل الاسم بالعربي
  describe('Case 2: Arabic name modification audit (تعديل الاسم بالعربي)', () => {
    it('records Arabic name change diff in the audit log', async () => {
      const productId = 'prod-name-2';
      const beforeProduct = {
        id: productId,
        companyId,
        name: 'ساعة ذكية الترا',
        price: 900,
      };
      const afterProduct = {
        id: productId,
        companyId,
        name: 'ساعة ذكية برو ماكس',
        price: 900,
      };

      const diff = productAuditService.computeProductDiff(beforeProduct, afterProduct);
      expect(diff).toEqual({
        name: { before: 'ساعة ذكية الترا', after: 'ساعة ذكية برو ماكس' },
      });

      mockPrisma.productAuditLog.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'audit-log-2', ...data })
      );

      await productAuditService.logProductChange({
        companyId,
        productId,
        user: testUser,
        action: 'UPDATE',
        before: beforeProduct,
        after: afterProduct,
        source: 'UI',
      });

      expect(mockPrisma.productAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId,
            productId,
            userName: 'أحمد علي',
            action: 'UPDATE',
            changes: {
              name: { before: 'ساعة ذكية الترا', after: 'ساعة ذكية برو ماكس' },
            },
          }),
        })
      );
    });
  });

  // 3) تعديل جماعي لـ 10 منتجات = 10 صفوف BULK_UPDATE
  describe('Case 3: Bulk update of 10 products (تعديل جماعي لـ 10 منتجات)', () => {
    it('creates exactly 10 separate rows with action=BULK_UPDATE', async () => {
      const productIds = Array.from({ length: 10 }, (_, i) => `prod-bulk-${i + 1}`);
      expect(productIds.length).toBe(10);

      mockPrisma.productAuditLog.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `audit-${data.productId}`, ...data })
      );

      const logs = await productAuditService.logBulkProductChanges({
        companyId,
        productIds,
        user: testUser,
        action: 'BULK_UPDATE',
        source: 'UI',
        changes: {
          stock: { before: 10, after: 50 },
        },
      });

      expect(logs.length).toBe(10);
      expect(mockPrisma.productAuditLog.create).toHaveBeenCalledTimes(10);

      // Verify each row has BULK_UPDATE action and its respective productId
      mockPrisma.productAuditLog.create.mock.calls.forEach((call, index) => {
        const row = call[0].data;
        expect(row.action).toBe('BULK_UPDATE');
        expect(row.productId).toBe(`prod-bulk-${index + 1}`);
        expect(row.companyId).toBe(companyId);
        expect(row.userName).toBe('أحمد علي');
        expect(row.changes).toEqual({ stock: { before: 10, after: 50 } });
      });
    });
  });

  // 4) استيراد منتجات بـ source=IMPORT
  describe('Case 4: Product import audit (استيراد منتجات)', () => {
    it('creates audit entries with source=IMPORT and action=IMPORT', async () => {
      const productId = 'prod-import-1';
      const importedProduct = {
        id: productId,
        companyId,
        name: 'منتج مستورد من ملف',
        sku: 'IMP-001',
        price: 250,
        stock: 100,
        source: 'import',
      };

      mockPrisma.productAuditLog.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'audit-import-1', ...data })
      );

      const log = await productAuditService.logProductChange({
        companyId,
        productId,
        user: testUser,
        action: 'IMPORT',
        after: importedProduct,
        source: 'IMPORT',
      });

      expect(mockPrisma.productAuditLog.create).toHaveBeenCalledTimes(1);
      const callData = mockPrisma.productAuditLog.create.mock.calls[0][0].data;
      expect(callData.source).toBe('IMPORT');
      expect(callData.action).toBe('IMPORT');
      expect(callData.productId).toBe(productId);
      expect(callData.companyId).toBe(companyId);
    });
  });

  // 5) حماية الصلاحيات و Pagination والمنتج القديم بدون سجل
  describe('Case 5: History retrieval, pagination, and old products without history', () => {
    it('returns empty history array without errors for products without previous audit log', async () => {
      mockPrisma.productAuditLog.count.mockResolvedValue(0);
      mockPrisma.productAuditLog.findMany.mockResolvedValue([]);

      const result = await productAuditService.getProductHistory({
        companyId,
        productId: 'old-product-no-history',
        page: 1,
        limit: 10,
      });

      expect(result.logs).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('returns properly paginated audit records for a product with history', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'UPDATE', createdAt: new Date() },
        { id: 'log-2', action: 'CREATE', createdAt: new Date() },
      ];
      mockPrisma.productAuditLog.count.mockResolvedValue(25);
      mockPrisma.productAuditLog.findMany.mockResolvedValue(mockLogs);

      const result = await productAuditService.getProductHistory({
        companyId,
        productId: 'prod-with-history',
        page: 2,
        limit: 10,
      });

      expect(result.logs.length).toBe(2);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('handles controller getProductHistory and validates companyId', async () => {
      const req = {
        user: { companyId: 'comp-1' },
        params: { id: 'prod-1' },
        query: { page: '1', limit: '10' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      mockPrisma.productAuditLog.count.mockResolvedValue(1);
      mockPrisma.productAuditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'CREATE', userName: 'أحمد علي' },
      ]);

      await productController.getProductHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.objectContaining({ page: 1, total: 1 }),
        })
      );
    });
  });

  // 6) منع التعديل والحذف (Audit Immutability - 405/403)
  describe('Case 6: Immutability enforcement (عدم قابلية التعديل أو الحذف)', () => {
    it('blocks modification or deletion of audit logs with 405 Method Not Allowed', () => {
      // Find matching routes on the express router
      const auditRoutes = productRoutes.stack.filter((layer) => {
        if (!layer.route) return false;
        const path = layer.route.path;
        return (
          path === '/audit' ||
          path === '/audit/:auditId' ||
          path === '/:id/history' ||
          path === '/:id/history/:historyId'
        );
      });

      expect(auditRoutes.length).toBeGreaterThan(0);

      // Verify that handler returns 405
      const mockReq = { method: 'PATCH' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      // Find all handler functions for /audit or /audit/:auditId
      const allHandlers = auditRoutes.flatMap((layer) =>
        layer.route.stack.map((s) => s.handle)
      );

      // Invoke route middleware with PATCH method
      let blockedWith405 = false;
      for (const handler of allHandlers) {
        handler(mockReq, mockRes, mockNext);
        if (mockRes.status.mock.calls.some((call) => call[0] === 405 || call[0] === 403)) {
          blockedWith405 = true;
          break;
        }
      }

      expect(blockedWith405).toBe(true);
    });
  });
});
