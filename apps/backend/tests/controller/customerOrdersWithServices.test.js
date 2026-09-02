jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getCustomerOrders } = require('../../controller/customerController');

describe('customerController - getCustomerOrders with ServiceOrders', () => {
  let prismaMock;
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { companyId: 'comp-1' },
      params: { customerId: 'cust-1' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    prismaMock = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cust-1',
          companyId: 'comp-1',
          phone: '01012345678',
          phoneNormalized: '+201012345678'
        })
      },
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ord-1',
            orderNumber: 'ORD-1001',
            status: 'COMPLETED',
            total: 250,
            createdAt: new Date('2026-09-01T10:00:00Z'),
            orderItems: [
              {
                quantity: 1,
                price: 250,
                product: { id: 'p-1', name: 'تيشيرت قطني', images: '["https://example.com/tshirt.png"]' }
              }
            ]
          }
        ])
      },
      serviceOrder: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'srv-1',
            companyId: 'comp-1',
            customerName: 'محمود',
            phone: '01012345678',
            description: 'تصميم بوست انستقرام',
            status: 'IN_PROGRESS',
            createdAt: new Date('2026-09-02T12:00:00Z'),
            service: {
              id: 's-1',
              name: 'تصميم جرافيك',
              category: 'image',
              price: 150,
              icon: '🎨'
            }
          }
        ])
      }
    };

    getSharedPrismaClient.mockReturnValue(prismaMock);
  });

  it('merges product orders and service orders into unified data list sorted by createdAt', async () => {
    await getCustomerOrders(req, res);

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];

    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveLength(2);

    // The newer service order (2026-09-02) should come first
    expect(responseData.data[0].id).toBe('srv-1');
    expect(responseData.data[0].type).toBe('SERVICE');
    expect(responseData.data[0].serviceName).toBe('تصميم جرافيك');
    expect(responseData.data[0].total).toBe(150);
    expect(responseData.data[0].status).toBe('in_progress');

    // The older product order (2026-09-01) should come second
    expect(responseData.data[1].id).toBe('ord-1');
    expect(responseData.data[1].orderNumber).toBe('ORD-1001');

    // Check counts
    expect(responseData.serviceOrdersCount).toBe(1);
    expect(responseData.productOrdersCount).toBe(1);
  });

  it('rejects if companyId is missing from req.user', async () => {
    req.user = null;
    await getCustomerOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
