const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  marketplaceApp: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  companyApp: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
  executeWithRetry: jest.fn(async (operation) => operation()),
  closeSharedDatabase: jest.fn(async () => {}),
}));

const { checkAppAccess, getCandidateAppSlugs } = require('../../middleware/checkAppAccess');
const { marketplaceCatalogService } = require('../../services/catalog/marketplaceCatalogService');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('POS Pro Standalone App & Access Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({});
  });

  test('catalog contains pos-pro with public visibility, standalone requiredApps, and /pos routes', async () => {
    const catalog = await marketplaceCatalogService.getSnapshot({ forceReload: true });
    const posApp = catalog.apps.find((a) => a.slug === 'pos-pro');

    expect(posApp).toBeDefined();
    expect(posApp.isActive).toBe(true);
    expect(posApp.isPublic).toBe(true);
    expect(posApp.mainRoute).toBe('/pos');
    expect(posApp.adminRoute).toBe('/pos');
    expect(posApp.category).toBe('ECOMMERCE');
    expect(posApp.monthlyPrice).toBe(149);
    expect(posApp.yearlyPrice).toBe(1490);
    expect(posApp.trialDays).toBe(14);
    expect(posApp.requiredApps).toEqual([]);
    expect(posApp.features).toBeDefined();
    expect(posApp.features.posCashier?.enabled).toBe(true);
  });

  test('pos-pro route allows company with active pos-pro subscription', async () => {
    const req = {
      user: {
        id: 'usr_test_pos_1',
        role: 'COMPANY_ADMIN',
        companyId: 'comp_test_standalone_pos'
      }
    };
    const res = createResponse();
    const next = jest.fn();

    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: 'app-pos',
        slug: 'pos-pro',
        name: 'نظام POS',
      },
    ]);
    mockPrisma.companyApp.findUnique.mockResolvedValue({
      id: 'company-app-pos',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 86400000),
    });

    await checkAppAccess('pos-pro')(req, res, next);

    expect(getCandidateAppSlugs('pos-pro')).toContain('pos-pro');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.marketplaceApp).toEqual(
      expect.objectContaining({
        slug: 'pos-pro',
      })
    );
  });

  test('pos-pro route allows restaurant company with cafe-restaurant-pro without requiring pos-pro subscription', async () => {
    const req = {
      user: {
        id: 'usr_test_cafe_1',
        role: 'COMPANY_ADMIN',
        companyId: 'comp_test_cafe_restaurant'
      }
    };
    const res = createResponse();
    const next = jest.fn();

    // The middleware checks candidate slugs for pos-pro: ['pos-pro', 'store-pro', 'store', ..., 'cafe-restaurant-pro']
    expect(getCandidateAppSlugs('pos-pro')).toContain('cafe-restaurant-pro');

    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: 'app-cafe',
        slug: 'cafe-restaurant-pro',
        name: 'نظام الكافيهات والمطاعم',
      },
    ]);
    mockPrisma.companyApp.findUnique.mockResolvedValue({
      id: 'company-app-cafe',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 86400000),
    });

    await checkAppAccess('pos-pro')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.marketplaceApp).toEqual(
      expect.objectContaining({
        slug: 'cafe-restaurant-pro',
      })
    );
  });

  test('order-core allows standalone pos-pro company', async () => {
    const req = {
      user: {
        id: 'usr_test_pos_1',
        role: 'COMPANY_ADMIN',
        companyId: 'comp_test_standalone_pos'
      }
    };
    const res = createResponse();
    const next = jest.fn();

    expect(getCandidateAppSlugs('order-core')).toContain('pos-pro');

    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: 'app-pos',
        slug: 'pos-pro',
        name: 'نظام POS',
      },
    ]);
    mockPrisma.companyApp.findUnique.mockResolvedValue({
      id: 'company-app-pos',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 86400000),
    });

    await checkAppAccess('order-core')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.marketplaceApp).toEqual(
      expect.objectContaining({
        slug: 'pos-pro',
      })
    );
  });
});
