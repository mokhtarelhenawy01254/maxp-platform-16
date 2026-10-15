const mockPrisma = {
  competitor: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
  competitorProduct: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), count: jest.fn() },
  competitorAd: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
  competitorReport: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  competitorSocialProfile: { create: jest.fn() },
  competitorPriceHistory: { create: jest.fn(), findMany: jest.fn() },
  product: { findMany: jest.fn() },
  company: { findUnique: jest.fn() },
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
    it('returns price comparison with params.id (standard route param)', async () => {
      CompetitorService.getById.mockResolvedValue({ id: 'c1', name: 'Comp' });
      mockPrisma.competitorProduct.findMany.mockResolvedValue([{ id: 'p1', name: 'Prod', price: 100, sku: 'SKU1', currency: 'EGP' }]);
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'yp1', name: 'My Prod', price: 90, sku: 'MY-SKU1' }]);

      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' } };
      const res = createResponse();

      await controller.priceCompare(req, res);

      expect(CompetitorService.getById).toHaveBeenCalledWith('company-1', 'c1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns price comparison with params.competitorId', async () => {
      CompetitorService.getById.mockResolvedValue({ id: 'c1', name: 'Comp' });
      mockPrisma.competitorProduct.findMany.mockResolvedValue([{ id: 'p1', name: 'Prod', price: 100, sku: 'SKU1', currency: 'EGP' }]);
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'yp1', name: 'My Prod', price: 90, sku: 'MY-SKU1' }]);

      const req = { user: { companyId: 'company-1' }, params: { competitorId: 'c1' } };
      const res = createResponse();

      await controller.priceCompare(req, res);

      expect(CompetitorService.getById).toHaveBeenCalledWith('company-1', 'c1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 404 if competitor not found', async () => {
      CompetitorService.getById.mockResolvedValue(null);
      const req = { user: { companyId: 'company-1' }, params: { id: 'nonexistent' } };
      const res = createResponse();

      await controller.priceCompare(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getBattlecard', () => {
    it('returns battlecard with params.id (standard route param)', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue({
        id: 'c1',
        name: 'Target Comp',
        platform: 'CUSTOM',
        url: 'https://example.com',
        status: 'NEW',
        _count: { products: 2, ads: 1 },
      });
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.competitorReport.findMany.mockResolvedValue([]);
      mockPrisma.competitorProduct.findMany.mockResolvedValue([]);

      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, query: {} };
      const res = createResponse();

      await controller.getBattlecard(req, res);

      expect(mockPrisma.competitor.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1', companyId: 'company-1' } })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            competitor: expect.objectContaining({ id: 'c1', name: 'Target Comp' }),
          }),
        })
      );
    });

    it('returns 404 if competitor not found for battlecard', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.competitorReport.findMany.mockResolvedValue([]);

      const req = { user: { companyId: 'company-1' }, params: { id: 'nonexistent' }, query: {} };
      const res = createResponse();

      await controller.getBattlecard(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateStatus', () => {
    it('updates competitor status successfully', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue({ id: 'c1', companyId: 'company-1' });
      mockPrisma.competitor.update.mockResolvedValue({ id: 'c1', status: 'FOLLOWING' });

      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, body: { status: 'FOLLOWING' } };
      const res = createResponse();

      await controller.updateStatus(req, res);

      expect(mockPrisma.competitor.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1' }, data: { status: 'FOLLOWING' } })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('rejects invalid status values', async () => {
      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, body: { status: 'INVALID' } };
      const res = createResponse();

      await controller.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: expect.any(String) }));
    });

    it('returns 404 if competitor not found', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);

      const req = { user: { companyId: 'company-1' }, params: { id: 'nonexistent' }, body: { status: 'NEW' } };
      const res = createResponse();

      await controller.updateStatus(req, res);

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

  describe('autoDiscover (Smart Radar & Exclusion Engine)', () => {
    it('excludes own company products, company name, and already tracked competitors, and returns rationale and source', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        name: 'MaxP Online',
        businessSpecialty: { slug: 'software', nameAr: 'برمجيات وحلول رقمية' },
      });
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'كورس MaxP الاحترافي', sku: 'MX-COURSE', category: 'software' },
        { id: 'p2', name: 'نظام إدارة المخزون', sku: 'MX-INV', category: 'software' },
      ]);
      mockPrisma.competitor.findMany.mockResolvedValue([
        { name: 'أودو (Odoo)', url: 'https://www.odoo.com', slug: 'odoo' },
      ]);

      const req = { user: { companyId: 'company-1' }, query: { maxResults: '5' } };
      const res = createResponse();

      await controller.autoDiscover(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          discovered: expect.any(Array),
        }),
      }));

      const callArgs = res.json.mock.calls[0][0];
      const discovered = callArgs.data.discovered;

      // 1. Must NOT suggest own company ("MaxP Online")
      expect(discovered.some(d => d.suggestedName.toLowerCase().includes('maxp'))).toBe(false);

      // 2. Must NOT suggest own product ("كورس MaxP الاحترافي")
      expect(discovered.some(d => d.suggestedName === 'كورس MaxP الاحترافي')).toBe(false);

      // 3. Must NOT re-suggest already tracked competitor ("أودو (Odoo)")
      expect(discovered.some(d => d.suggestedName.includes('Odoo'))).toBe(false);

      // 4. Must suggest valid ecosystem competitors with source, reason, and matchedProducts
      expect(discovered.length).toBeGreaterThan(0);
      const first = discovered[0];
      expect(first).toHaveProperty('suggestedName');
      expect(first).toHaveProperty('source');
      expect(first).toHaveProperty('reason');
      expect(first).toHaveProperty('matchedProducts');
      expect(first.source.length).toBeGreaterThan(0);
      expect(first.reason.length).toBeGreaterThan(0);
    });

    it('matches fashion specialty when company businessSpecialty is fashion', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'company-fashion',
        name: 'My Fashion Brand',
        businessSpecialty: { slug: 'fashion', nameAr: 'ملابس وأزياء' },
      });
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'pf1', name: 'قميص أكسفورد أزرق', sku: 'FASH-01', category: 'fashion' },
      ]);
      mockPrisma.competitor.findMany.mockResolvedValue([]);

      const req = { user: { companyId: 'company-fashion' }, query: { maxResults: '3' } };
      const res = createResponse();

      await controller.autoDiscover(req, res);

      const discovered = res.json.mock.calls[0][0].data.discovered;
      expect(discovered.length).toBeGreaterThan(0);
      // Fashion competitors like Town Team or Dalydress should be recommended
      const hasFashionComp = discovered.some(d => d.suggestedName.includes('Town Team') || d.suggestedName.includes('تاون تيم') || d.suggestedName.includes('دالي دريس'));
      expect(hasFashionComp).toBe(true);
    });
  });

  describe('structuredPricing in getBattlecard', () => {
    it('returns structuredPricing in battlecard competitor data', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue({
        id: 'c1',
        name: 'Salla',
        platform: 'salla',
        url: 'https://salla.com',
        status: 'FOLLOWING',
        monthlyPrice: 500,
        yearlyPrice: 5000,
        pricingNotes: 'باقة المتاجر المحترفة',
        metadata: {
          structuredPricing: {
            price: 500,
            currency: 'SAR',
            cycle: 'monthly',
            monthlyPrice: 500,
            yearlyPrice: 5000,
            notes: 'باقة المتاجر المحترفة',
          },
        },
        _count: { products: 10, ads: 5 },
      });
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.competitorReport.findMany.mockResolvedValue([]);
      mockPrisma.competitorProduct.findMany.mockResolvedValue([]);

      const req = { user: { companyId: 'company-1' }, params: { id: 'c1' }, query: {} };
      const res = createResponse();

      await controller.getBattlecard(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          competitor: expect.objectContaining({
            id: 'c1',
            structuredPricing: expect.objectContaining({
              price: 500,
              currency: 'SAR',
              cycle: 'monthly',
            }),
          }),
        }),
      }));
    });
  });
});
