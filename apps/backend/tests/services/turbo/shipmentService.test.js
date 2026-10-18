jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../../../utils/turbo/errorHandler', () => ({
  handleError: jest.fn((error) => { throw error; }),
  getTurboErrorMessage: jest.fn(
    (error) => error?.response?.data?.error_msg || error?.message || ''
  ),
  isShipmentNotFoundError: jest.fn(
    (msg) => /shipments? not found/i.test(String(msg || ''))
  ),
}));

const axios = require('axios');
const ShipmentService = require('../../../services/turbo/shipmentService');

function createMockClient(overrides = {}) {
  return {
    getApiKey: jest.fn().mockResolvedValue('test-api-key'),
    getHeaders: jest.fn().mockResolvedValue({ Accept: 'application/json', 'Content-Type': 'application/json' }),
    getMainClientCode: jest.fn().mockResolvedValue('37321'),
    getSenderNumber: jest.fn().mockResolvedValue('01000000000'),
    baseUrl: 'https://backoffice.turbo-eg.com/external-api',
    timeout: 30000,
    get: jest.fn().mockResolvedValue({ data: { success: 0 } }), // governments returns empty by default
    post: jest.fn(),
    ...overrides,
  };
}

function validOrderData(overrides = {}) {
  return {
    orderId: 'ord-1',
    orderNumber: 'ORD-839842',
    customerName: 'محمد علي',
    customerPhone: '01012345678',
    shippingAddress: JSON.stringify({ address: '5 شارع التحرير', city: 'القاهرة', governorate: 'القاهرة' }),
    city: 'القاهرة',
    governorate: 'القاهرة',
    items: [{ productName: 'قميص', quantity: 2, weight: 0.5 }],
    totalWeight: 1,
    totalValue: 350,
    shipping: 30,
    paymentMethod: 'CASH',
    notes: 'يرجى التأكيد قبل التسليم',
    ...overrides,
  };
}

