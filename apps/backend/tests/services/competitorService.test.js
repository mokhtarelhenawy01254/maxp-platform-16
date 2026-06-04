const mockPrisma = {
  competitor: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  competitorProduct: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  competitorPriceHistory: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  competitorAd: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  competitorReport: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

const CompetitorService = require('../../services/competitorService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('CompetitorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSharedPrismaClient.mockReturnValue(mockPrisma);
  });

  describe('list', () => {
    it('returns paginated competitors', async () => {
      const competitors = [{ id: 'c1', name: 'Competitor A' }];
      mockPrisma.competitor.findMany.mockResolvedValue(competitors);
      mockPrisma.competitor.count.mockResolvedValue(1);

      const result = await CompetitorService.list('company-1', { page: 1, limit: 10 });

      expect(mockPrisma.competitor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'company-1' } })
      );
      expect(result.data).toEqual(competitors);
      expect(result.pagination.total).toBe(1);
    });

    it('filters by search', async () => {
      mockPrisma.competitor.findMany.mockResolvedValue([]);
      mockPrisma.competitor.count.mockResolvedValue(0);

      await CompetitorService.list('company-1', { search: 'test' });

      expect(mockPrisma.competitor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'test', mode: 'insensitive' },
          }),
        })
      );
    });

    it('filters by isActive', async () => {
      mockPrisma.competitor.findMany.mockResolvedValue([]);
      mockPrisma.competitor.count.mockResolvedValue(0);

      await CompetitorService.list('company-1', { isActive: 'true' });

      expect(mockPrisma.competitor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  describe('getById', () => {
    it('returns competitor with nested relations', async () => {
      const expected = { id: 'c1', name: 'Comp', products: [], ads: [], reports: [], _count: { products: 0, ads: 0, reports: 0 } };
      mockPrisma.competitor.findFirst.mockResolvedValue(expected);

      const result = await CompetitorService.getById('company-1', 'c1');

      expect(result).toEqual(expected);
      expect(mockPrisma.competitor.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1', companyId: 'company-1' } })
      );
    });

    it('returns null for non-existent competitor', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);
      const result = await CompetitorService.getById('company-1', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates competitor with generated slug', async () => {
      const input = { name: 'مكتبة المنافس', url: 'https://example.com', platform: 'manual', notes: 'قوي' };
      mockPrisma.competitor.create.mockResolvedValue({ id: 'new-id', ...input, slug: '-----' });

      const result = await CompetitorService.create('company-1', input);

      expect(mockPrisma.competitor.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'مكتبة المنافس', companyId: 'company-1' }),
      });
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('updates existing competitor', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue({ id: 'c1', companyId: 'company-1' });
      mockPrisma.competitor.update.mockResolvedValue({ id: 'c1', name: 'Updated' });

      const result = await CompetitorService.update('company-1', 'c1', { name: 'Updated' });

      expect(result).toBeDefined();
      expect(mockPrisma.competitor.update).toHaveBeenCalled();
    });

    it('returns null if competitor not found', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);
      const result = await CompetitorService.update('company-1', 'c1', { name: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('deletes competitor and returns true', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue({ id: 'c1', companyId: 'company-1' });

      const result = await CompetitorService.remove('company-1', 'c1');

      expect(result).toBe(true);
      expect(mockPrisma.competitor.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('returns false if not found', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);
      const result = await CompetitorService.remove('company-1', 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('addProduct', () => {
    it('creates product and records price history', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue({ id: 'c1', companyId: 'company-1' });
      mockPrisma.competitorProduct.create.mockResolvedValue({ id: 'p1', price: 100 });
      mockPrisma.competitorPriceHistory.create.mockResolvedValue({});

      const result = await CompetitorService.addProduct('company-1', 'c1', { name: 'Product', price: 100 });

      expect(result).toBeDefined();
      expect(mockPrisma.competitorPriceHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ price: 100 }) })
      );
    });

    it('returns null if competitor not found', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);
      const result = await CompetitorService.addProduct('company-1', 'c1', { name: 'Product' });
      expect(result).toBeNull();
    });
  });

  describe('getPriceHistory', () => {
    it('returns price history array', async () => {
      mockPrisma.competitorProduct.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.competitorPriceHistory.findMany.mockResolvedValue([{ price: 100 }, { price: 90 }]);

      const result = await CompetitorService.getPriceHistory('company-1', 'p1');

      expect(result).toHaveLength(2);
    });

    it('returns null if product not found', async () => {
      mockPrisma.competitorProduct.findFirst.mockResolvedValue(null);
      const result = await CompetitorService.getPriceHistory('company-1', 'p1');
      expect(result).toBeNull();
    });
  });

  describe('addAd', () => {
    it('creates ad for competitor', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue({ id: 'c1', companyId: 'company-1' });
      mockPrisma.competitorAd.create.mockResolvedValue({ id: 'a1', headline: 'Ad' });

      const result = await CompetitorService.addAd('company-1', 'c1', { headline: 'Ad', platform: 'facebook' });

      expect(result).toBeDefined();
      expect(mockPrisma.competitorAd.create).toHaveBeenCalled();
    });

    it('returns null if competitor not found', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);
      const result = await CompetitorService.addAd('company-1', 'c1', { headline: 'Ad' });
      expect(result).toBeNull();
    });
  });

  describe('listProducts', () => {
    it('returns paginated products', async () => {
      mockPrisma.competitorProduct.findMany.mockResolvedValue([{ id: 'p1' }]);
      mockPrisma.competitorProduct.count.mockResolvedValue(1);

      const result = await CompetitorService.listProducts('company-1', 'c1');

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('listAds', () => {
    it('returns paginated ads', async () => {
      mockPrisma.competitorAd.findMany.mockResolvedValue([{ id: 'a1' }]);
      mockPrisma.competitorAd.count.mockResolvedValue(1);

      const result = await CompetitorService.listAds('company-1', 'c1');

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('generates report with analysis', async () => {
      const competitor = {
        id: 'c1',
        name: 'Competitor',
        products: [{ id: 'p1', firstSeen: new Date(), priceHistory: [{ price: 100 }, { price: 90 }] }],
        ads: [{ id: 'a1' }],
      };
      mockPrisma.competitor.findFirst.mockResolvedValue(competitor);
      mockPrisma.competitorReport.create.mockResolvedValue({
        id: 'r1', type: 'weekly', title: 'تقرير أسبوعي - Competitor', summary: '...', insights: '{}', data: '{}',
      });

      const result = await CompetitorService.generateReport('company-1', 'c1', 'weekly');

      expect(result).toBeDefined();
      expect(mockPrisma.competitorReport.create).toHaveBeenCalled();
    });

    it('returns null if competitor not found', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);
      const result = await CompetitorService.generateReport('company-1', 'c1');
      expect(result).toBeNull();
    });
  });

  describe('listReports', () => {
    it('returns reports for competitor', async () => {
      mockPrisma.competitorReport.findMany.mockResolvedValue([{ id: 'r1' }]);
      mockPrisma.competitorReport.count.mockResolvedValue(1);

      const result = await CompetitorService.listReports('company-1', 'c1');

      expect(result.data).toHaveLength(1);
    });
  });

  describe('updateProductPrice', () => {
    it('updates price and records history', async () => {
      mockPrisma.competitorProduct.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.competitorProduct.update.mockResolvedValue({ id: 'p1', price: 200 });
      mockPrisma.competitorPriceHistory.create.mockResolvedValue({});

      const result = await CompetitorService.updateProductPrice('company-1', 'p1', 200);

      expect(result).toBeDefined();
      expect(mockPrisma.competitorProduct.update).toHaveBeenCalled();
      expect(mockPrisma.competitorPriceHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ price: 200 }) })
      );
    });

    it('returns null if product not found', async () => {
      mockPrisma.competitorProduct.findFirst.mockResolvedValue(null);
      const result = await CompetitorService.updateProductPrice('company-1', 'p1', 200);
      expect(result).toBeNull();
    });
  });
});
