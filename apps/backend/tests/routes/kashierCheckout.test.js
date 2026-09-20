const express = require('express');
const request = require('supertest');

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  guestCart: {
    delete: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  productVariant: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  orderNote: {
    create: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
}));

jest.mock('../../services/orderService', () => ({
  generateOrderNumber: jest.fn().mockResolvedValue('ORD-TEST-12345'),
}));

jest.mock('../../services/kashierService', () => ({
  createPaymentSession: jest.fn(),
}));

const KashierService = require('../../services/kashierService');
const kashierRoutes = require('../../routes/kashierRoutes');

describe('POST /api/v1/payment/kashier/checkout', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({
      id: 'cmleybpf70028juo2wwpmp8rt',
      name: 'Swan Store',
      slug: 'swan',
      isActive: true,
    });
    app = express();
    app.use(express.json());
    // Attach mock company to request to simulate subdomainMiddleware
    app.use((req, res, next) => {
      req.company = {
        id: 'cmleybpf70028juo2wwpmp8rt',
        name: 'Swan Store',
        slug: 'swan',
        isActive: true,
      };
      next();
    });
    app.use('/api/v1/payment', kashierRoutes);
  });

  test('validates required fields (phone, name, address)', async () => {
    const res = await request(app)
      .post('/api/v1/payment/kashier/checkout')
      .send({ guestName: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('creates order with orderSource: REGULAR and returns Kashier sessionUrl', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: 'cust-1',
      phone: '01012345678',
    });

    KashierService.createPaymentSession.mockResolvedValue({
      success: true,
      sessionId: 'sess-kashier-abc',
      sessionUrl: 'https://payments.kashier.io/v3/pay/sess-kashier-abc',
      mode: 'live',
    });

    mockPrisma.order.create.mockResolvedValue({
      id: 'order-uuid-1',
      orderNumber: 'ORD-TEST-12345',
      total: 550,
    });
    mockPrisma.product.update.mockResolvedValue({});
    mockPrisma.guestCart.delete.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/payment/kashier/checkout')
      .set('Origin', 'https://swan.maxp.online')
      .send({
        guestName: 'Sara Ahmed',
        guestEmail: 'sara@example.com',
        guestPhone: '01012345678',
        shippingAddress: {
          address: 'Nasr City',
          city: 'Cairo',
          governorate: 'Cairo',
        },
        items: [
          { productId: 'prod-1', name: 'Swan Sneaker', price: 500, quantity: 1 },
        ],
        subtotal: 500,
        shippingCost: 50,
        total: 550,
        cartId: 'cart-guest-123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionUrl).toBe('https://payments.kashier.io/v3/pay/sess-kashier-abc');
    expect(res.body.data.orderNumber).toBe('ORD-TEST-12345');

    // Verify order was created with valid orderSource: 'REGULAR'
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderNumber: 'ORD-TEST-12345',
          orderSource: 'REGULAR',
          paymentMethod: 'CREDIT_CARD',
          paymentStatus: 'PENDING',
          total: 550,
        }),
      })
    );

    // Verify redirectUrl uses the store origin
    expect(KashierService.createPaymentSession).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: expect.stringContaining('https://swan.maxp.online/thank-you?orderId=ORD-TEST-12345'),
      }),
      'cmleybpf70028juo2wwpmp8rt'
    );

    // Verify cart was deleted
    expect(mockPrisma.guestCart.delete).toHaveBeenCalledWith({
      where: { cartId: 'cart-guest-123' },
    });
  });

  test('handles Kashier payment session failure with 502', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: 'cust-1',
      phone: '01012345678',
    });

    KashierService.createPaymentSession.mockResolvedValue({
      success: false,
      error: 'Invalid merchant credentials',
    });

    const res = await request(app)
      .post('/api/v1/payment/kashier/checkout')
      .send({
        guestName: 'Sara Ahmed',
        guestPhone: '01012345678',
        shippingAddress: { address: 'Alexandria', city: 'Alex', governorate: 'Alex' },
        items: [{ productId: 'prod-1', price: 100, quantity: 1 }],
      });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });
});
