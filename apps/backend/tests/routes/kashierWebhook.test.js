const express = require('express');
const request = require('supertest');

const mockPrisma = {
  order: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  guestOrder: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  orderNote: {
    create: jest.fn(),
  },
  companyWallet: {
    upsert: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../services/kashierService', () => ({
  createPaymentSession: jest.fn(),
  getSessionStatus: jest.fn(),
}));

jest.mock('../../services/pendingBillingService', () => ({
  processPendingUsageCharges: jest.fn().mockResolvedValue({ processed: 0, released: [] }),
}));

const kashierRoutes = require('../../routes/kashierRoutes');

describe('Kashier Webhook Route', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/payment', kashierRoutes);
  });

  test('successfully processes Kashier V3 delivery payload for order ORD-469791-416', async () => {
    const existingOrder = {
      id: 'order-uuid-1',
      orderNumber: 'ORD-469791-416',
      total: 2373,
      currency: 'EGP',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CREDIT_CARD',
      metadata: JSON.stringify({ kashierSessionId: 'sess-1' }),
    };

    mockPrisma.order.findFirst.mockResolvedValue(existingOrder);
    mockPrisma.order.update.mockResolvedValue({ ...existingOrder, status: 'PENDING', paymentStatus: 'COMPLETED' });
    mockPrisma.orderNote.create.mockResolvedValue({ id: 'note-1' });

    // Kashier dashboard export payload structure
    const kashierPayload = {
      id: "6aa362c875c3666a645d1c0e",
      notificationKey: "TX-4643658418::https://maxp.online/api/v1/payment/kashier/webhook::pay::serverWebhook",
      eventId: "5a5b461d-885b-48fa-94b4-c493931c239f",
      attempts: 3,
      eventType: "pay",
      merchantId: "MID-46436-584",
      mode: "live",
      payload: {
        platform: "kashier",
        event: "pay",
        data: {
          merchantOrderId: "ORD-469791-416",
          kashierOrderId: "0ae5a70a-2b56-4e74-b951-fb89f31e0117",
          orderReference: "ORD-35107558",
          transactionId: "TX-4643658418",
          status: "SUCCESS",
          method: "wallet",
          creationDate: "2026-09-11T02:09:12.530Z",
          amount: 2373,
          settlementInfo: {
            vat: "6.09",
            sellingRate: 1.75,
            sellingFlat: 2,
            totalSellingRate: "41.53",
            totalSellingFees: "43.53",
            settledAmount: "2323.38"
          },
          currency: "EGP",
          sourceOfFunds: {
            type: "Wallet",
            walletInfo: {
              payerAccount: "01000578851"
            }
          },
          transactionResponseCode: "00",
          transactionResponseMessage: {
            ar: "تمت الموافقة",
            en: "Approved"
          }
        }
      },
      resourceId: "TX-4643658418",
      resourceType: "transaction"
    };

    const res = await request(app)
      .post('/api/v1/payment/kashier/webhook')
      .send(kashierPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentStatus).toBe('COMPLETED');
    expect(res.body.data.paymentMethod).toBe('WALLET');
    expect(res.body.data.transactionId).toBe('TX-4643658418');

    // Verify order update
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-uuid-1' },
        data: expect.objectContaining({
          paymentStatus: 'COMPLETED',
          paymentMethod: 'WALLET',
          status: 'PENDING',
        }),
      })
    );

    // Verify metadata saved kashierPayment
    const updateCall = mockPrisma.order.update.mock.calls[0][0];
    const parsedMeta = JSON.parse(updateCall.data.metadata);
    expect(parsedMeta.kashierPayment).toBeDefined();
    expect(parsedMeta.kashierPayment.transactionId).toBe('TX-4643658418');
    expect(parsedMeta.kashierPayment.payerAccount).toBe('01000578851');
    expect(parsedMeta.kashierPayment.settledAmount).toBe('2323.38');

    // Verify order note was created
    expect(mockPrisma.orderNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-uuid-1',
          content: expect.stringContaining('TX-4643658418'),
        }),
      })
    );
  });

  test('successfully processes direct webhook payload format', async () => {
    const existingOrder = {
      id: 'order-uuid-2',
      orderNumber: 'ORD-999',
      total: 500,
      currency: 'EGP',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CREDIT_CARD',
      metadata: '{}',
    };

    mockPrisma.order.findFirst.mockResolvedValue(existingOrder);
    mockPrisma.order.update.mockResolvedValue({ ...existingOrder, status: 'CONFIRMED', paymentStatus: 'COMPLETED' });

    const directPayload = {
      platform: "kashier",
      event: "pay",
      data: {
        merchantOrderId: "ORD-999",
        transactionId: "TX-9999",
        status: "SUCCESS",
        method: "card",
        amount: 500,
      }
    };

    const res = await request(app)
      .post('/api/v1/payment/kashier/webhook')
      .send(directPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentStatus).toBe('COMPLETED');
    expect(res.body.data.paymentMethod).toBe('CREDIT_CARD');
  });

  test('rejects empty or unrecognizable payload with 400', async () => {
    const res = await request(app)
      .post('/api/v1/payment/kashier/webhook')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid webhook payload');
  });

  test('successfully processes wallet recharge when companyId is in metaData', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
    mockPrisma.companyWallet.upsert.mockResolvedValue({
      id: 'wallet-1',
      companyId: 'comp-1234567890',
      balance: 1000,
      currency: 'EGP',
    });
    mockPrisma.transaction.create.mockResolvedValue({
      id: 'tx-1',
      walletId: 'wallet-1',
      amount: 1000,
      type: 'DEPOSIT',
      status: 'COMPLETED',
    });

    const walletPayload = {
      platform: 'kashier',
      event: 'pay',
      data: {
        merchantOrderId: 'WLT-1789328383409',
        kashierOrderId: 'sess-uuid-1',
        transactionId: 'TX-4643658423',
        status: 'SUCCESS',
        method: 'card',
        amount: 1000,
        metaData: {
          orderId: 'WLT-1789328383409',
          companyId: 'comp-1234567890',
          type: 'WALLET_RECHARGE',
        },
      },
    };

    const res = await request(app)
      .post('/api/v1/payment/kashier/webhook')
      .send(walletPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.companyWallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'comp-1234567890' },
        update: expect.objectContaining({
          balance: { increment: 1000 },
        }),
      })
    );
  });

  test('successfully processes wallet recharge with WLT-<companyId>-<timestamp> format', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
    mockPrisma.companyWallet.upsert.mockResolvedValue({
      id: 'wallet-2',
      companyId: 'cmrdj4prh01ftjutbgffhu4dr',
      balance: 500,
      currency: 'EGP',
    });
    mockPrisma.transaction.create.mockResolvedValue({
      id: 'tx-2',
      walletId: 'wallet-2',
      amount: 500,
      type: 'DEPOSIT',
      status: 'COMPLETED',
    });

    const walletPayload = {
      platform: 'kashier',
      event: 'pay',
      data: {
        merchantOrderId: 'WLT-cmrdj4prh01ftjutbgffhu4dr-1789328383409',
        transactionId: 'TX-998877',
        status: 'SUCCESS',
        method: 'card',
        amount: 500,
      },
    };

    const res = await request(app)
      .post('/api/v1/payment/kashier/webhook')
      .send(walletPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.companyWallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'cmrdj4prh01ftjutbgffhu4dr' },
        update: expect.objectContaining({
          balance: { increment: 500 },
        }),
      })
    );
  });

  test('skips duplicate wallet recharge when already completed', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue({
      id: 'tx-existing',
      status: 'COMPLETED',
      referenceId: 'TX-DUP-123',
    });

    const walletPayload = {
      platform: 'kashier',
      event: 'pay',
      data: {
        merchantOrderId: 'WLT-cmrdj4prh01ftjutbgffhu4dr-1789328383409',
        transactionId: 'TX-DUP-123',
        status: 'SUCCESS',
        method: 'card',
        amount: 500,
      },
    };

    const res = await request(app)
      .post('/api/v1/payment/kashier/webhook')
      .send(walletPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Deposit already processed');
    expect(mockPrisma.companyWallet.upsert).not.toHaveBeenCalled();
  });
});
