const mockGetVariationsAnalytics = jest.fn();

jest.mock('../../services/analyticsService', () => ({
  getVariationsAnalytics: (...args) => mockGetVariationsAnalytics(...args)
}));

const { getVariationsAnalytics } = require('../../controller/analyticsController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    })
  };
  return response;
};

describe('analyticsController.getVariationsAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 403 when companyId is missing', async () => {
    const res = createResponse();
    await getVariationsAnalytics({ user: {}, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload.success).toBe(false);
    expect(mockGetVariationsAnalytics).not.toHaveBeenCalled();
  });

  test('returns variations analytics with parsed dates and optional productId', async () => {
    mockGetVariationsAnalytics.mockResolvedValue({
      sizes: [{ name: 'L', sales: 10, revenue: 1000 }],
      colors: [{ name: 'أزرق', sales: 10, revenue: 1000 }],
      topVariations: [{ name: 'أزرق - L', product: 'تيشيرت', sales: 10, revenue: 1000, orders: 4 }],
      totalVariations: 1,
      totalSales: 10,
      totalRevenue: 1000,
      totalOrders: 4
    });

    const res = createResponse();
    await getVariationsAnalytics(
      {
        user: { companyId: 'company-1' },
        query: { startDate: '2026-09-01', endDate: '2026-09-30', productId: 'prod-123' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(mockGetVariationsAnalytics).toHaveBeenCalledWith(
      'company-1',
      expect.any(Date),
      expect.any(Date),
      'prod-123'
    );
    expect(res.payload.data.sizes).toHaveLength(1);
    expect(res.payload.data.totalVariations).toBe(1);
  });
});