describe('ShipmentService', () => {
  let client, service;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createMockClient();
    service = new ShipmentService(client);
  });

  describe('createShipment', () => {
    test('returns success with shipmentId when API call succeeds', async () => {
      axios.post.mockResolvedValue({
        data: {
          success: 1,
          result: { code: 'TURBO-001', bar_code: 'BAR-001', expected_branch: 'Cairo HQ' },
        },
      });

      const result = await service.createShipment(validOrderData());

      expect(result.success).toBe(true);
      expect(result.shipmentId).toBe('TURBO-001');
      expect(result.trackingNumber).toBe('BAR-001');
      expect(result.status).toBe('turbo_sent');
    });

    test('sends correct payload to /add-order', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, result: { code: 'T1', bar_code: 'B1' } },
      });

      await service.createShipment(validOrderData());

      expect(axios.post).toHaveBeenCalledWith(
        'https://backoffice.turbo-eg.com/external-api/add-order',
        expect.objectContaining({
          authentication_key: 'test-api-key',
          main_client_code: '37321',
          receiver: 'محمد علي',
          phone1: '01012345678',
          government: 'القاهرة',
        }),
        expect.any(Object)
      );
    });

    test('normalizes 10-digit phone missing leading zero', async () => {
      // '1012345678' (10 digits starting with 1) → '01012345678'
      axios.post.mockResolvedValue({
        data: { success: 1, result: { code: 'T1', bar_code: 'B1' } },
      });

      await service.createShipment(validOrderData({ customerPhone: '1012345678' }));

      const callPayload = axios.post.mock.calls[0][1];
      expect(callPayload.phone1).toBe('01012345678');
    });

    test('normalizes phone with country code 20 prefix (bug fix: else if → if)', async () => {
      // '201012345678' → slice '20' → '1012345678' → add '0' → '01012345678'
      axios.post.mockResolvedValue({
        data: { success: 1, result: { code: 'T1', bar_code: 'B1' } },
      });

      await service.createShipment(validOrderData({ customerPhone: '201012345678' }));

      const callPayload = axios.post.mock.calls[0][1];
      expect(callPayload.phone1).toBe('01012345678');
    });

    test('normalizes phone missing leading zero', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, result: { code: 'T1', bar_code: 'B1' } },
      });

      await service.createShipment(validOrderData({ customerPhone: '1012345678' }));

      const callPayload = axios.post.mock.calls[0][1];
      expect(callPayload.phone1).toBe('01012345678');
    });

    test('normalizes phone with double-zero international prefix 0020', async () => {
      // '00201012345678' → strip '00' → '201012345678' → slice '20' → '1012345678' → add '0' → '01012345678'
      axios.post.mockResolvedValue({
        data: { success: 1, result: { code: 'T1', bar_code: 'B1' } },
      });

      await service.createShipment(validOrderData({ customerPhone: '00201012345678' }));

      const callPayload = axios.post.mock.calls[0][1];
      expect(callPayload.phone1).toBe('01012345678');
    });

    test('throws for invalid phone number', async () => {
      await expect(
        service.createShipment(validOrderData({ customerPhone: '12345' }))
      ).rejects.toThrow(/هاتف/);
    });

    test('throws when governorate cannot be resolved', async () => {
      await expect(
        service.createShipment(validOrderData({ governorate: '', city: '' }))
      ).rejects.toThrow(/محافظة/);
    });

    test('sets amount_to_be_collected to 0 for PAID payment', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, result: { code: 'T1', bar_code: 'B1' } },
      });

      await service.createShipment(validOrderData({ paymentMethod: 'PAID', totalValue: 500 }));

      const payload = axios.post.mock.calls[0][1];
      expect(payload.amount_to_be_collected).toBe(0);
    });

    test('sets is_order=2 and amount=0 for RETURN order type', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, result: { code: 'T1', bar_code: 'B1' } },
      });

      await service.createShipment(validOrderData({ orderType: 'RETURN', totalValue: 300 }));

      const payload = axios.post.mock.calls[0][1];
      expect(payload.is_order).toBe(2);
      expect(payload.amount_to_be_collected).toBe(0);
    });

    test('throws on Turbo API error response', async () => {
      axios.post.mockResolvedValue({
        data: { success: 0, error_msg: 'رقم الهاتف مكرر' },
      });

      await expect(service.createShipment(validOrderData())).rejects.toThrow('رقم الهاتف مكرر');
    });

    test('throws when response missing result field', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, result: null },
      });

      await expect(service.createShipment(validOrderData())).rejects.toThrow(/missing success or result/);
    });
  });

  describe('cancelShipment', () => {
    test('succeeds on first search key', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, message: 'تم الإلغاء بنجاح' },
      });

      const result = await service.cancelShipment('TURBO-001');

      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('retries with next key when first returns not found', async () => {
      axios.post
        .mockResolvedValueOnce({
          data: { success: 0, error_msg: 'Shipments not found' },
        })
        .mockResolvedValueOnce({
          data: { success: 1, message: 'Cancelled' },
        });

      const result = await service.cancelShipment(['KEY-1', 'KEY-2']);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    test('marks as cancelled locally when all keys return not found', async () => {
      axios.post.mockResolvedValue({
        data: { success: 0, error_msg: 'Shipments not found' },
      });

      const result = await service.cancelShipment(['KEY-1', 'KEY-2']);

      expect(result.success).toBe(true);
      expect(result.data.resolvedLocally).toBe(true);
      expect(result.data.providerStatus).toBe('not_found');
    });

    test('throws for non-not-found API error', async () => {
      axios.post.mockResolvedValue({
        data: { success: 0, error_msg: 'Authentication failed' },
      });

      await expect(service.cancelShipment('TURBO-001')).rejects.toThrow('Authentication failed');
    });

    test('calls delete-order with correct payload', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1, message: 'OK' },
      });

      await service.cancelShipment('TRK-123');

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/delete-order'),
        expect.objectContaining({
          authentication_key: 'test-api-key',
          main_client_code: '37321',
          search_key: 'TRK-123',
        }),
        expect.any(Object)
      );
    });
  });

  describe('updateShipment', () => {
    test('posts to /edit-order and returns success', async () => {
      axios.post.mockResolvedValue({
        data: { success: 1 },
      });

      const result = await service.updateShipment('TURBO-001', validOrderData());

      expect(result.success).toBe(true);
      expect(result.shipmentId).toBe('TURBO-001');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/edit-order'),
        expect.objectContaining({
          code: 'TURBO-001',
          authentication_key: 'test-api-key',
        }),
        expect.any(Object)
      );
    });

    test('throws on Turbo API error', async () => {
      axios.post.mockResolvedValue({
        data: { success: 0, error_msg: 'Order not found' },
      });

      await expect(service.updateShipment('T1', validOrderData())).rejects.toThrow('Order not found');
    });
  });

  describe('calculateShippingCost', () => {
    test('returns cost on first successful endpoint', async () => {
      axios.post.mockResolvedValueOnce({
        data: { cost: 45, currency: 'EGP', estimated_delivery: '2026-07-26' },
      });

      const result = await service.calculateShippingCost(
        { city: 'القاهرة', governorate: 'القاهرة', address: '5 شارع التحرير' },
        1.5
      );

      expect(result.success).toBe(true);
      expect(result.cost).toBe(45);
      expect(result.currency).toBe('EGP');
      expect(result.estimatedDelivery).toBe('2026-07-26');
    });

    test('falls back to GET with query params on 405', async () => {
      const err405 = new Error('Method Not Allowed');
      err405.response = { status: 405 };
      axios.post.mockRejectedValueOnce(err405);
      axios.get.mockResolvedValueOnce({ data: { cost: 50, currency: 'EGP' } });

      const result = await service.calculateShippingCost(
        { city: 'الجيزة', governorate: 'الجيزة', address: 'شارع الهرم' },
        2
      );

      expect(result.success).toBe(true);
      expect(result.cost).toBe(50);
    });

    test('returns graceful failure when all endpoints return 404', async () => {
      const err404 = new Error('Not Found');
      err404.response = { status: 404 };
      axios.post.mockRejectedValue(err404);

      const result = await service.calculateShippingCost(
        { city: 'القاهرة', governorate: 'القاهرة', address: 'شارع' },
        1
      );

      expect(result.success).toBe(false);
      expect(result.cost).toBeNull();
      expect(result.currency).toBe('EGP');
    });

    test('includes dimensions in GET query params when provided', async () => {
      const err405 = new Error('Method Not Allowed');
      err405.response = { status: 405 };
      axios.post.mockRejectedValueOnce(err405);
      axios.get.mockResolvedValueOnce({ data: { cost: 60, currency: 'EGP' } });

      await service.calculateShippingCost(
        { city: 'القاهرة', governorate: 'القاهرة', address: '5 شارع' },
        2,
        { length: 30, width: 20, height: 10 }
      );

      const getUrl = axios.get.mock.calls[0][0];
      expect(getUrl).toContain('length=30');
      expect(getUrl).toContain('width=20');
      expect(getUrl).toContain('height=10');
    });
  });
});
