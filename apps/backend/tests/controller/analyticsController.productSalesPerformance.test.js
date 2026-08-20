const mockGetProductSalesPerformance = jest.fn();

jest.mock('../../services/analyticsService', () => ({
  getProductSalesPerformance: (...args) => mockGetProductSalesPerformance(...args)
}));

const { getProductSalesPerformance } = require('../../controller/analyticsController');

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

describe('analyticsController.getProductSalesPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 403 when companyId is missing', async () => {
    const res = createResponse();
    await getProductSalesPerformance({ user: {}, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload.success).toBe(false);
    expect(mockGetProductSalesPerformance).not.toHaveBeenCalled();
  });

  test('returns product sales performance with summary', async () => {
    mockGetProductSalesPerformance.mockResolvedValue({
      products: [
        { productId: 'prod-1', productName: '┘à┘å╪¬╪¼ ╪¬╪¼╪▒┘è╪¿┘è', quantitySold: 10, orderCount: 4, revenue: 1000, averagePrice: 100, unitsPerOrder: 2.5 }
      ],
      summary: {
        totalProducts: 1,
        totalQuantity: 10,
        totalRevenue: 1000,
        totalOrders: 4,
        averageOrderValue: 250
      }
    });

    const res = createResponse();
    await getProductSalesPerformance({ user: { companyId: 'company-1' }, query: { startDate: '2026-05-01', endDate: '2026-05-31' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(mockGetProductSalesPerformance).toHaveBeenCalledWith('company-1', expect.any(Date), expect.any(Date));
    expect(res.payload.data.products[0].quantitySold).toBe(10);
    expect(res.payload.data.summary.averageOrderValue).toBe(250);
  });

  test('returns 500 when service throws', async () => {
    mockGetProductSalesPerformance.mockRejectedValue(new Error('boom'));

    const res = createResponse();
    await getProductSalesPerformance({ user: { companyId: 'company-1' }, query: { period: '30' } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
  });
});
