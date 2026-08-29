jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  executeWithRetry: jest.fn((fn) => fn()),
}));

jest.mock('../../services/amazonAffiliateService', () => ({
  MARKETPLACE_OPTIONS: [
    { code: 'EG', domain: 'amazon.eg', label: 'مصر' },
  ],
  DEFAULT_MARKETPLACE: 'www.amazon.com',
  getSettings: jest.fn(),
  importMany: jest.fn(),
  listProducts: jest.fn(),
  syncProducts: jest.fn(),
  deleteProduct: jest.fn(),
  resolveAsinFromUrl: jest.fn(),
  resolveMarketplaceForCountry: jest.fn(),
  fetchAmazonProductData: jest.fn(),
  buildAffiliateUrl: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const service = require('../../services/amazonAffiliateService');
const controller = require('../../controller/amazonAffiliateController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => { response.statusCode = code; return response; }),
    json: jest.fn((payload) => { response.payload = payload; return response; }),
  };
  return response;
};

const createRequest = (overrides = {}) => ({
  user: { companyId: 'c1', role: 'OWNER' },
  params: {},
  query: {},
  body: {},
  ...overrides,
});

describe('amazonAffiliateController — settings', () => {
  test('getSettings returns serialized settings WITHOUT the credential secret', async () => {
    service.getSettings.mockResolvedValue({
      id: 's1', companyId: 'c1', associateTag: 't-20', marketplace: 'amazon.eg',
      enableBuyButton: true, autoSyncEnabled: false, dataSource: 'manual',
      credentialId: 'cid', credentialSecret: 'super-secret', credentialVersion: '3.2',
      disclosureEnabled: true, isEnabled: true,
    });
    const req = createRequest();
    const res = createResponse();
    await controller.getSettings(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.credentialSecret).toBeUndefined();
    expect(res.payload.data.hasCredentials).toBe(true);
    expect(res.payload.data.marketplaces).toHaveLength(1);
  });

  test('getSettings returns null data when no settings saved', async () => {
    service.getSettings.mockResolvedValue(null);
    const req = createRequest();
    const res = createResponse();
    await controller.getSettings(req, res);
    expect(res.payload.data).toBe(null);
  });

  test('updateSettings keeps existing secret when none provided', async () => {
    const prisma = {
      amazonAffiliateSettings: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (args) => ({ id: 's1', ...args.data })),
        update: jest.fn(),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    service.getSettings.mockResolvedValue(null);

    const req = createRequest({ body: { associateTag: 'new-tag', marketplace: 'amazon.sa' } });
    const res = createResponse();
    await controller.updateSettings(req, res);

    expect(res.statusCode).toBe(200);
    const created = prisma.amazonAffiliateSettings.create.mock.calls[0][0].data;
    expect(created.associateTag).toBe('new-tag');
    expect(created.marketplace).toBe('amazon.sa');
    expect(created.credentialSecret).toBeUndefined();
  });
});

describe('amazonAffiliateController — import / list / sync / delete', () => {
  test('importProducts calls importMany and returns job summary', async () => {
    service.importMany.mockResolvedValue({ jobId: 'j1', succeeded: 2, failed: 1, status: 'PARTIAL', errors: [] });
    const req = createRequest({ body: { inputs: ['B0AAA', 'B0BBB', 'garbage'] } });
    const res = createResponse();
    await controller.importProducts(req, res);
    expect(service.importMany).toHaveBeenCalledWith({ companyId: 'c1', inputs: ['B0AAA', 'B0BBB', 'garbage'] });
    expect(res.payload.data.status).toBe('PARTIAL');
  });

  test('importProducts rejects empty input', async () => {
    service.importMany.mockResolvedValue({ ok: false, error: 'EMPTY_INPUT' });
    const req = createRequest({ body: { inputs: [] } });
    const res = createResponse();
    await controller.importProducts(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('listProducts returns rows', async () => {
    service.listProducts.mockResolvedValue([{ id: 'l1', asin: 'B0AAA' }]);
    const req = createRequest();
    const res = createResponse();
    await controller.listProducts(req, res);
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.total).toBe(1);
  });

  test('syncProducts returns summary', async () => {
    service.syncProducts.mockResolvedValue({ jobId: 'j1', succeeded: 3, failed: 0, status: 'SUCCESS' });
    const req = createRequest();
    const res = createResponse();
    await controller.syncProducts(req, res);
    expect(res.payload.data.status).toBe('SUCCESS');
  });

  test('deleteProduct returns 404 when not found', async () => {
    service.deleteProduct.mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
    const req = createRequest({ params: { id: 'nope' } });
    const res = createResponse();
    await controller.deleteProduct(req, res);
    expect(res.statusCode).toBe(404);
  });

  test('resolveProduct returns preview with affiliate URL', async () => {
    service.resolveAsinFromUrl.mockReturnValue('B0DLFMFBJW');
    service.resolveMarketplaceForCountry.mockReturnValue('amazon.eg');
    service.fetchAmazonProductData.mockResolvedValue({ name: 'X', price: 50, dataSource: 'og' });
    service.buildAffiliateUrl.mockReturnValue('https://amazon.eg/dp/B0DLFMFBJW?tag=t-20');
    service.getSettings.mockResolvedValue({ associateTag: 't-20', marketplace: 'amazon.eg' });

    const req = createRequest({ query: { input: 'https://amazon.eg/dp/B0DLFMFBJW', country: 'EG' } });
    const res = createResponse();
    await controller.resolveProduct(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.data.asin).toBe('B0DLFMFBJW');
    expect(res.payload.data.amazonUrl).toContain('tag=t-20');
  });

  test('resolveProduct returns 400 for invalid input', async () => {
    service.resolveAsinFromUrl.mockReturnValue(null);
    const req = createRequest({ query: { input: 'amzn.eu/xyz' } });
    const res = createResponse();
    await controller.resolveProduct(req, res);
    expect(res.statusCode).toBe(400);
  });
});