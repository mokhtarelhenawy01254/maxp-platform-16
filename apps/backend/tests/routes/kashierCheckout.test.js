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
  coupon: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  couponUsage: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
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

jest.mock('../../controller/shippingZoneController', () => ({
  resolvePublicShippingQuote: jest.fn(),
}));

const { resolvePublicShippingQuote } = require('../../controller/shippingZoneController');
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

    // DB is the price source of truth — honest client sends matching numbers
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'prod-1',
      name: 'Swan Sneaker',
      price: 500,
    });
    resolvePublicShippingQuote.mockResolvedValue({ price: 50, zone: { id: 'zone-1' } });

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

  test('ignores client-sent prices/totals — server recomputes from DB (price tampering)', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', phone: '01012345678' });
    // DB price is 500 — attacker sends price 1 and total 1
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Swan Sneaker', price: 500 });
    resolvePublicShippingQuote.mockResolvedValue({ price: 50, zone: { id: 'zone-1' } });
    KashierService.createPaymentSession.mockResolvedValue({
      success: true, sessionId: 's1', sessionUrl: 'https://payments.kashier.io/s1', mode: 'live',
    });
    mockPrisma.order.create.mockResolvedValue({ id: 'o1', orderNumber: 'ORD-TEST-12345', total: 550 });
    mockPrisma.product.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/payment/kashier/checkout')
      .send({
        guestName: 'Hacker',
        guestPhone: '01099999999',
        shippingAddress: { address: 'X', city: 'Cairo', governorate: 'Cairo' },
        items: [{ productId: 'prod-1', name: 'Swan Sneaker', price: 1, quantity: 1 }],
        subtotal: 1,
        shippingCost: 0,
        total: 1,
      });

    expect(res.status).toBe(200);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 500,
          shipping: 50,
          discount: 0,
          total: 550,
        }),
      })
    );
    // Kashier session must be created for the SERVER total, not the client's
    expect(KashierService.createPaymentSession).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 550 }),
      expect.any(String)
    );
  });

  test('applies a valid percentage coupon server-side and records its usage', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', phone: '01012345678' });
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Swan Sneaker', price: 500 });
    resolvePublicShippingQuote.mockResolvedValue({ price: 50, zone: { id: 'zone-1' } });
    mockPrisma.coupon.findFirst.mockResolvedValue({
      id: 'coupon-1', code: 'SAVE10', companyId: 'cmleybpf70028juo2wwpmp8rt',
      type: 'PERCENTAGE', value: 10, maxDiscountAmount: 50,
      usageLimit: 100, usageCount: 5, minOrderAmount: null,
    });
    mockPrisma.$transaction.mockResolvedValue([]);
    KashierService.createPaymentSession.mockResolvedValue({
      success: true, sessionId: 's2', sessionUrl: 'https://payments.kashier.io/s2', mode: 'live',
    });
    mockPrisma.order.create.mockResolvedValue({ id: 'o2', orderNumber: 'ORD-TEST-12345', total: 500 });
    mockPrisma.product.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/payment/kashier/checkout')
      .send({
        guestName: 'Sara',
        guestPhone: '01012345678',
        shippingAddress: { address: 'X', city: 'Cairo', governorate: 'Cairo' },
        items: [{ productId: 'prod-1', price: 500, quantity: 1 }],
        couponCode: 'save10',
      });

    expect(res.status).toBe(200);
    // 500 - 50 (10% capped at 50) + 50 shipping = 500
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: 500, discount: 50, total: 500 }),
      })
    );
    expect(mockPrisma.couponUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ couponId: 'coupon-1', discountAmount: 50, orderId: 'o2' }),
    });
    expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
      where: { id: 'coupon-1' },
      data: { usageCount: { increment: 1 } },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test('FREE_SHIPPING coupon zeroes the shipping cost', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', phone: '01012345678' });
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Swan Sneaker', price: 500 });
    resolvePublicShippingQuote.mockResolvedValue({ price: 50, zone: { id: 'zone-1' } });
    mockPrisma.coupon.findFirst.mockResolvedValue({
      id: 'coupon-2', code: 'FREESHIP', type: 'FREE_SHIPPING', value: 0,
      usageLimit: null, usageCount: 0, minOrderAmount: null,
    });
    mockPrisma.$transaction.mockResolvedValue([]);
    KashierService.createPaymentSession.mockResolvedValue({
      success: true, sessionId: 's3', sessionUrl: 'https://payments.kashier.io/s3', mode: 'live',
    });
    mockPrisma.order.create.mockResolvedValue({ id: 'o3', orderNumber: 'ORD-TEST-12345', total: 500 });
    mockPrisma.product.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/payment/kashier/checkout')
      .send({
        guestName: 'Sara',
        guestPhone: '01012345678',
        shippingAddress: { address: 'X', city: 'Cairo', governorate: 'Cairo' },
        items: [{ productId: 'prod-1', price: 500, quantity: 1 }],
        couponCode: 'FREESHIP',
      });

    expect(res.status).toBe(200);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: 500, shipping: 0, discount: 0, total: 500 }),
      })
    );
  });

  test('ignores unknown coupon codes without recording usage', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', phone: '01012345678' });
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Swan Sneaker', price: 500 });
    resolvePublicShippingQuote.mockResolvedValue({ price: 50, zone: { id: 'zone-1' } });
    mockPrisma.coupon.findFirst.mockResolvedValue(null);
    KashierService.createPaymentSession.mockResolvedValue({
      success: true, sessionId: 's4', sessionUrl: 'https://payments.kashier.io/s4', mode: 'live',
    });
    mockPrisma.order.create.mockResolvedValue({ id: 'o4', orderNumber: 'ORD-TEST-12345', total: 550 });
    mockPrisma.product.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/payment/kashier/checkout')
      .send({
        guestName: 'Sara',
        guestPhone: '01012345678',
        shippingAddress: { address: 'X', city: 'Cairo', governorate: 'Cairo' },
        items: [{ productId: 'prod-1', price: 500, quantity: 1 }],
        couponCode: 'FAKE-CODE',
      });

    expect(res.status).toBe(200);
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ discount: 0, total: 550 }) })
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejects requests where no item has a valid product', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', phone: '01012345678' });
    mockPrisma.product.findFirst.mockResolvedValue(null); // unknown product id

    const res = await request(app)
      .post('/api/v1/payment/kashier/checkout')
      .send({
        guestName: 'Ghost',
        guestPhone: '01088888888',
        shippingAddress: { address: 'X', city: 'Cairo', governorate: 'Cairo' },
        items: [{ productId: 'nonexistent', price: 1, quantity: 1 }],
        total: 1,
      });

    expect(res.status).toBe(400);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(KashierService.createPaymentSession).not.toHaveBeenCalled();
  });

  test('handles Kashier payment session failure with 502', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: 'cust-1',
      phone: '01012345678',
    });
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Item', price: 100 });
    resolvePublicShippingQuote.mockResolvedValue({ price: 0, zone: null });

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
