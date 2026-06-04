const mockPrisma = {
  competitor: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  competitorProduct: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  competitorAd: { findMany: jest.fn(), count: jest.fn() },
  competitorReport: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  product: { findMany: jest.fn() },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock('../../services/competitorService', () => ({
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addProduct: jest.fn(),
  listProducts: jest.fn(),
  getPriceHistory: jest.fn(),
  addAd: jest.fn(),
  listAds: jest.fn(),
  generateReport: jest.fn(),
  listReports: jest.fn(),
}));

const CompetitorService = require('../../services/competitorService');
const controller = require('../../controller/competitorController');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CompetitorController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSharedPrismaClient.mockReturnValue(mockPrisma);
  });

  describe('list', () => {
    it('returns competitors list', async () => {
      const req = { user: { companyId: 'company-1' }, query: {} };
      const res = createResponse();
      CompetitorService.list.mockResolvedValue({ data: [], pagination: { total: 0 } });

      await controller.list(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('handles errors', async () => {
      const req = { user: { companyId: 'company-1' }, query: {} };
      const res = createResponse();
      CompetitorService.list.mockRejectedValue(new Error('DB error'));

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('create', () => {
    it('creates competitor with name', async () => {
      const req = { user: { companyId: 'company-1' }, body: { name: 'Test Comp' } };
      const res = createResponse();
      CompetitorService.create.mockResolvedValue({ id: 'c1' });

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 400 if name is missing', async () => {
      const req = { user: { companyId: 'company-1' }, body: {} };
      const res = createResponse();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getById', () => {
    it('returns competitor', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' } };
      const res = createResponse();
      CompetitorService.getById.mockResolvedValue({ id: 'c1' });

      await controller.getById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 404 if not found', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'nonexistent' } };
      const res = createResponse();
      CompetitorService.getById.mockResolvedValue(null);

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('update', () => {
    it('updates competitor', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, body: { name: 'Updated' } };
      const res = createResponse();
      CompetitorService.update.mockResolvedValue({ id: 'c1' });

      await controller.update(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('remove', () => {
    it('deletes competitor', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' } };
      const res = createResponse();
      CompetitorService.remove.mockResolvedValue(true);

      await controller.remove(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('addProduct', () => {
    it('adds product to competitor', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, body: { name: 'Product' } };
      const res = createResponse();
      CompetitorService.addProduct.mockResolvedValue({ id: 'p1' });

      await controller.addProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('listProducts', () => {
    it('lists products', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, query: {} };
      const res = createResponse();
      CompetitorService.listProducts.mockResolvedValue({ data: [], pagination: {} });

      await controller.listProducts(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getPriceHistory', () => {
    it('returns price history', async () => {
      const req = { user: { companyId: 'company-1' }, params: { productId: 'p1' } };
      const res = createResponse();
      CompetitorService.getPriceHistory.mockResolvedValue([{ price: 100 }]);

      await controller.getPriceHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('addAd', () => {
    it('adds ad to competitor', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, body: { headline: 'Ad' } };
      const res = createResponse();
      CompetitorService.addAd.mockResolvedValue({ id: 'a1' });

      await controller.addAd(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('listAds', () => {
    it('lists ads', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, query: {} };
      const res = createResponse();
      CompetitorService.listAds.mockResolvedValue({ data: [], pagination: {} });

      await controller.listAds(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('generateReport', () => {
    it('generates report', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, body: { type: 'weekly' } };
      const res = createResponse();
      CompetitorService.generateReport.mockResolvedValue({ id: 'r1' });

      await controller.generateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('listReports', () => {
    it('lists reports', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, query: {} };
      const res = createResponse();
      CompetitorService.listReports.mockResolvedValue({ data: [], pagination: {} });

      await controller.listReports(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('summary', () => {
    it('returns competitor summary', async () => {
      mockPrisma.competitor.count.mockResolvedValueOnce(5);
      mockPrisma.competitor.count.mockResolvedValueOnce(3);
      mockPrisma.competitorProduct.count.mockResolvedValueOnce(20);
      mockPrisma.competitorAd.count.mockResolvedValueOnce(15);
      mockPrisma.competitorReport.findMany.mockResolvedValueOnce([]);

      const req = { user: { companyId: 'company-1' } };
      const res = createResponse();

      await controller.summary(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(mockPrisma.competitor.count).toHaveBeenCalledTimes(2);
    });
  });

  describe('priceCompare', () => {
    it('returns price comparison', async () => {
      CompetitorService.getById.mockResolvedValue({ id: 'c1', name: 'Comp' });
      mockPrisma.competitorProduct.findMany.mockResolvedValue([{ id: 'p1', name: 'Prod', price: 100, sku: 'SKU1', currency: 'EGP' }]);
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'yp1', name: 'My Prod', price: 90, sku: 'MY-SKU1' }]);

      const req = { user: { companyId: 'company-1' }, params: { competitorId: 'c1' } };
      const res = createResponse();

      await controller.priceCompare(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 404 if competitor not found', async () => {
      CompetitorService.getById.mockResolvedValue(null);
      const req = { user: { companyId: 'company-1' }, params: { competitorId: 'nonexistent' } };
      const res = createResponse();

      await controller.priceCompare(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getAllReports', () => {
    it('returns all reports across competitors', async () => {
      mockPrisma.competitorReport.findMany.mockResolvedValue([]);
      mockPrisma.competitorReport.count.mockResolvedValue(0);

      const req = { user: { companyId: 'company-1' } };
      const res = createResponse();

      await controller.getAllReports(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
