/**
 * Task 621f2800 — الحارس موصول فعليًا بالشاشة (مش dead code).
 *
 * الباج: الباقة اتشالت كمنتج، وأي شاشة بتطلب bundle محذوف كانت بترجع 404 أعمى
 * (أو 500 لو القراءة رمت) — من غير كود مفهوم للواجهة.
 *
 * التست ده بيثبت إن GET /bundles/:slug بيرجع 409 + BUNDLE_NOT_FOUND
 * بدل 500/404 أعمى، وإن الحارس مستخدم في المسار الحقيقي.
 */

const mockCatalogService = {
  getAllApps: jest.fn(),
  getAllBundles: jest.fn(),
  getAppBySlug: jest.fn(),
  getBundleBySlug: jest.fn(),
};

const mockBusinessSpecialtyService = {
  getCompanySpecialtyAppSlugs: jest.fn(),
};

let mockPrisma;

function createPrismaMock() {
  return {
    marketplaceApp: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    companyApp: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    appBundle: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
  };
}

const mockExecuteWithRetry = jest.fn(async (operation) => operation());

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  executeWithRetry: (...args) => mockExecuteWithRetry(...args),
}));

jest.mock('../../services/catalog/marketplaceCatalogService', () => ({
  marketplaceCatalogService: mockCatalogService,
}));

jest.mock('../../services/businessSpecialtyService', () => mockBusinessSpecialtyService);

// uuid مش متاح في بيئة الاختبار المعزولة — نسخة وهمية كافية للمسار تحت التست
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }), { virtual: true });

const marketplaceController = require('../../controller/marketplaceController');

function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('bundle availability guard is wired (task 621f2800)', () => {
  beforeEach(() => {
    mockPrisma = createPrismaMock();
    jest.clearAllMocks();
    process.env.MARKETPLACE_CATALOG_SOURCE = 'db';
  });

  it('returns 409 BUNDLE_NOT_FOUND (not 500/404) when the bundle was removed', async () => {
    mockPrisma.appBundle.findFirst.mockResolvedValue(null);

    const req = { params: { slug: 'medical-bundle' }, user: null };
    const res = makeRes();

    await marketplaceController.getBundleDetails(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        code: 'BUNDLE_NOT_FOUND',
      })
    );
    expect(res.body.missing).toContain('medical-bundle');
  });

  it('never answers 500 for a missing bundle', async () => {
    mockPrisma.appBundle.findFirst.mockResolvedValue(null);

    const req = { params: { slug: 'messaging-bundle' }, user: null };
    const res = makeRes();

    await marketplaceController.getBundleDetails(req, res);

    expect(res.statusCode).not.toBe(500);
  });
});
