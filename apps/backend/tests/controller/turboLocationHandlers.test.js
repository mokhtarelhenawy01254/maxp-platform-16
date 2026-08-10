const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

const mockSearchAreaByText = jest.fn();

jest.mock('../../services/turboService', () => {
  return jest.fn().mockImplementation(() => ({
    searchAreaByText: (...args) => mockSearchAreaByText(...args),
  }));
});

const { searchAreaByText, searchAreaByTextPublic } = require('../../controller/turbo/locationHandlers');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('turbo locationHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchAreaByText', () => {
    test('returns matches for an authenticated company', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        turboApiKey: 'test-key',
        turboEnabled: true,
      });
      mockSearchAreaByText.mockResolvedValue({
        success: true,
        matches: [
          {
            governorateId: '1',
            governorate: 'القاهرة',
            areaId: '10',
            area: 'مدينة نصر',
            confidence: 1,
          },
        ],
        count: 1,
      });
      const req = { query: { q: 'مدينة نصر' }, user: { companyId: 'comp1' } };
      const res = createMockResponse();

      await searchAreaByText(req, res);

      expect(mockSearchAreaByText).toHaveBeenCalledWith('مدينة نصر', { limit: undefined });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    test('rejects requests without companyId', async () => {
      const req = { query: { q: 'مدينة نصر' }, user: {} };
      const res = createMockResponse();

      await searchAreaByText(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('searchAreaByTextPublic', () => {
    test('returns matches for a public storefront request with companyId query', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        turboApiKey: 'test-key',
        turboEnabled: true,
      });
      mockSearchAreaByText.mockResolvedValue({
        success: true,
        matches: [
          {
            governorateId: '1',
            governorate: 'القاهرة',
            areaId: '10',
            area: 'مدينة نصر',
            confidence: 1,
          },
        ],
        count: 1,
      });
      const req = { query: { q: 'مدينة نصر', companyId: 'comp1' }, body: {} };
      const res = createMockResponse();

      await searchAreaByTextPublic(req, res);

      expect(mockSearchAreaByText).toHaveBeenCalledWith('مدينة نصر', { limit: undefined });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    test('rejects public requests without companyId', async () => {
      const req = { query: { q: 'مدينة نصر' }, body: {} };
      const res = createMockResponse();

      await searchAreaByTextPublic(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('rejects public requests without query', async () => {
      const req = { query: { companyId: 'comp1' }, body: {} };
      const res = createMockResponse();

      await searchAreaByTextPublic(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
