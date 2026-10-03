jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/orderService', () => ({
  updateGuestOrderStatus: jest.fn(),
  updateOrderStatus: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const orderRoutes = require('../../routes/orders');

// استخراج handler مسار /incomplete/:cartId/dismiss من مكدس الراوتر
const findLayer = (stack, method, regexSource) =>
  stack.find(
    (layer) =>
      layer.route &&
      layer.route.methods[method] &&
      layer.route.path.toString().includes(regexSource)
  );

describe('POST /orders-new/incomplete/:cartId/dismiss', () => {
  const layer = findLayer(orderRoutes.stack, 'post', 'dismiss');
  const handler = layer?.route?.stack?.[layer.route.stack.length - 1]?.handle;

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects dismissal without a reason with 400', async () => {
    expect(handler).toBeDefined();

    const res = createResponse();
    await handler(
      {
        params: { cartId: 'cart-1' },
        user: { id: 'user-1', companyId: 'company-1' },
        body: { reason: '   ' }
      },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
  });

  test('records the mandatory reason and returns success for an existing cart', async () => {
    const prismaMock = {
      guestCart: { findFirst: jest.fn().mockResolvedValue({ id: 'row-1' }) },
      cartContactLog: { create: jest.fn().mockResolvedValue({ id: 'log-1', cartId: 'cart-1' }) }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await handler(
      {
        params: { cartId: 'cart-1' },
        user: { id: 'user-1', companyId: 'company-1', email: 'a@b.c' },
        body: { reason: 'العميل أعاد الطلب من الموقع' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prismaMock.cartContactLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cartId: 'cart-1',
          companyId: 'company-1',
          method: 'dismissed',
          note: 'العميل أعاد الطلب من الموقع'
        })
      })
    );
  });

  test('returns 404 for a cart of another company (tenant isolation)', async () => {
    const prismaMock = {
      guestCart: { findFirst: jest.fn().mockResolvedValue(null) },
      cartContactLog: { create: jest.fn() }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await handler(
      {
        params: { cartId: 'foreign-cart' },
        user: { id: 'user-1', companyId: 'company-1' },
        body: { reason: 'test' }
      },
      res
    );

    expect(res.statusCode).toBe(404);
    expect(prismaMock.cartContactLog.create).not.toHaveBeenCalled();
  });
});
